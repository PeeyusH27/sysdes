import { test, expect } from 'vitest';
import { Cluster } from './quorum-store.js';

const names = ['a', 'b', 'c', 'd', 'e'];
const prefOf = (c, key) => c.ring.preferenceList(key, 3);

test('N=3, W=2, R=2: a write survives one dead replica and the read still sees it', () => {
  const c = new Cluster(names);
  const [p0, p1, p2] = prefOf(c, 'k');
  c.down(p2);
  expect(c.put('k', 'v1')).toEqual({ ok: true, acks: 2 });
  expect(c.get('k')).toMatchObject({ ok: true, versions: ['v1'] });
  expect(p0 && p1).toBeTruthy();
});

test('with two of three replicas down, W=2 cannot be met and the write is refused', () => {
  const c = new Cluster(names);
  const [, p1, p2] = prefOf(c, 'k');
  c.down(p1); c.down(p2);
  expect(c.put('k', 'v1')).toEqual({ ok: false, acks: 1 });
});

test('W=1, R=1 can read stale data; W=2, R=2 cannot (the sets must overlap)', () => {
  const weak = new Cluster(names, { w: 1, r: 1 });
  const [a, b] = prefOf(weak, 'k');
  weak.put('k', 'v1', {}, { reach: [a] });                       // only one replica got it
  expect(weak.get('k', { from: [b] }).versions).toEqual([]);     // a read that lands elsewhere misses it

  const strong = new Cluster(names, { w: 2, r: 2 });
  const [x, y, z] = prefOf(strong, 'k');
  strong.put('k', 'v1', {}, { reach: [x, y] });
  expect(strong.get('k', { from: [y, z] }).versions).toEqual(['v1']);   // the read set shares y with the write set
});

test('read repair brings a stale replica up to date', () => {
  const c = new Cluster(names);
  const [x, y, z] = prefOf(c, 'k');
  c.put('k', 'v1', {}, { reach: [x, y] });
  expect(c.node.get(z).data.get('k')).toBeUndefined();
  c.get('k', { from: [y, z] });
  expect(c.node.get(z).data.get('k')[0].value).toBe('v1');
});

test('concurrent writes on two sides of a partition come back as siblings; writing with the context resolves them', () => {
  const c = new Cluster(names);
  const [x, y, z] = prefOf(c, 'cart');
  const base = c.get('cart');                                    // nothing yet: empty context
  c.put('cart', ['pen'], base.context ?? {}, { reach: [x], coordinator: x });
  c.put('cart', ['mug'], base.context ?? {}, { reach: [y], coordinator: y });
  const read = c.get('cart', { from: [x, y, z] });
  expect(read.versions.sort()).toEqual([['mug'], ['pen']]);
  c.put('cart', ['pen', 'mug'], read.context, { reach: [x, y, z] });
  expect(c.get('cart', { from: [x, y, z] }).versions).toEqual([['pen', 'mug']]);
});

test('hinted handoff: with a sloppy quorum the write succeeds even if replicas are down, and is delivered when they return', () => {
  const c = new Cluster(names, { sloppy: true });
  const [p0, p1, p2] = prefOf(c, 'k');
  c.down(p1); c.down(p2);
  expect(c.put('k', 'v1')).toMatchObject({ ok: true, acks: 3 });         // p0 plus two stand-ins holding hints
  expect(c.node.get(p1).data.get('k')).toBeUndefined();
  c.up(p1);
  expect(c.node.get(p1).data.get('k')[0].value).toBe('v1');              // the stand-in handed it over
  expect(p0).toBeTruthy();
});

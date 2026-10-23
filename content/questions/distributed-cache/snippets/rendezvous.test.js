import { test, expect } from 'vitest';
import { pick, pickAlive, rank } from './rendezvous.js';

const nodes = Array.from({ length: 12 }, (_, i) => `cache-${i}`);
const keys = Array.from({ length: 60_000 }, (_, i) => `user:${i}`);

test('load is spread evenly over 12 nodes', () => {
  const count = new Map();
  for (const k of keys) count.set(pick(nodes, k), (count.get(pick(nodes, k)) ?? 0) + 1);
  const mean = keys.length / nodes.length;
  for (const n of nodes) {
    expect(count.get(n)).toBeGreaterThan(mean * 0.9);
    expect(count.get(n)).toBeLessThan(mean * 1.1);
  }
});

test('losing a node moves only that node\'s keys (about 1/12), and they spread over the survivors', () => {
  const before = new Map(keys.map((k) => [k, pick(nodes, k)]));
  const survivors = nodes.filter((n) => n !== 'cache-3');
  let moved = 0;
  const landed = new Set();
  for (const k of keys) {
    const now = pick(survivors, k);
    if (now !== before.get(k)) { moved++; landed.add(now); expect(before.get(k)).toBe('cache-3'); }
  }
  expect(moved / keys.length).toBeGreaterThan(0.07);
  expect(moved / keys.length).toBeLessThan(0.1);
  expect(landed.size).toBe(11);                          // every survivor takes a share, none is overloaded
});

test('adding a 13th node takes about 1/13 of the keys, only onto the new node', () => {
  const before = new Map(keys.map((k) => [k, pick(nodes, k)]));
  const grown = [...nodes, 'cache-12'];
  let moved = 0;
  for (const k of keys) {
    const now = pick(grown, k);
    if (now !== before.get(k)) { moved++; expect(now).toBe('cache-12'); }
  }
  expect(moved / keys.length).toBeGreaterThan(0.06);
  expect(moved / keys.length).toBeLessThan(0.1);
  expect(1 / 13).toBeCloseTo(0.0769, 3);
});

test('failover: a key whose primary is down goes to its second choice, and comes back when it recovers', () => {
  const key = 'user:42';
  const [first, second] = rank(nodes, key);
  expect(pickAlive(nodes, key, (n) => n === first)).toBe(second);
  expect(pickAlive(nodes, key, () => false)).toBe(first);
});

test('plain hash mod N, by contrast, moves almost everything when a node is lost', () => {
  const h = (s) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  let moved = 0;
  for (const k of keys) if (h(k) % 12 !== h(k) % 11) moved++;
  expect(moved / keys.length).toBeGreaterThan(0.85);
});

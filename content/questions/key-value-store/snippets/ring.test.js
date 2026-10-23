import { test, expect } from 'vitest';
import { Ring, hash32 } from './ring.js';

const nodes = Array.from({ length: 50 }, (_, i) => `node-${i}`);
const keys = Array.from({ length: 100_000 }, (_, i) => `key${i}`);
const spread = (ring) => {
  const count = new Map();
  for (const k of keys) count.set(ring.owner(k), (count.get(ring.owner(k)) ?? 0) + 1);
  const mean = keys.length / nodes.length;
  const vals = [...count.values()];
  return { maxOverMean: Math.max(...vals) / mean, minOverMean: Math.min(...nodes.map((n) => count.get(n) ?? 0)) / mean };
};

test('one point per node is badly uneven; 128 virtual nodes each is close to even', () => {
  expect(spread(new Ring(nodes, 1)).maxOverMean).toBeGreaterThan(3);      // some node owns 3x its share
  const even = spread(new Ring(nodes, 128));
  expect(even.maxOverMean).toBeLessThan(1.4);
  expect(even.minOverMean).toBeGreaterThan(0.65);
});

test('adding the 51st node moves about 1/51 (2%) of the keys, and only onto the new node', () => {
  const ring = new Ring(nodes, 128);
  const before = new Map(keys.map((k) => [k, ring.owner(k)]));
  ring.add('node-new');
  let moved = 0;
  for (const k of keys) {
    if (ring.owner(k) !== before.get(k)) {
      moved++;
      expect(ring.owner(k)).toBe('node-new');            // a join never shuffles data between old nodes
    }
  }
  expect(moved / keys.length).toBeGreaterThan(0.01);
  expect(moved / keys.length).toBeLessThan(0.035);
  expect(1 / 51).toBeCloseTo(0.0196, 3);
});

test('a hash mod N scheme, by contrast, moves almost everything when N changes', () => {
  let moved = 0;
  for (const k of keys) if (hash32(k) % 50 !== hash32(k) % 51) moved++;
  expect(moved / keys.length).toBeGreaterThan(0.9);
});

test('the preference list has distinct physical nodes, starting with the owner', () => {
  const ring = new Ring(nodes, 128);
  for (const k of keys.slice(0, 500)) {
    const list = ring.preferenceList(k, 3);
    expect(new Set(list).size).toBe(3);
    expect(list[0]).toBe(ring.owner(k));
  }
});

test('removing a node hands its keys to the next nodes on the ring, not to everyone', () => {
  const ring = new Ring(nodes, 128);
  const victim = 'node-7';
  const lists = new Map(keys.slice(0, 5000).map((k) => [k, ring.preferenceList(k, 3)]));
  ring.remove(victim);
  for (const [k, old] of lists) {
    const now = ring.preferenceList(k, 3);
    // the survivors of the old list are still replicas
    for (const n of old.filter((x) => x !== victim)) expect(now).toContain(n);
  }
});

test('a ring smaller than the replica count returns what it has', () => {
  expect(new Ring(['a', 'b'], 8).preferenceList('k', 3)).toHaveLength(2);
});

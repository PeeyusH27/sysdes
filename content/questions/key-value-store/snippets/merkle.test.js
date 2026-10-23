import { test, expect } from 'vitest';
import { buildTree, diff } from './merkle.js';

const entries = Array.from({ length: 10_000 }, (_, i) => [`key${i}`, `value${i}`]);

test('identical replicas have the same root: one comparison and done', () => {
  const r = diff(buildTree(entries), buildTree(entries));
  expect(r).toEqual({ leaves: [], comparisons: 1 });
});

test('one stale key among 10,000 is found with 21 comparisons instead of scanning 1,024 leaves', () => {
  const stale = entries.map(([k, v]) => (k === 'key4242' ? [k, 'old'] : [k, v]));
  const a = buildTree(entries);
  const b = buildTree(stale);
  const r = diff(a, b);
  expect(r.leaves).toHaveLength(1);
  expect(a.leaves[r.leaves[0]].some((s) => s.startsWith('key4242='))).toBe(true);
  expect(r.comparisons).toBe(1 + 2 * 10);                     // the root, then two children at each of 10 levels
});

test('a missing key is found the same way', () => {
  const r = diff(buildTree(entries), buildTree(entries.filter(([k]) => k !== 'key7')));
  expect(r.leaves).toHaveLength(1);
});

test('several differences make several leaves, each repaired on its own', () => {
  const changed = entries.map(([k, v]) => (['key1', 'key500', 'key9000'].includes(k) ? [k, 'x'] : [k, v]));
  const r = diff(buildTree(entries), buildTree(changed));
  expect(r.leaves.length).toBeGreaterThanOrEqual(1);
  expect(r.leaves.length).toBeLessThanOrEqual(3);
});

test('the sum behind the depth: 1M keys in a range at 2^20 leaves is about one key per leaf', () => {
  expect(2 ** 20).toBe(1_048_576);
});

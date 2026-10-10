import { expect, test } from 'vitest';
import { rendezvous } from './rendezvous.js';

const keys = Array.from({ length: 10_000 }, (_, i) => `user:${i}`);

test('the answer does not depend on the order of the node list', () => {
  for (const k of keys.slice(0, 500)) expect(rendezvous(k, ['A', 'B', 'C', 'D'])).toBe(rendezvous(k, ['D', 'C', 'B', 'A']));
});

test('spreads keys evenly', () => {
  const counts = {};
  for (const k of keys) { const n = rendezvous(k, ['A', 'B', 'C', 'D']); counts[n] = (counts[n] ?? 0) + 1; }
  for (const n of ['A', 'B', 'C', 'D']) expect(counts[n] / keys.length).toBeGreaterThan(0.22);   // ideal 25%
});

test('removing a node only moves that node’s keys', () => {
  const before = keys.map((k) => rendezvous(k, ['A', 'B', 'C', 'D']));
  const after = keys.map((k) => rendezvous(k, ['A', 'B', 'D']));
  keys.forEach((_, i) => { if (before[i] !== 'C') expect(after[i]).toBe(before[i]); });
});

test('adding a 5th node moves about 20% of keys, all to the new node', () => {
  const before = keys.map((k) => rendezvous(k, ['A', 'B', 'C', 'D']));
  const after = keys.map((k) => rendezvous(k, ['A', 'B', 'C', 'D', 'E']));
  const moved = after.filter((n, i) => n !== before[i]);
  expect(moved.length / keys.length).toBeGreaterThan(0.17);
  expect(moved.length / keys.length).toBeLessThan(0.23);
  expect(new Set(moved)).toEqual(new Set(['E']));
});

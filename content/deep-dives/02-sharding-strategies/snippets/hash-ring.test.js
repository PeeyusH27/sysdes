import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { HashRing } from './hash-ring.js';

const hashOf = (s) => createHash('md5').update(s).digest().readUInt32BE(0);

const keys = Array.from({ length: 20_000 }, (_, i) => `user:${i}`);

test('adding a 5th node moves about 20% of keys, all of them to the new node', () => {
  const ring = new HashRing(['A', 'B', 'C', 'D']);
  const before = keys.map((k) => ring.get(k));
  ring.add('E');
  const after = keys.map((k) => ring.get(k));
  const movedTo = after.filter((n, i) => n !== before[i]);
  const share = movedTo.length / keys.length;
  expect(share).toBeGreaterThan(0.15);
  expect(share).toBeLessThan(0.25);
  expect(new Set(movedTo)).toEqual(new Set(['E']));
});

test('removing a node only moves that node’s keys', () => {
  const ring = new HashRing(['A', 'B', 'C', 'D', 'E']);
  const before = keys.map((k) => ring.get(k));
  ring.remove('C');
  keys.forEach((k, i) => {
    if (before[i] !== 'C') expect(ring.get(k)).toBe(before[i]);
    else expect(ring.get(k)).not.toBe('C');
  });
});

test('100 virtual nodes keep every node close to its fair share', () => {
  const ring = new HashRing(['A', 'B', 'C', 'D']);
  const counts = {};
  for (const k of keys) counts[ring.get(k)] = (counts[ring.get(k)] ?? 0) + 1;
  for (const n of ['A', 'B', 'C', 'D']) {
    expect(counts[n] / keys.length).toBeGreaterThan(0.18);   // ideal 25%
    expect(counts[n] / keys.length).toBeLessThan(0.32);
  }
});

test('binary search agrees with a linear scan, including the wrap-around', () => {
  const ring = new HashRing(['A', 'B', 'C'], 10);
  const linear = (key) => (ring.ring.find((p) => p.pos >= hashOf(key)) ?? ring.ring[0]).node;   // the old O(n) scan
  for (const k of keys.slice(0, 2000)) expect(ring.get(k)).toBe(linear(k));
});

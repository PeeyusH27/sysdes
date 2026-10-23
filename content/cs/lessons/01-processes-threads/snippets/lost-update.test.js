import { test, expect } from 'vitest';
import { run } from './lost-update.js';

test('one thread after the other gives 2', () => {
  expect(run([0, 0, 0, 1, 1, 1])).toBe(2);
});

test('both threads load before either stores: one update is lost', () => {
  expect(run([0, 1, 0, 1, 0, 1])).toBe(1);
});

test('without a lock, every one of the 20 interleavings ends at 1 or 2', () => {
  const seen = new Set();
  for (let m = 0; m < 64; m++) {
    const bits = [0, 1, 2, 3, 4, 5].map((i) => (m >> i) & 1);
    if (bits.reduce((a, b) => a + b, 0) !== 3) continue;
    seen.add(run(bits));
  }
  expect([...seen].sort()).toEqual([1, 2]);
});

test('with a lock, the same bad schedule gives 2', () => {
  expect(run([0, 1, 0, 1, 0, 1], { locked: true })).toBe(2);
});

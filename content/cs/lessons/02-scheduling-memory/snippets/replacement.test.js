import { test, expect } from 'vitest';
import { faults } from './replacement.js';

const belady = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

test('FIFO can get worse with more memory (Belady): 9 faults with 3 frames, 10 with 4', () => {
  expect(faults(belady, 3, 'fifo')).toBe(9);
  expect(faults(belady, 4, 'fifo')).toBe(10);
});

test('LRU never does that: more frames, no more faults', () => {
  expect(faults(belady, 3, 'lru')).toBe(10);
  expect(faults(belady, 4, 'lru')).toBe(8);
});

test('thrashing: a loop over 5 pages with 4 frames faults on every access, with 5 frames only 5 times', () => {
  const loop = Array.from({ length: 15 }, (_, i) => (i % 5) + 1);
  expect(faults(loop, 4, 'lru')).toBe(15);
  expect(faults(loop, 5, 'lru')).toBe(5);
});

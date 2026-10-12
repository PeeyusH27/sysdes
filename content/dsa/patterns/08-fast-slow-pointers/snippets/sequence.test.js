import { expect, test } from 'vitest';
import { floyd } from './sequence.js';

const digitSquares = (n) => String(n).split('').reduce((sum, d) => sum + d * d, 0);

test('finds the cycle of a lookup table', () => {
  const table = [4, 0, 7, 2, 6, 3, 2, 5];
  expect(floyd((x) => table[x], 0)).toEqual({ start: 2, tail: 3, length: 4 });
  expect(floyd((x) => (x * x + 1) % 10, 3)).toEqual({ start: 0, tail: 1, length: 6 });
});

test('happy numbers end in the 1 → 1 loop', () => {
  expect(floyd(digitSquares, 19)).toEqual({ start: 1, tail: 4, length: 1 });
  expect(floyd(digitSquares, 1)).toEqual({ start: 1, tail: 0, length: 1 });
  expect(floyd(digitSquares, 2)).toEqual({ start: 4, tail: 1, length: 8 });
});

test('the duplicate in [1..n] values is the entry of the index walk from 0', () => {
  const nums = [4, 3, 1, 4, 2];
  expect(floyd((i) => nums[i], 0).start).toBe(4);
});

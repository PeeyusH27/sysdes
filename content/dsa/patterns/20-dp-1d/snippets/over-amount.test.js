import { expect, test } from 'vitest';
import { numSquares } from './over-amount.js';

test('finds the fewest squares, even when greedy would not', () => {
  expect(numSquares(12)).toBe(3); // 4 + 4 + 4, while greedy takes 9 + 1 + 1 + 1
  expect(numSquares(13)).toBe(2); // 4 + 9
  expect(numSquares(7)).toBe(4);  // 4 + 1 + 1 + 1
});

test('handles perfect squares and the base case', () => {
  expect(numSquares(0)).toBe(0);
  expect(numSquares(1)).toBe(1);
  expect(numSquares(49)).toBe(1);
  expect(numSquares(9999)).toBe(4); // 9999 leaves 7 when divided by 8: no three squares can make it
});

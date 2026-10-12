import { expect, test } from 'vitest';
import { greedyChange, minCoins } from './coins.js';

test('greedy is optimal for canonical coins', () => {
  expect(greedyChange([1, 5, 10, 25], 68)).toEqual([25, 25, 10, 5, 1, 1, 1]);
  for (let x = 0; x <= 200; x++) expect(greedyChange([1, 5, 10, 25], x).length).toBe(minCoins([1, 5, 10, 25], x));
});

test('greedy fails for arbitrary coins, DP does not', () => {
  expect(greedyChange([1, 3, 4], 6)).toEqual([4, 1, 1]);
  expect(minCoins([1, 3, 4], 6)).toBe(2);
  expect(greedyChange([4, 3], 6)).toBeNull(); // greedy gets stuck at 2 left, though 3 + 3 works
  expect(minCoins([4, 3], 6)).toBe(2);
  expect(minCoins([5], 3)).toBe(-1);
});

import { expect, test } from 'vitest';
import { knapsack01, knapsackItems, knapsackUnbounded } from './knapsack.js';

test('0/1 uses each item at most once', () => {
  expect(knapsack01([2, 3], [3, 5], 6)).toBe(8);
  expect(knapsack01([2, 3, 4], [3, 4, 6], 5)).toBe(7);
  expect(knapsack01([3, 2, 2], [5, 3, 3], 4)).toBe(6); // best value per weight first would give 5
  expect(knapsack01([5], [10], 4)).toBe(0);
  expect(knapsack01([], [], 10)).toBe(0);
});

test('unbounded may reuse items', () => {
  expect(knapsackUnbounded([2, 3], [3, 5], 6)).toBe(10);
  expect(knapsackUnbounded([1, 3, 4], [15, 50, 60], 8)).toBe(130); // 3 + 3 + 1 + 1: 50 + 50 + 15 + 15
  expect(knapsackUnbounded([5], [10], 4)).toBe(0);
});

test('the full table also tells you which items were taken', () => {
  expect(knapsackItems([2, 3, 4], [3, 4, 6], 5)).toEqual({ best: 7, items: [0, 1] });
  expect(knapsackItems([3, 2, 2], [5, 3, 3], 4)).toEqual({ best: 6, items: [1, 2] });
  expect(knapsackItems([5], [10], 4)).toEqual({ best: 0, items: [] });
});

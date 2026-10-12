import { expect, test } from 'vitest';
import { minCostRecursive } from './stairs-recursive.js';

test('plain recursion finds the cheapest way to the top', () => {
  expect(minCostRecursive([1, 4, 2, 3, 1, 5, 2])).toBe(6);
  expect(minCostRecursive([10, 15, 20])).toBe(15);
  expect(minCostRecursive([1, 100, 1, 1, 1, 100, 1, 1, 100, 1])).toBe(6);
});

test('plain recursion handles the smallest staircases', () => {
  expect(minCostRecursive([10, 15])).toBe(10);
  expect(minCostRecursive([5])).toBe(0);
  expect(minCostRecursive([0, 0, 0, 0])).toBe(0);
});

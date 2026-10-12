import { expect, test } from 'vitest';
import { subsetsWithSum } from './subset-sum.js';

test('finds every group that hits the target', () => {
  expect(subsetsWithSum([4, 1, 3, 2], 5)).toEqual([[1, 4], [2, 3]]);
  expect(subsetsWithSum([2, 3, 5, 6, 8], 10)).toEqual([[2, 3, 5], [2, 8]]);
});

test('no answer, exact single value, target of everything', () => {
  expect(subsetsWithSum([5, 6], 4)).toEqual([]);
  expect(subsetsWithSum([7, 3], 7)).toEqual([[7]]);
  expect(subsetsWithSum([1, 2, 3], 6)).toEqual([[1, 2, 3]]);
});

test('agrees with checking every subset', () => {
  const nums = [3, 9, 1, 7, 4, 6, 2];
  const brute = [];
  for (let mask = 0; mask < 1 << nums.length; mask++) {
    const pick = nums.filter((_, i) => mask & (1 << i)).sort((a, b) => a - b);
    if (pick.reduce((s, x) => s + x, 0) === 13) brute.push(pick.join(','));
  }
  expect(subsetsWithSum(nums, 13).map((p) => p.join(',')).sort()).toEqual(brute.sort());
});

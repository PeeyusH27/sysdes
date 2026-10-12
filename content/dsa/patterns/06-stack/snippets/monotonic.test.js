import { expect, test } from 'vitest';
import { nextGreaterIndex, smallerNeighbours } from './monotonic.js';

const bruteNextGreater = (nums) =>
  nums.map((x, i) => {
    for (let j = i + 1; j < nums.length; j++) if (nums[j] > x) return j;
    return -1;
  });

test('next greater index', () => {
  expect(nextGreaterIndex([5, 2, 3, 1, 6, 4])).toEqual([4, 2, 4, 4, -1, -1]);
  expect(nextGreaterIndex([3, 3, 1, 4])).toEqual([3, 3, 3, -1]);
  expect(nextGreaterIndex([9, 7, 4])).toEqual([-1, -1, -1]);
  expect(nextGreaterIndex([])).toEqual([]);
});

test('next greater index matches brute force on random input', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) % 10;
  for (let t = 0; t < 50; t++) {
    const nums = Array.from({ length: 12 }, rand);
    expect(nextGreaterIndex(nums)).toEqual(bruteNextGreater(nums));
  }
});

test('nearest smaller neighbours on both sides', () => {
  expect(smallerNeighbours([4, 6, 5, 2, 7, 3])).toEqual({ left: [-1, 0, 0, -1, 3, 3], right: [3, 2, 3, 6, 5, 6] });
  // Ties: right is strictly smaller, left is smaller or equal.
  expect(smallerNeighbours([3, 1, 3, 3, 0])).toEqual({ left: [-1, -1, 1, 2, -1], right: [1, 4, 4, 4, 5] });
});

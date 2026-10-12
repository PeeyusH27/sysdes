import { expect, test } from 'vitest';
import { minCostMemo } from './stairs-memo.js';

test('memoized recursion matches the known answers', () => {
  expect(minCostMemo([1, 4, 2, 3, 1, 5, 2])).toBe(6);
  expect(minCostMemo([10, 15, 20])).toBe(15);
  expect(minCostMemo([10, 15])).toBe(10);
  expect(minCostMemo([5])).toBe(0);
});

test('memoized recursion stays fast on a long staircase', () => {
  const cost = Array.from({ length: 2000 }, (_, i) => (i * 7) % 10);
  let a = 0;
  let b = 0;
  for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])];
  expect(minCostMemo(cost)).toBe(b);
});

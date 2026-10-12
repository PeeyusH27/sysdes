import { expect, test } from 'vitest';
import { minCostRolling } from './stairs-rolling.js';
import { minCostTable } from './stairs-table.js';

test('rolling variables match the known answers', () => {
  expect(minCostRolling([1, 4, 2, 3, 1, 5, 2])).toBe(6);
  expect(minCostRolling([10, 15, 20])).toBe(15);
  expect(minCostRolling([10, 15])).toBe(10);
  expect(minCostRolling([5])).toBe(0);
});

test('rolling variables agree with the full table on a long staircase', () => {
  const cost = Array.from({ length: 50000 }, (_, i) => (i * 7919) % 100);
  expect(minCostRolling(cost)).toBe(minCostTable(cost));
});

import { expect, test } from 'vitest';
import { countGroups, groupsOf } from './count-groups.js';

test('counts components, including isolated items', () => {
  expect(countGroups(5, [[0, 1], [1, 2], [3, 4]])).toBe(2);
  expect(countGroups(6, [[0, 1], [1, 2], [2, 0], [3, 4]])).toBe(3); // 2-0 closes a loop, 5 is alone
  expect(countGroups(4, [])).toBe(4);
  expect(countGroups(1, [])).toBe(1);
});

test('lists the members of every group', () => {
  const groups = groupsOf(6, [[0, 3], [3, 5], [1, 2]]).map((g) => g.sort((a, b) => a - b));
  groups.sort((a, b) => a[0] - b[0]);
  expect(groups).toEqual([[0, 3, 5], [1, 2], [4]]);
});

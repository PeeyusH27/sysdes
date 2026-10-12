import { expect, test } from 'vitest';
import { topoLevels } from './kahn-levels.js';

test('groups nodes into rounds', () => {
  expect(topoLevels(5, [[0, 2], [1, 2], [2, 3], [1, 4], [4, 3]])).toEqual([[0, 1], [2, 4], [3]]);
  expect(topoLevels(3, [])).toEqual([[0, 1, 2]]);
});

test('a node waits for its longest chain, not its first prerequisite', () => {
  // 0 → 3 directly, but also 0 → 1 → 2 → 3, so 3 lands in round 4
  expect(topoLevels(4, [[0, 3], [0, 1], [1, 2], [2, 3]])).toEqual([[0], [1], [2], [3]]);
});

test('returns null when a cycle blocks some nodes', () => {
  expect(topoLevels(4, [[0, 1], [1, 2], [2, 1], [0, 3]])).toBeNull();
});

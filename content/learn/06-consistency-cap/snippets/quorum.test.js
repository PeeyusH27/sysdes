import { expect, test } from 'vitest';
import { failuresTolerated, majority, quorum } from './quorum.js';

test('R + W > N means reads overlap the latest write', () => {
  expect(quorum(3, 2, 2)).toEqual({ strong: true, writeTolerates: 1, readTolerates: 1 });
  expect(quorum(3, 1, 1).strong).toBe(false);
  expect(quorum(5, 3, 2).strong).toBe(false);
  expect(quorum(5, 3, 3)).toEqual({ strong: true, writeTolerates: 2, readTolerates: 2 });
  expect(quorum(3, 3, 1)).toEqual({ strong: true, writeTolerates: 0, readTolerates: 2 });
});

test('odd cluster sizes: an extra even node adds no fault tolerance', () => {
  expect([1, 3, 4, 5, 7].map(majority)).toEqual([1, 2, 3, 3, 4]);
  expect([1, 3, 4, 5, 7].map(failuresTolerated)).toEqual([0, 1, 1, 2, 3]);
});

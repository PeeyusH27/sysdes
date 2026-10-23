import { expect, test } from 'vitest';
import { rotateClockwise, rotateCounterClockwise, transpose } from './rotate.js';

test('transpose flips rows and columns, including rectangles', () => {
  expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
  expect(transpose([[7]])).toEqual([[7]]);
  expect(transpose([[1], [2], [3]])).toEqual([[1, 2, 3]]);
});

test('rotateClockwise turns the grid in place', () => {
  const m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  rotateClockwise(m);
  expect(m).toEqual([[7, 4, 1], [8, 5, 2], [9, 6, 3]]);
  const one = [[5]];
  rotateClockwise(one);
  expect(one).toEqual([[5]]);
});

test('counter-clockwise undoes clockwise, and four turns return the start', () => {
  const m = [[1, 2], [3, 4]];
  rotateCounterClockwise(m);
  expect(m).toEqual([[2, 4], [1, 3]]);
  rotateClockwise(m);
  expect(m).toEqual([[1, 2], [3, 4]]);
  for (let k = 0; k < 4; k++) rotateClockwise(m);
  expect(m).toEqual([[1, 2], [3, 4]]);
});

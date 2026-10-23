import { expect, test } from 'vitest';
import { setZeroes } from './markers.js';

test('a zero in the middle clears its row and column', () => {
  const m = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
  setZeroes(m);
  expect(m).toEqual([[1, 0, 1], [0, 0, 0], [1, 0, 1]]);
});

test('zeros in the first row or column are not lost or invented', () => {
  const a = [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]];
  setZeroes(a);
  expect(a).toEqual([[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]]);
  const b = [[1, 2, 3], [0, 5, 6], [7, 8, 9]];
  setZeroes(b);
  expect(b).toEqual([[0, 2, 3], [0, 0, 0], [0, 8, 9]]);
});

test('no zeros changes nothing, and single lines work', () => {
  const m = [[1, 2], [3, 4]];
  setZeroes(m);
  expect(m).toEqual([[1, 2], [3, 4]]);
  const row = [[1, 0, 3]];
  setZeroes(row);
  expect(row).toEqual([[0, 0, 0]]);
  const col = [[5], [0], [7]];
  setZeroes(col);
  expect(col).toEqual([[0], [0], [0]]);
});

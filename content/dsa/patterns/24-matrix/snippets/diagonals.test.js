import { expect, test } from 'vitest';
import { antiDiagonals, diagonalOrder } from './diagonals.js';

test('antiDiagonals groups cells by row + column', () => {
  expect(antiDiagonals([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toEqual([[1], [2, 4], [3, 5, 7], [6, 8], [9]]);
  expect(antiDiagonals([[1, 2, 3], [4, 5, 6]])).toEqual([[1], [2, 4], [3, 5], [6]]);
});

test('diagonalOrder zig-zags starting up-right', () => {
  expect(diagonalOrder([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toEqual([1, 2, 4, 7, 5, 3, 6, 8, 9]);
  expect(diagonalOrder([[1, 2, 3], [4, 5, 6]])).toEqual([1, 2, 4, 5, 3, 6]);
  expect(diagonalOrder([[1, 2], [3, 4], [5, 6]])).toEqual([1, 2, 3, 5, 4, 6]);
});

test('single row, single column and single cell', () => {
  expect(diagonalOrder([[1, 2, 3, 4]])).toEqual([1, 2, 3, 4]);
  expect(diagonalOrder([[1], [2], [3]])).toEqual([1, 2, 3]);
  expect(diagonalOrder([[9]])).toEqual([9]);
});

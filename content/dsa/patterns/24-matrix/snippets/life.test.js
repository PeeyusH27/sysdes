import { expect, test } from 'vitest';
import { gameOfLife, nextGeneration } from './life.js';

test('a blinker flips between a vertical and a horizontal bar', () => {
  const b = [[0, 1, 0], [0, 1, 0], [0, 1, 0]];
  gameOfLife(b);
  expect(b).toEqual([[0, 0, 0], [1, 1, 1], [0, 0, 0]]);
  gameOfLife(b);
  expect(b).toEqual([[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
});

test('a block is stable and a lone cell dies', () => {
  const block = [[1, 1], [1, 1]];
  gameOfLife(block);
  expect(block).toEqual([[1, 1], [1, 1]]);
  const lone = [[1]];
  gameOfLife(lone);
  expect(lone).toEqual([[0]]);
});

test('the in-place version matches the copying version', () => {
  const start = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]];
  const want = nextGeneration(start);
  expect(want).toEqual([[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]]);
  const b = start.map((row) => row.slice());
  gameOfLife(b);
  expect(b).toEqual(want);
});

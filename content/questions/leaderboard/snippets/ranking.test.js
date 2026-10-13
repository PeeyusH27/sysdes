import { test, expect } from 'vitest';
import { competitionRanks, denseRanks, uniqueRanks, topK, aroundMe } from './ranking.js';

const board = [
  { id: 'zoe', score: 80, at: 1 },
  { id: 'leo', score: 90, at: 7 },
  { id: 'maya', score: 100, at: 3 },
  { id: 'ravi', score: 90, at: 2 }, // reached 90 before Leo did
];
const ranks = rows => rows.map(r => `${r.id}:${r.rank}`);

test('competition ranking: 1224', () => {
  expect(ranks(competitionRanks(board))).toEqual(['maya:1', 'ravi:2', 'leo:2', 'zoe:4']);
});

test('dense ranking: 1223', () => {
  expect(ranks(denseRanks(board))).toEqual(['maya:1', 'ravi:2', 'leo:2', 'zoe:3']);
});

test('unique ranking: the first to reach 90 is ahead', () => {
  expect(ranks(uniqueRanks(board))).toEqual(['maya:1', 'ravi:2', 'leo:3', 'zoe:4']);
});

test('top-K keeps shared ranks', () => {
  expect(ranks(topK(board, 3))).toEqual(['maya:1', 'ravi:2', 'leo:2']);
});

const big = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, score: 1000 - i * 10, at: i }));
const ranked = uniqueRanks(big);

test('around me: centred in the middle of the board', () => {
  expect(aroundMe(ranked, 'p15', 5).map(r => r.rank)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
});

test('around me: the window slides at rank 1 and at the last rank', () => {
  expect(aroundMe(ranked, 'p0', 5).map(r => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  expect(aroundMe(ranked, 'p29', 5).map(r => r.rank)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
});

test('around me: small boards and unknown players', () => {
  expect(aroundMe(uniqueRanks(board), 'leo', 5)).toHaveLength(4);
  expect(aroundMe(ranked, 'nobody', 5)).toEqual([]);
});

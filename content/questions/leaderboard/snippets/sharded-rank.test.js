import { test, expect } from 'vitest';
import { shardOf, mergeTopK, rankFromShardCounts, approxRank } from './sharded-rank.js';
import { competitionRanks, uniqueRanks, byScoreThenTime } from './ranking.js';

// A deterministic board: 200 players, scores in steps of 10 so ties are common.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const board = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, score: 10 * Math.floor(rand() * 60), at: i }));
const N = 4;
const shards = Array.from({ length: N }, (_, s) => board.filter(e => shardOf(e.id, N) === s).sort(byScoreThenTime));

test('shardOf is stable and spreads players over every shard', () => {
  expect(shardOf('maya', N)).toBe(shardOf('maya', N));
  for (const s of shards) expect(s.length).toBeGreaterThan(30);
});

test('1 + Σ ZCOUNT above me on every shard equals my true rank', () => {
  const truth = new Map(competitionRanks(board).map(r => [r.id, r.rank]));
  for (const me of board) {
    const counts = shards.map(s => s.filter(e => e.score > me.score).length); // ZCOUNT shard (score +inf
    expect(rankFromShardCounts(counts)).toBe(truth.get(me.id));
  }
});

test('merging each shard\'s top K gives the global top K', () => {
  const k = 10;
  const merged = mergeTopK(shards.map(s => s.slice(0, k)), k);
  expect(merged.map(e => e.id)).toEqual(uniqueRanks(board).slice(0, k).map(e => e.id));
});

test('asking each shard for only K / N is wrong when one shard is strong', () => {
  const strong = [
    [{ id: 'a', score: 99, at: 0 }, { id: 'b', score: 98, at: 0 }, { id: 'c', score: 97, at: 0 }],
    [{ id: 'd', score: 10, at: 0 }],
  ];
  expect(mergeTopK(strong.map(s => s.slice(0, 3)), 3).map(e => e.id)).toEqual(['a', 'b', 'c']);
  expect(mergeTopK(strong.map(s => s.slice(0, 2)), 3).map(e => e.id)).toEqual(['a', 'b', 'd']); // c is missing
});

test('mergeTopK stops early when there are fewer than K players', () => {
  expect(mergeTopK([[{ id: 'x', score: 1, at: 0 }], []], 5)).toHaveLength(1);
});

const hist = [
  { lo: 0, hi: 100, count: 50 },
  { lo: 100, hi: 200, count: 30 },
  { lo: 200, hi: 300, count: 20 },
];

test('approximate rank from a histogram', () => {
  expect(approxRank(hist, 250)).toEqual({ rank: 11, topPercent: 11 });  // 10 of 20 above in its bucket
  expect(approxRank(hist, 150)).toEqual({ rank: 36, topPercent: 36 });  // 20 + 15 above
  expect(approxRank(hist, 999).rank).toBe(1);
  expect(approxRank(hist, 0).rank).toBe(100);                           // clamped to the board size
});

test('on evenly spread scores the estimate is within one percent', () => {
  const scores = Array.from({ length: 10_000 }, () => Math.floor(rand() * 100_000));
  const buckets = Array.from({ length: 100 }, (_, b) => ({ lo: b * 1000, hi: (b + 1) * 1000, count: 0 }));
  for (const s of scores) buckets[Math.floor(s / 1000)].count++;
  for (const probe of [scores[0], scores[1], scores[2], scores[3]]) {
    const exact = 1 + scores.filter(s => s > probe).length;
    expect(Math.abs(approxRank(buckets, probe).rank - exact)).toBeLessThan(100);
  }
});

// One sorted set lives on one Redis node. When a board outgrows a node, split it into N keys by
// player hash and answer every query by asking all N shards and combining the answers.
import { byScoreThenTime } from './ranking.js';

// FNV-1a: stable across processes and languages. Changing N moves most players, so a reshard
// is a rebuild from the totals table, not a live migration.
export function shardOf(id, shards) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h % shards;
}

// Global top K = the best K of every shard's own top K (ZREVRANGE 0 K-1 on each).
// Each shard must return K, not K / N: all of the global top K may live on one shard.
export function mergeTopK(perShard, k) {
  const heads = perShard.map(() => 0);
  const out = [];
  while (out.length < k) {
    let best = -1;
    perShard.forEach((list, s) => {
      const e = list[heads[s]];
      if (e && (best < 0 || byScoreThenTime(e, perShard[best][heads[best]]) < 0)) best = s;
    });
    if (best < 0) break;                                    // fewer than k players in total
    out.push(perShard[best][heads[best]++]);
  }
  return out;
}

// My global rank = 1 + Σ over shards of ZCOUNT shard (myScore +inf: players with strictly
// more points ("1224" ranking). With composite scores (tie-score.js) the same sum is unique.
export const rankFromShardCounts = countsAbove => 1 + countsAbove.reduce((a, b) => a + b, 0);

// Approximate rank for the long tail from a histogram of scores, kept as counters per bucket:
// buckets = [{ lo, hi, count }] with lo inclusive and hi exclusive. Assumes scores are spread
// evenly inside a bucket, so the error is at most one bucket's count.
export function approxRank(buckets, score) {
  let above = 0;
  let total = 0;
  for (const { lo, hi, count } of buckets) {
    total += count;
    if (lo > score) above += count;
    else if (score < hi) above += (count * (hi - score)) / (hi - lo);
  }
  const rank = Math.min(total, Math.max(1, Math.round(1 + above)));
  return { rank, topPercent: Math.ceil((rank / total) * 100) };
}

// @display-only: needs the ioredis package and a running Redis 7+ (REDIS_URL)
import Redis from 'ioredis';
import { boardKeys, dailyKeysOfWeek, DAY_TTL_S, WEEK_TTL_S } from './periods.js';
import { encode, seasonSeconds } from './tie-score.js';
import { competitionRanks } from './ranking.js';
import { shardOf, mergeTopK, rankFromShardCounts } from './sharded-rank.js';

export const redis = new Redis(process.env.REDIS_URL);

// The board updater calls this once per Kafka event. Kafka delivers at least once, and ZINCRBY
// is not idempotent, so the script first checks the last offset this partition applied. The
// offset and the three boards change together, so after a failover they still agree.
redis.defineCommand('applyScore', {
  numberOfKeys: 4, // offset key, all-time, daily, weekly (one hash tag, so one slot)
  lua: `
    local applied = tonumber(redis.call('GET', KEYS[1]) or '-1')
    if tonumber(ARGV[1]) <= applied then return false end
    redis.call('SET', KEYS[1], ARGV[1])
    local total = redis.call('ZINCRBY', KEYS[2], ARGV[2], ARGV[3])
    redis.call('ZINCRBY', KEYS[3], ARGV[2], ARGV[3])
    redis.call('EXPIRE', KEYS[3], ARGV[4], 'NX')
    redis.call('ZINCRBY', KEYS[4], ARGV[2], ARGV[3])
    redis.call('EXPIRE', KEYS[4], ARGV[5], 'NX')
    return total`,
});

export async function applyScore(game, partition, offset, { playerId, points, playedAt }) {
  const k = boardKeys(game, playedAt);
  const total = await redis.applyScore(`off:{${game}}:${partition}`, k.all, k.daily, k.weekly, offset, points, playerId, DAY_TTL_S, WEEK_TTL_S);
  return total === null ? null : Number(total); // null: a redelivery, already counted
}

// On startup and after a failover, seek each partition to what Redis actually holds.
export const appliedOffset = async (game, partition) => Number((await redis.get(`off:{${game}}:${partition}`)) ?? -1);

// Best single-match score; ties go to whoever reached it first. GT only ever raises a score, and
// the same points reached later encode smaller, so they never replace the earlier entry.
// Replaying the same ZADD changes nothing: idempotent for free.
export async function submitBest(game, playerId, points, nowMs, seasonStartMs) {
  const composite = encode(points, seasonSeconds(nowMs, seasonStartMs));
  return (await redis.zadd(`lb:{${game}}:best`, 'GT', 'CH', composite, playerId)) === 1; // true: new best
}

// Top N with "1224" ranks. O(log n + N). (ZRANGE key 0 N-1 REV is the Redis 6.2+ spelling.)
export async function top(key, n = 100) {
  const flat = await redis.zrevrange(key, 0, n - 1, 'WITHSCORES');
  const rows = [];
  for (let i = 0; i < flat.length; i += 2) {
    const score = Number(flat[i + 1]);
    const prev = rows.at(-1);
    rows.push({ id: flat[i], score, rank: prev && prev.score === score ? prev.rank : rows.length + 1 });
  }
  return rows;
}

// My rank: 1 + players with strictly more points. ZREVRANK alone would break ties by member name.
export async function myRank(key, playerId) {
  const score = await redis.zscore(key, playerId);              // O(1)
  if (score === null) return null;                               // no score in this period yet
  const above = await redis.zcount(key, `(${score}`, '+inf');    // O(log n): nothing is scanned
  return { score: Number(score), rank: above + 1 };
}

// The 2r + 1 players around me; the window slides instead of shrinking at either end.
export async function aroundMe(key, playerId, r = 5) {
  const [[, pos], [, size]] = await redis.pipeline().zrevrank(key, playerId).zcard(key).exec();
  if (pos === null) return [];
  const start = Math.max(0, Math.min(pos - r, size - (2 * r + 1)));
  const flat = await redis.zrevrange(key, start, start + 2 * r, 'WITHSCORES');
  const rows = [];
  for (let i = 0; i < flat.length; i += 2) rows.push({ id: flat[i], score: Number(flat[i + 1]), position: start + i / 2 + 1 });
  return rows;
}

// Rebuild a week from its seven daily boards (after losing it, or after voiding a cheater's
// events). O(N) + O(M log M) over millions of members blocks Redis for seconds: run it off-peak
// or on a spare instance, never per request. Needs all seven dailies, hence the 8-day TTL.
export async function rebuildWeek(game, anyDayMs) {
  const days = dailyKeysOfWeek(game, anyDayMs);
  const { weekly } = boardKeys(game, anyDayMs);
  await redis.zunionstore(weekly, days.length, ...days, 'AGGREGATE', 'SUM');
  await redis.expire(weekly, WEEK_TTL_S);
}

// Past one node: N keys per board by player hash, each with its own hash tag so Redis Cluster
// can place them on different nodes. A write touches one shard; rank and top-K ask all of them.
const shardKey = (game, s) => `lb:{${game}:${s}}:all`;
const shards = n => Array.from({ length: n }, (_, s) => s);

export async function shardedRank(game, playerId, n) {
  const score = await redis.zscore(shardKey(game, shardOf(playerId, n)), playerId);
  if (score === null) return null;
  const counts = await Promise.all(shards(n).map(s => redis.zcount(shardKey(game, s), `(${score}`, '+inf')));
  return { score: Number(score), rank: rankFromShardCounts(counts) };
}

export async function shardedTop(game, n, k = 100) {
  const lists = await Promise.all(shards(n).map(s => top(shardKey(game, s), k))); // k from each, not k / n
  return competitionRanks(mergeTopK(lists.map(l => l.map(({ id, score }) => ({ id, score, at: 0 }))), k));
}

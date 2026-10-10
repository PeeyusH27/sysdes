import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { SHARDS, shardFor } from './shard-for.js';

test('the same user always maps to the same shard', () => {
  expect(shardFor(42)).toBe(shardFor('42'));
  expect(SHARDS).toContain(shardFor(42));
});

test('users spread evenly across shards', () => {
  const counts = Object.fromEntries(SHARDS.map((s) => [s, 0]));
  for (let id = 1; id <= 10_000; id++) counts[shardFor(id)]++;
  for (const n of Object.values(counts)) expect(Math.abs(n - 2_500)).toBeLessThan(250);   // within 10%
});

test('going from 4 to 5 shards with modulo moves about 80% of users', () => {
  const hash = (id) => createHash('md5').update(String(id)).digest().readUInt32BE(0);
  let moved = 0;
  for (let id = 1; id <= 10_000; id++) if (hash(id) % 4 !== hash(id) % 5) moved++;
  expect(moved / 10_000).toBeCloseTo(0.8, 1);
});

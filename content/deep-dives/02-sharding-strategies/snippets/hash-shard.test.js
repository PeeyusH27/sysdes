import { expect, test } from 'vitest';
import { shardFor } from './hash-shard.js';

const ids = Array.from({ length: 20_000 }, (_, i) => i + 1);

test('spreads ids evenly across shards', () => {
  const counts = [0, 0, 0, 0];
  for (const id of ids) counts[shardFor(id, 4)]++;
  for (const c of counts) expect(c / ids.length).toBeGreaterThan(0.23);   // ideal 25%
});

test('going from 4 to 5 shards moves about 80% of keys', () => {
  const moved = ids.filter((id) => shardFor(id, 4) !== shardFor(id, 5)).length / ids.length;
  expect(moved).toBeGreaterThan(0.77);
  expect(moved).toBeLessThan(0.83);
});

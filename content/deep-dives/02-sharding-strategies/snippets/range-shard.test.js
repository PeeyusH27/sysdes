import { expect, test } from 'vitest';
import { shardFor } from './range-shard.js';

test('each shard owns a contiguous range', () => {
  expect(shardFor(0)).toBe('db0');
  expect(shardFor(999_999)).toBe('db0');
  expect(shardFor(1_000_000)).toBe('db1');
  expect(shardFor(1_999_999)).toBe('db1');
  expect(shardFor(2_000_000)).toBe('db2');
});

test('sequential ids all land on the last shard (the hot-range problem)', () => {
  const next = Array.from({ length: 1000 }, (_, i) => 5_000_000 + i);
  expect(new Set(next.map(shardFor))).toEqual(new Set(['db2']));
});

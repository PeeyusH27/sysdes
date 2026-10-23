import { test, expect } from 'vitest';
import { hashJoin, mergeJoin, nestedLoop } from './joins.js';

const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }, { id: 3, name: 'Linus' }];
const orders = [{ userId: 1, total: 10 }, { userId: 1, total: 5 }, { userId: 3, total: 7 }, { userId: 9, total: 1 }];

test('all three algorithms return the same rows, and an order with no matching user is dropped (inner join)', () => {
  const expected = [{ name: 'Ada', total: 10 }, { name: 'Ada', total: 5 }, { name: 'Linus', total: 7 }];
  expect(nestedLoop(users, orders).rows).toEqual(expected);
  expect(hashJoin(users, orders).rows).toEqual(expected);
  expect(mergeJoin(users, orders).rows).toEqual(expected);
});

test('100 users and 1,000 orders: nested loop does 100,000 steps, hash and merge about 1,100', () => {
  const us = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `u${i + 1}` }));
  const os = Array.from({ length: 1000 }, (_, i) => ({ userId: (i % 100) + 1, total: i })).sort((a, b) => a.userId - b.userId);
  const nested = nestedLoop(us, os);
  const hash = hashJoin(us, os);
  const merge = mergeJoin(us, os);
  expect(nested.steps).toBe(100_000);
  expect(hash.steps).toBe(1100);
  expect(merge.steps).toBeLessThanOrEqual(1100);
  expect(nested.rows).toHaveLength(1000);
  expect(hash.rows).toHaveLength(1000);
  expect(merge.rows).toHaveLength(1000);
});

test('with no matches the answer is empty for every algorithm', () => {
  const lonely = [{ userId: 42, total: 1 }];
  for (const join of [nestedLoop, hashJoin, mergeJoin]) expect(join(users, lonely).rows).toEqual([]);
});

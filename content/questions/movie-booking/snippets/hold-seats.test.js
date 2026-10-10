import { test, expect, vi } from 'vitest';
import { holdSeats } from './hold-seats.js';

// The SQL itself needs Postgres; these tests pin the all-or-nothing control flow around it.
function fakePool({ rowCount = (params) => params[2].length, fail = false } = {}) {
  const log = [];
  let released = 0;
  const client = {
    async query(sql, params) {
      log.push(sql.trim().split(/\s+/)[0]);                  // BEGIN, UPDATE, COMMIT or ROLLBACK
      if (sql.trim().startsWith('UPDATE')) {
        if (fail) throw new Error('connection reset');
        return { rowCount: rowCount(params) };
      }
      return {};
    },
    release() { released++; },
  };
  return { pool: { connect: async () => client }, log, released: () => released };
}

test('holds every requested seat, deduped, then publishes the change', async () => {
  const { pool, log, released } = fakePool();
  const redis = { publish: vi.fn(async () => 1) };
  const result = await holdSeats(pool, redis, { showId: 42, seats: ['A5', 'A6', 'A5'], userId: 7 });
  expect(result).toEqual({ ok: true, seats: ['A5', 'A6'], expiresInSec: 300 });
  expect(log).toEqual(['BEGIN', 'UPDATE', 'COMMIT']);
  expect(redis.publish).toHaveBeenCalledWith('show:42:seats', JSON.stringify({ seats: ['A5', 'A6'], status: 'held' }));
  expect(released()).toBe(1);
});

test('one seat already taken: roll back the whole hold and publish nothing', async () => {
  const { pool, log, released } = fakePool({ rowCount: () => 1 });     // only 1 of the 2 rows matched
  const redis = { publish: vi.fn() };
  const result = await holdSeats(pool, redis, { showId: 42, seats: ['A5', 'A6'], userId: 8 });
  expect(result.ok).toBe(false);
  expect(log).toEqual(['BEGIN', 'UPDATE', 'ROLLBACK']);
  expect(redis.publish).not.toHaveBeenCalled();
  expect(released()).toBe(1);
});

test('rejects empty or oversized requests before touching the database', async () => {
  const { pool, log } = fakePool();
  await expect(holdSeats(pool, {}, { showId: 42, seats: [], userId: 7 })).rejects.toThrow('Pick 1–10 seats');
  const eleven = Array.from({ length: 11 }, (_, i) => `B${i + 1}`);
  await expect(holdSeats(pool, {}, { showId: 42, seats: eleven, userId: 7 })).rejects.toThrow('Pick 1–10 seats');
  expect(log).toEqual([]);
});

test('a database error rolls back, releases the connection and rethrows', async () => {
  const { pool, log, released } = fakePool({ fail: true });
  await expect(holdSeats(pool, {}, { showId: 42, seats: ['A5'], userId: 7 })).rejects.toThrow('connection reset');
  expect(log).toEqual(['BEGIN', 'UPDATE', 'ROLLBACK']);
  expect(released()).toBe(1);
});

import { expect, test, vi } from 'vitest';
import { relayOnce } from './outbox-relay.js';

// A fake pg pool that records the statements it sees and returns `rows` for the SELECT.
function fakePool(rows) {
  const log = [];
  const client = {
    async query(sql, params) {
      const verb = sql.trim().split(/\s+/)[0];
      log.push(verb);
      if (verb === 'UPDATE') log.push(params[0]);             // the ids being marked as published
      return { rows: verb === 'SELECT' ? rows : [] };
    },
    release: () => log.push('release'),
  };
  return { log, connect: async () => client };
}

test('publishes every pending row, marks them published, then commits', async () => {
  const pool = fakePool([
    { id: 1, topic: 'order.created', payload: { orderId: 'a' } },
    { id: 2, topic: 'order.created', payload: { orderId: 'b' } },
  ]);
  const publish = vi.fn(async () => {});
  expect(await relayOnce(pool, publish)).toBe(2);
  expect(publish).toHaveBeenNthCalledWith(1, 'order.created', { orderId: 'a' }, { id: 1 });
  expect(publish).toHaveBeenNthCalledWith(2, 'order.created', { orderId: 'b' }, { id: 2 });
  expect(pool.log).toEqual(['BEGIN', 'SELECT', 'UPDATE', [1, 2], 'COMMIT', 'release']);
});

test('nothing pending: no UPDATE', async () => {
  const pool = fakePool([]);
  expect(await relayOnce(pool, vi.fn())).toBe(0);
  expect(pool.log).toEqual(['BEGIN', 'SELECT', 'COMMIT', 'release']);
});

test('a failed publish rolls back, so the rows are retried on the next run', async () => {
  const pool = fakePool([{ id: 7, topic: 't', payload: {} }]);
  const publish = vi.fn(async () => { throw new Error('broker down'); });
  await expect(relayOnce(pool, publish)).rejects.toThrow('broker down');
  expect(pool.log).toEqual(['BEGIN', 'SELECT', 'ROLLBACK', 'release']);
});

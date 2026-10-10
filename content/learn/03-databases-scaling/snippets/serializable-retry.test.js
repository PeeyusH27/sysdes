import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { withSerializable } from './serializable-retry.js';

// A pool whose clients just record the SQL they are sent
function fakePool() {
  const log = [];
  return {
    log,
    async connect() {
      return {
        async query(sql) { log.push(sql); },
        release() { log.push('release'); },
      };
    },
  };
}
const pgError = (code) => Object.assign(new Error(`pg error ${code}`), { code });

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0); });   // no backoff wait in tests
afterEach(() => { vi.restoreAllMocks(); });

test('retries serialization failures until the transaction commits', async () => {
  const pool = fakePool();
  let runs = 0;
  const book = async () => {
    runs++;
    if (runs <= 2) throw pgError('40001');          // two conflicts, then success
    return 'booked';
  };
  expect(await withSerializable(pool, book)).toBe('booked');
  expect(runs).toBe(3);
  const count = (sql) => pool.log.filter((l) => l === sql).length;
  expect(count('BEGIN ISOLATION LEVEL SERIALIZABLE')).toBe(3);
  expect(count('ROLLBACK')).toBe(2);
  expect(count('COMMIT')).toBe(1);
  expect(count('release')).toBe(3);                 // every connection goes back to the pool
});

test('retries deadlocks too, but gives up after the last attempt', async () => {
  const pool = fakePool();
  let runs = 0;
  const work = async () => { runs++; throw pgError('40P01'); };
  await expect(withSerializable(pool, work, 3)).rejects.toMatchObject({ code: '40P01' });
  expect(runs).toBe(3);
});

test('does not retry other errors', async () => {
  const pool = fakePool();
  let runs = 0;
  const work = async () => { runs++; throw pgError('23505'); };   // unique violation: retrying won't help
  await expect(withSerializable(pool, work)).rejects.toMatchObject({ code: '23505' });
  expect(runs).toBe(1);
  expect(pool.log.at(-1)).toBe('release');
});

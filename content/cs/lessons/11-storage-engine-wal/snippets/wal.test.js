import { test, expect } from 'vitest';
import { Db, commitsPerSecond } from './wal.js';

const put = (db, key, value, opts) => {
  const tx = db.begin();
  db.set(tx, key, value);
  db.commit(tx, opts);
};

test('a committed write survives a crash even though no data page was ever written', () => {
  const db = new Db();
  put(db, 'balance', 100);
  expect(db.disk).toEqual({}); // nothing on disk yet
  db.crash();
  expect(db.get('balance')).toBeUndefined(); // memory is gone
  db.recover();
  expect(db.get('balance')).toBe(100); // replayed from the log
});

test('a transaction that never committed leaves no trace after recovery', () => {
  const db = new Db();
  const tx = db.begin();
  db.set(tx, 'x', 1);
  db.crash();
  db.recover();
  expect(db.get('x')).toBeUndefined();
});

test('a torn commit (records written, marker missing) is ignored', () => {
  const db = new Db();
  put(db, 'a', 1);
  const tx = db.begin();
  db.set(tx, 'a', 2);
  db.set(tx, 'b', 2);
  db.commit(tx, { tornAfter: 1 });
  db.recover();
  expect(db.get('a')).toBe(1);
  expect(db.get('b')).toBeUndefined();
});

test('later log records win over earlier ones', () => {
  const db = new Db();
  put(db, 'k', 'v1');
  put(db, 'k', 'v2');
  db.crash();
  db.recover();
  expect(db.get('k')).toBe('v2');
});

test('a checkpoint flushes the pages and empties the log, so recovery has less to replay', () => {
  const db = new Db();
  put(db, 'a', 1);
  put(db, 'b', 2);
  db.checkpoint();
  expect(db.log).toHaveLength(0);
  put(db, 'c', 3);
  db.crash();
  db.recover();
  expect([db.get('a'), db.get('b'), db.get('c')]).toEqual([1, 2, 3]);
  expect(db.log.length).toBe(2); // only the work since the checkpoint was replayed
});

test('recovery is idempotent: running it twice (a crash during recovery) gives the same state', () => {
  const db = new Db();
  put(db, 'a', 1);
  put(db, 'a', 5);
  db.crash();
  db.recover();
  const first = { ...db.memory };
  db.crash();
  db.recover();
  expect(db.memory).toEqual(first);
});

test('group commit: sharing one 2 ms fsync across 100 commits takes the ceiling from 500 to 50,000 a second', () => {
  expect(commitsPerSecond(2)).toBe(500);
  expect(commitsPerSecond(2, 100)).toBe(50000);
});

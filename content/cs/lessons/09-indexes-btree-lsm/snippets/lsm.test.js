import { test, expect } from 'vitest';
import { Lsm } from './lsm.js';

test('writes are readable from memory before any flush', () => {
  const db = new Lsm(10);
  db.put('a', 1);
  expect(db.get('a')).toBe(1);
  expect(db.runs).toHaveLength(0);
});

test('a full memtable becomes one sorted, immutable run', () => {
  const db = new Lsm(3);
  db.put('c', 3);
  db.put('a', 1);
  db.put('b', 2);
  expect(db.runs).toEqual([[['a', 1], ['b', 2], ['c', 3]]]);
  expect(db.mem.size).toBe(0);
});

test('the newest version wins, even when older versions sit in older runs', () => {
  const db = new Lsm(2);
  db.put('x', 'old');
  db.put('y', 1); // flush: x=old
  db.put('x', 'new');
  db.put('z', 2); // flush: x=new
  expect(db.get('x')).toBe('new');
});

test('a delete is a tombstone that hides older values until compaction removes both', () => {
  const db = new Lsm(2);
  db.put('k', 'v');
  db.put('m', 1); // flush
  db.delete('k');
  db.put('n', 2); // flush: tombstone
  expect(db.get('k')).toBeUndefined();
  expect(db.runs).toHaveLength(2);
  db.compact();
  expect(db.runs).toHaveLength(1);
  expect(db.runs[0].map(([key]) => key)).toEqual(['m', 'n']);
});

test('read amplification: a key in the oldest run costs one lookup per run, until compaction merges them', () => {
  const db = new Lsm(2);
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) db.put(k, k.toUpperCase()); // three runs
  expect(db.runs).toHaveLength(3);
  db.get('a');
  expect(db.runsRead).toBe(3);
  db.compact();
  db.runsRead = 0;
  db.get('a');
  expect(db.runsRead).toBe(1);
});

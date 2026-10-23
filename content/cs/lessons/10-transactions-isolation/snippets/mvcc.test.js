import { test, expect } from 'vitest';
import { Store } from './mvcc.js';

const seeded = (data) => {
  const db = new Store();
  const t = db.begin();
  for (const [k, v] of Object.entries(data)) t.set(k, v);
  t.commit();
  return db;
};

test('a reader keeps its snapshot while a writer commits: repeatable reads, and nobody waits', () => {
  const db = seeded({ x: 1 });
  const reader = db.begin();
  const writer = db.begin();
  writer.set('x', 2);
  writer.commit();
  expect(reader.get('x')).toBe(1); // the old version is still there
  expect(db.begin().get('x')).toBe(2); // a new transaction sees the new one
});

test('uncommitted writes are invisible to others: no dirty reads', () => {
  const db = seeded({ x: 1 });
  const writer = db.begin();
  writer.set('x', 99);
  expect(db.begin().get('x')).toBe(1);
  expect(writer.get('x')).toBe(99); // but you see your own
});

test('lost update is prevented: two transactions add 50 to the same balance, the second to commit fails and must retry', () => {
  const db = seeded({ balance: 100 });
  const a = db.begin();
  const b = db.begin();
  a.set('balance', a.get('balance') + 50);
  b.set('balance', b.get('balance') + 50);
  a.commit();
  expect(() => b.commit()).toThrow('write conflict on balance');
  const retry = db.begin();
  retry.set('balance', retry.get('balance') + 50);
  retry.commit();
  expect(db.begin().get('balance')).toBe(200);
});

test('write skew still happens: two transactions each take a different doctor off call, and both commit', () => {
  const db = seeded({ alice: true, bob: true });
  const onCall = (t) => ['alice', 'bob'].filter((d) => t.get(d)).length;
  const t1 = db.begin();
  const t2 = db.begin();
  expect(onCall(t1)).toBe(2); // each sees two doctors, so each thinks leaving is fine
  expect(onCall(t2)).toBe(2);
  t1.set('alice', false);
  t2.set('bob', false);
  t1.commit();
  t2.commit(); // different keys, so no write conflict
  expect(onCall(db.begin())).toBe(0); // the rule "at least one on call" is broken
});

test('making both transactions write one shared row turns write skew into a conflict', () => {
  const db = seeded({ alice: true, bob: true, roster: 0 });
  const t1 = db.begin();
  const t2 = db.begin();
  t1.set('alice', false);
  t1.set('roster', t1.get('roster') + 1);
  t2.set('bob', false);
  t2.set('roster', t2.get('roster') + 1);
  t1.commit();
  expect(() => t2.commit()).toThrow('write conflict on roster');
});

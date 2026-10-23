import { test, expect } from 'vitest';
import { Batcher } from './batcher.js';

test('flushes as soon as a batch is full', async () => {
  const batches = [];
  const b = new Batcher({ send: async (x) => { batches.push(x.length); }, maxItems: 3, maxWaitMs: 10_000 });
  for (let i = 0; i < 7; i++) await b.add(i, 0);
  expect(batches).toEqual([3, 3]);
  expect(b.pending).toBe(1);
});

test('flushes a small batch once the oldest sample has waited maxWaitMs', async () => {
  const batches = [];
  const b = new Batcher({ send: async (x) => { batches.push(x); }, maxItems: 100, maxWaitMs: 1000 });
  await b.add('a', 0);
  await b.add('b', 400);
  expect(await b.tick(999)).toBe(false);
  expect(await b.tick(1000)).toBe(true);
  expect(batches).toEqual([['a', 'b']]);
});

test('a failed send keeps the data and backs off exponentially, then succeeds', async () => {
  let fails = 2;
  const got = [];
  const b = new Batcher({ send: async (x) => { if (fails-- > 0) throw new Error('down'); got.push(...x); }, maxItems: 2, retryBaseMs: 200 });
  await b.add('a', 0);
  await b.add('b', 0);                                  // full: first attempt fails, retry at 200
  expect(b.pending).toBe(2);
  expect(await b.tick(100)).toBe(false);                // too early
  expect(await b.tick(200)).toBe(false);                // second attempt fails, next retry at 200 + 400 = 600
  expect(await b.tick(500)).toBe(false);
  expect(await b.tick(600)).toBe(true);
  expect(got).toEqual(['a', 'b']);
  expect(b.pending).toBe(0);
});

test('when the backend stays down the buffer is bounded and the OLDEST samples are dropped', async () => {
  const b = new Batcher({ send: async () => { throw new Error('down'); }, maxItems: 1_000_000, maxWaitMs: 1e9, maxBuffer: 5 });
  for (let i = 0; i < 12; i++) await b.add(i, 0);
  expect(b.pending).toBe(5);
  expect(b.dropped).toBe(7);
  const sent = [];
  b.send = async (x) => { sent.push(...x); };
  await b.flush(0);
  expect(sent).toEqual([7, 8, 9, 10, 11]);             // the newest five survived
});

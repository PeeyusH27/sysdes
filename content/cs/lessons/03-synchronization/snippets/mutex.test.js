import { test, expect } from 'vitest';
import { Mutex } from './mutex.js';

const tick = () => new Promise((r) => setTimeout(r, 1));

async function increment(state, mutex) {
  const body = async () => {
    const seen = state.n; // read
    await tick(); // someone else can run here
    state.n = seen + 1; // write back a stale value
  };
  return mutex ? mutex.withLock(body) : body();
}

test('without a lock, two awaiting increments lose an update', async () => {
  const state = { n: 0 };
  await Promise.all([increment(state), increment(state)]);
  expect(state.n).toBe(1);
});

test('with the mutex, ten increments give ten', async () => {
  const state = { n: 0 };
  const m = new Mutex();
  await Promise.all(Array.from({ length: 10 }, () => increment(state, m)));
  expect(state.n).toBe(10);
});

test('the lock is released when the function throws', async () => {
  const m = new Mutex();
  await expect(m.withLock(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  expect(await m.withLock(async () => 'still usable')).toBe('still usable');
});

test('holders enter one at a time, in the order they asked', async () => {
  const m = new Mutex();
  const log = [];
  await Promise.all([1, 2, 3].map((id) => m.withLock(async () => { log.push(`in${id}`); await tick(); log.push(`out${id}`); })));
  expect(log).toEqual(['in1', 'out1', 'in2', 'out2', 'in3', 'out3']);
});

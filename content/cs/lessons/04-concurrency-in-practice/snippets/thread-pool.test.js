import { test, expect } from 'vitest';
import { Pool, poolSize } from './thread-pool.js';

const tick = (ms = 3) => new Promise((r) => setTimeout(r, ms));

test('sizing: CPU-bound work gets one worker per core; 90 ms waiting per 10 ms compute gets ten per core', () => {
  expect(poolSize(8, 0, 10)).toBe(8);
  expect(poolSize(8, 90, 10)).toBe(80);
});

test('never runs more than `size` tasks at once, and finishes them all', async () => {
  const pool = new Pool(2, 10);
  let running = 0;
  let peak = 0;
  const job = async () => {
    running += 1;
    peak = Math.max(peak, running);
    await tick();
    running -= 1;
    return 'ok';
  };
  const results = await Promise.all(Array.from({ length: 6 }, () => pool.submit(job)));
  expect(results).toEqual(Array(6).fill('ok'));
  expect(peak).toBe(2);
});

test('with 2 workers and room for 1 queued task, the fourth submit is rejected immediately', async () => {
  const pool = new Pool(2, 1);
  const slow = () => tick(10);
  const a = pool.submit(slow);
  const b = pool.submit(slow);
  const c = pool.submit(slow);
  await expect(pool.submit(slow)).rejects.toThrow('queue full');
  await Promise.all([a, b, c]);
  await expect(pool.submit(slow)).resolves.toBeUndefined();
});

test('a failing task rejects its own promise and does not stop the pool', async () => {
  const pool = new Pool(1, 5);
  const bad = pool.submit(async () => { throw new Error('boom'); });
  const good = pool.submit(async () => 42);
  await expect(bad).rejects.toThrow('boom');
  await expect(good).resolves.toBe(42);
});

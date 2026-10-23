import { test, expect } from 'vitest';
import { Semaphore } from './semaphore.js';

const tick = () => new Promise((r) => setTimeout(r, 2));

test('six tasks through a semaphore of 2 never run more than 2 at once', async () => {
  const sem = new Semaphore(2);
  let running = 0;
  let peak = 0;
  const task = async () => {
    await sem.acquire();
    running += 1;
    peak = Math.max(peak, running);
    await tick();
    running -= 1;
    sem.release();
  };
  await Promise.all(Array.from({ length: 6 }, task));
  expect(peak).toBe(2);
  expect(running).toBe(0);
});

test('the third acquire waits until someone releases', async () => {
  const sem = new Semaphore(2);
  await sem.acquire();
  await sem.acquire();
  let got = false;
  const third = sem.acquire().then(() => { got = true; });
  await tick();
  expect(got).toBe(false);
  sem.release();
  await third;
  expect(got).toBe(true);
});

import { expect, test } from 'vitest';
import { bulkhead } from './bulkhead.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

test('never runs more than `limit` calls at once, even as slots are handed over', async () => {
  const run = bulkhead(2);
  let running = 0, peak = 0;
  const task = async () => {
    running++;
    peak = Math.max(peak, running);
    await tick();
    running--;
  };
  await Promise.all(Array.from({ length: 10 }, () => run(task)));
  expect(peak).toBe(2);
});

test('a newcomer cannot grab a slot that is being handed to a waiter', async () => {
  const run = bulkhead(1);
  let running = 0, peak = 0;
  const enter = () => { running++; peak = Math.max(peak, running); };
  const task = async () => { enter(); await tick(); running--; };

  let finishA;
  const pA = new Promise((r) => { finishA = r; });
  const a = run(() => { enter(); return pA; });
  const b = run(task);                                    // queued behind a
  let c;
  // This callback runs right after a's slot is released but before b resumes:
  // the exact moment a naive "active--, then wake a waiter" bulkhead lets c sneak in.
  pA.then(() => { running--; c = run(task); });
  finishA();
  await a;
  await b;
  await c;
  expect(peak).toBe(1);
});

test('rejects immediately when the waiting queue is full', async () => {
  const run = bulkhead(1, 1);
  let release;
  const slow = () => new Promise((r) => { release = r; });
  const first = run(slow);
  const second = run(async () => 'queued');
  await expect(run(async () => 'third')).rejects.toThrow('bulkhead full');
  release('done');
  expect(await first).toBe('done');
  expect(await second).toBe('queued');
});

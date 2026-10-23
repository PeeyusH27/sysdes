import { test, expect } from 'vitest';
import { blockLoop, order } from './event-loop.js';

test('sync code first, then promise callbacks, then the timer, even a 0 ms one', async () => {
  expect(await order()).toEqual(['sync', 'promise', 'microtask', 'timer']);
});

test('a 0 ms timer is late by however long the loop was blocked', async () => {
  const start = Date.now();
  const late = new Promise((resolve) => setTimeout(() => resolve(Date.now() - start), 0));
  blockLoop(40);
  expect(await late).toBeGreaterThanOrEqual(39);
});

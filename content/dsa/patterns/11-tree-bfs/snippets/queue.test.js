import { expect, test } from 'vitest';
import { Queue } from './queue.js';

test('first in, first out', () => {
  const q = new Queue();
  q.push(1);
  q.push(2);
  q.push(3);
  expect(q.shift()).toBe(1);
  q.push(4);
  expect([q.shift(), q.shift(), q.shift()]).toEqual([2, 3, 4]);
  expect(q.shift()).toBeUndefined();
  expect(q.size).toBe(0);
});

test('stays correct across compaction', () => {
  const q = new Queue();
  const out = [];
  for (let i = 0; i < 5000; i++) {
    q.push(i);
    q.push(i);
    out.push(q.shift());
  }
  expect(q.size).toBe(5000);
  expect(out.slice(0, 4)).toEqual([0, 0, 1, 1]);
  expect(q.shift()).toBe(2500);
});

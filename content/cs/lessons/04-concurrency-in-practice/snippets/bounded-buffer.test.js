import { test, expect } from 'vitest';
import { BoundedQueue } from './bounded-buffer.js';

const tick = () => new Promise((r) => setTimeout(r, 2));

test('items come out in the order they went in', async () => {
  const q = new BoundedQueue(3);
  await q.put(1);
  await q.put(2);
  expect([await q.take(), await q.take()]).toEqual([1, 2]);
});

test('a full buffer blocks the producer until a consumer takes something', async () => {
  const q = new BoundedQueue(2);
  await q.put('a');
  await q.put('b');
  let thirdAccepted = false;
  const third = q.put('c').then(() => { thirdAccepted = true; });
  await tick();
  expect(thirdAccepted).toBe(false); // backpressure
  expect(await q.take()).toBe('a');
  await third;
  expect(thirdAccepted).toBe(true);
  expect([await q.take(), await q.take()]).toEqual(['b', 'c']);
});

test('an empty buffer makes the consumer wait for the next put', async () => {
  const q = new BoundedQueue(1);
  const got = q.take();
  await tick();
  await q.put('late');
  expect(await got).toBe('late');
});

test('3 producers and 2 consumers move 30 items with nothing lost or duplicated', async () => {
  const q = new BoundedQueue(2);
  const seen = [];
  const producers = [0, 1, 2].map(async (p) => { for (let i = 0; i < 10; i++) await q.put(p * 100 + i); });
  const consumers = [0, 1].map(async () => { for (let i = 0; i < 15; i++) seen.push(await q.take()); });
  await Promise.all([...producers, ...consumers]);
  expect(seen).toHaveLength(30);
  expect(new Set(seen).size).toBe(30);
});

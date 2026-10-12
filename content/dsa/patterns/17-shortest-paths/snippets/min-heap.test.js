import { expect, test } from 'vitest';
import { MinHeap } from './min-heap.js';

test('pops [priority, data] pairs in priority order', () => {
  const heap = new MinHeap();
  for (const pair of [[5, 'e'], [1, 'a'], [4, 'd'], [2, 'b'], [3, 'c'], [1, 'z']]) heap.push(pair);
  expect(heap.size).toBe(6);
  expect(heap.peek()[0]).toBe(1);
  const out = [];
  while (heap.size > 0) out.push(heap.pop()[0]);
  expect(out).toEqual([1, 1, 2, 3, 4, 5]);
});

test('sorts many random numbers with a custom comparator', () => {
  const heap = new MinHeap((a, b) => a - b);
  const values = Array.from({ length: 200 }, (_, i) => (i * 7919) % 211);
  values.forEach((v) => heap.push(v));
  const out = [];
  while (heap.size > 0) out.push(heap.pop());
  expect(out).toEqual([...values].sort((a, b) => a - b));
});

test('a max-heap is the same class with the comparator flipped', () => {
  const heap = new MinHeap((a, b) => b - a);
  [3, 9, 1, 7].forEach((v) => heap.push(v));
  expect(heap.pop()).toBe(9);
  expect(heap.pop()).toBe(7);
});

test('pop on an empty heap returns undefined', () => {
  const heap = new MinHeap();
  expect(heap.pop()).toBeUndefined();
  heap.push([0, 'x']);
  expect(heap.pop()).toEqual([0, 'x']);
  expect(heap.size).toBe(0);
});

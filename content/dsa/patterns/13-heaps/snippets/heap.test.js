import { expect, test } from 'vitest';
import { Heap } from './heap.js';

const drain = (heap) => {
  const out = [];
  while (heap.size() > 0) out.push(heap.pop());
  return out;
};

test('min-heap pops values in ascending order', () => {
  const heap = new Heap();
  for (const x of [5, 3, 8, 1, 4, 1, -2]) heap.push(x);
  expect(heap.size()).toBe(7);
  expect(heap.peek()).toBe(-2);
  expect(drain(heap)).toEqual([-2, 1, 1, 3, 4, 5, 8]);
});

test('a reversed comparator makes a max-heap', () => {
  const heap = new Heap((a, b) => b - a);
  for (const x of [5, 3, 8, 1, 4]) heap.push(x);
  expect(drain(heap)).toEqual([8, 5, 4, 3, 1]);
});

test('orders pairs by a key', () => {
  const heap = new Heap((a, b) => a[1] - b[1]);
  heap.push(['x', 3]);
  heap.push(['y', 1]);
  heap.push(['z', 2]);
  expect(drain(heap).map(([name]) => name)).toEqual(['y', 'z', 'x']);
});

test('empty heap: peek and pop return undefined', () => {
  const heap = new Heap();
  expect(heap.peek()).toBeUndefined();
  expect(heap.pop()).toBeUndefined();
  heap.push(7);
  expect(heap.pop()).toBe(7);
  expect(heap.size()).toBe(0);
});

test('agrees with sorting on random input', () => {
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) % 1000;
  const values = Array.from({ length: 300 }, rand);
  const heap = new Heap();
  values.forEach((v) => heap.push(v));
  expect(drain(heap)).toEqual([...values].sort((a, b) => a - b));
});

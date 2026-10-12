import { expect, test } from 'vitest';
import { MinHeap, minRooms } from './rooms-heap.js';

test('the heap pops in ascending order', () => {
  const h = new MinHeap();
  [5, 3, 8, 1, 9, 2].forEach((x) => h.push(x));
  const out = [];
  while (h.size) out.push(h.pop());
  expect(out).toEqual([1, 2, 3, 5, 8, 9]);
});

test('counts rooms like the sweep line does', () => {
  expect(minRooms([[2, 7], [0, 5], [6, 9], [1, 3], [4, 6]])).toBe(3);
  expect(minRooms([[1, 5], [5, 10], [10, 15]])).toBe(1);
  expect(minRooms([[1, 10], [2, 3], [4, 5]])).toBe(2);
  expect(minRooms([])).toBe(0);
});

import { expect, test } from 'vitest';
import { fromArray, toArray } from './list.js';
import { reverseList } from './reverse.js';

test('reverses lists of every length', () => {
  expect(toArray(reverseList(fromArray([1, 2, 3, 4, 5])))).toEqual([5, 4, 3, 2, 1]);
  expect(toArray(reverseList(fromArray([1, 2])))).toEqual([2, 1]);
  expect(toArray(reverseList(fromArray([7])))).toEqual([7]);
  expect(reverseList(null)).toBe(null);
});

test('reuses the original nodes', () => {
  const head = fromArray([1, 2, 3]);
  const tail = head.next.next;
  expect(reverseList(head)).toBe(tail);
  expect(head.next).toBe(null);
});

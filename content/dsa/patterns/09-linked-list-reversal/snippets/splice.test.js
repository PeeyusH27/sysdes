import { expect, test } from 'vitest';
import { fromArray, ListNode, toArray } from './list.js';
import { reverseAfter, swapPairs } from './splice.js';

test('reverseAfter reverses a middle segment and returns its new tail', () => {
  const dummy = new ListNode(0, fromArray([1, 2, 3, 4, 5, 6]));
  const tail = reverseAfter(dummy.next.next, 3);
  expect(toArray(dummy.next)).toEqual([1, 2, 5, 4, 3, 6]);
  expect(tail.val).toBe(3);
});

test('reverseAfter on the dummy changes the head', () => {
  const dummy = new ListNode(0, fromArray([1, 2, 3, 4]));
  reverseAfter(dummy, 4);
  expect(toArray(dummy.next)).toEqual([4, 3, 2, 1]);
});

test('swapPairs reverses groups of two and leaves an odd node alone', () => {
  expect(toArray(swapPairs(fromArray([1, 2, 3, 4, 5])))).toEqual([2, 1, 4, 3, 5]);
  expect(toArray(swapPairs(fromArray([1, 2, 3, 4])))).toEqual([2, 1, 4, 3]);
  expect(toArray(swapPairs(fromArray([1])))).toEqual([1]);
  expect(swapPairs(null)).toBe(null);
});

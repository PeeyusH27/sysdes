import { expect, test } from 'vitest';
import { MinMaxStack } from './min-max-stack.js';

test('min and max track the current contents', () => {
  const s = new MinMaxStack();
  s.push(3);
  s.push(5);
  s.push(2);
  expect([s.getMin(), s.getMax()]).toEqual([2, 5]);
  expect(s.pop()).toBe(2);
  expect([s.getMin(), s.getMax(), s.top()]).toEqual([3, 5, 5]);
});

test('duplicates of the extreme value survive a pop', () => {
  const s = new MinMaxStack();
  [2, 1, 1].forEach((v) => s.push(v));
  s.pop();
  expect(s.getMin()).toBe(1);
  s.pop();
  expect(s.getMin()).toBe(2);
});

test('a single value is both min and max', () => {
  const s = new MinMaxStack();
  s.push(-7);
  expect([s.getMin(), s.getMax(), s.top()]).toEqual([-7, -7, -7]);
});

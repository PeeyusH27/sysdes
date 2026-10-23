import { expect, test } from 'vitest';
import { RandomizedSet } from './randomized-set.js';

test('insert and remove report whether anything changed', () => {
  const s = new RandomizedSet();
  expect(s.insert(1)).toBe(true);
  expect(s.insert(1)).toBe(false);
  expect(s.remove(2)).toBe(false);
  expect(s.insert(2)).toBe(true);
  expect(s.remove(1)).toBe(true);
  expect(s.getRandom()).toBe(2);
});

test('removing the last element, or a middle one, keeps the structure consistent', () => {
  const s = new RandomizedSet();
  [4, 5, 6, 7].forEach((v) => s.insert(v));
  expect(s.remove(7)).toBe(true); // last element
  expect(s.remove(4)).toBe(true); // middle: 6 moves into slot 0
  expect(s.remove(4)).toBe(false);
  expect([...s.items].sort()).toEqual([5, 6]);
  expect(s.index.get(6)).toBe(s.items.indexOf(6));
  expect(s.index.get(5)).toBe(s.items.indexOf(5));
});

test('getRandom returns members, and eventually every member', () => {
  const s = new RandomizedSet();
  [0, 1, 2].forEach((v) => s.insert(v)); // 0 is a falsy value on purpose
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(s.getRandom());
  expect([...seen].sort()).toEqual([0, 1, 2]);
});

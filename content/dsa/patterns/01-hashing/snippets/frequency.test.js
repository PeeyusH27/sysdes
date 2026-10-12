import { expect, test } from 'vitest';
import { canConstruct, countAll } from './frequency.js';

test('counts every value', () => {
  expect([...countAll('banana')]).toEqual([['b', 1], ['a', 3], ['n', 2]]);
  expect(countAll([]).size).toBe(0);
});

test('spends letters like a budget', () => {
  expect(canConstruct('noon', 'onion')).toBe(true);
  expect(canConstruct('tooth', 'photo')).toBe(false);
  expect(canConstruct('', 'abc')).toBe(true);
  expect(canConstruct('a', '')).toBe(false);
});

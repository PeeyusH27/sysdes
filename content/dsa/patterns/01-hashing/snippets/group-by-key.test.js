import { expect, test } from 'vitest';
import { groupBy } from './group-by-key.js';

test('groups by any computed key, keeping input order', () => {
  expect(groupBy(['ant', 'bee', 'goat', 'cat', 'deer'], (w) => w.length)).toEqual([['ant', 'bee', 'cat'], ['goat', 'deer']]);
  expect(groupBy([1, 2, 3, 4, 5, 6], (n) => n % 3)).toEqual([[1, 4], [2, 5], [3, 6]]);
});

test('a sorted-letters key groups anagrams', () => {
  const sorted = (w) => [...w].sort().join('');
  expect(groupBy(['tab', 'cat', 'bat', 'act'], sorted)).toEqual([['tab', 'bat'], ['cat', 'act']]);
  expect(groupBy([], sorted)).toEqual([]);
});

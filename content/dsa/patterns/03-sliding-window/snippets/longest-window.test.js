import { expect, test } from 'vitest';
import { longestAtMostKDistinct } from './longest-window.js';

test('longest substring with at most k distinct characters', () => {
  expect(longestAtMostKDistinct('abcbbca', 2)).toBe(5); // "bcbbc"
  expect(longestAtMostKDistinct('aabbb', 1)).toBe(3);
  expect(longestAtMostKDistinct('abcabc', 3)).toBe(6);
});

test('edge cases', () => {
  expect(longestAtMostKDistinct('', 2)).toBe(0);
  expect(longestAtMostKDistinct('abc', 0)).toBe(0);
  expect(longestAtMostKDistinct('zzzz', 1)).toBe(4);
});

import { expect, test } from 'vitest';
import { createWeightedPicker } from './smooth-weighted-rr.js';

test('weights 5/1/1 give a a b a c a a, then repeat', () => {
  const pick = createWeightedPicker([{ url: 'a', weight: 5 }, { url: 'b', weight: 1 }, { url: 'c', weight: 1 }]);
  expect(Array.from({ length: 7 }, () => pick()).join(' ')).toBe('a a b a c a a');
  expect(Array.from({ length: 7 }, () => pick()).join(' ')).toBe('a a b a c a a');
});

test('equal weights behave like plain round robin', () => {
  const pick = createWeightedPicker([{ url: 'a', weight: 1 }, { url: 'b', weight: 1 }, { url: 'c', weight: 1 }]);
  expect(Array.from({ length: 6 }, () => pick()).join(' ')).toBe('a b c a b c');
});

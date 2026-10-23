import { expect, test } from 'vitest';
import { price } from './ocp-before.js';

test('known kinds get their discount', () => {
  expect(price('regular', 2000)).toBe(2000);
  expect(price('gold', 2000)).toBe(1800);
  expect(price('employee', 2000)).toBe(1400);
});

test('a new kind falls through to the full price until the function is edited', () => {
  expect(price('student', 2000)).toBe(2000);
});

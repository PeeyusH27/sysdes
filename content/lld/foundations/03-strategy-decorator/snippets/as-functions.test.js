import { test, expect } from 'vitest';
import { hourly, capped, nightly, price } from './as-functions.js';

test('hourly charges every started hour', () => {
  expect(hourly(20)({ minutes: 61 })).toBe(40);
});

test('the composed price matches the class version: discount first, then cap', () => {
  expect(price({ minutes: 480, enterHour: 23 })).toBe(80);
  expect(price({ minutes: 480, enterHour: 12 })).toBe(100);
});

test('wrapping the other way round gives the other answer', () => {
  const other = nightly(capped(hourly(20), 100), 50);
  expect(other({ minutes: 480, enterHour: 23 })).toBe(50);
});

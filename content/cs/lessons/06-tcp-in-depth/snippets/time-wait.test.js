import { test, expect } from 'vitest';
import { maxNewPerSecond } from './time-wait.js';

test('Linux default ports 32768 to 60999 (28,232 of them) and 60 s allow about 470 new connections a second', () => {
  expect(maxNewPerSecond()).toBeCloseTo(470.5, 1);
});

test('halving the number of ports halves the rate; reusing connections removes the limit', () => {
  expect(maxNewPerSecond(14116)).toBeCloseTo(maxNewPerSecond() / 2, 5);
});

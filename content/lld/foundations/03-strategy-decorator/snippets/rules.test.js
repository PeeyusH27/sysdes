import { test, expect } from 'vitest';
import { HourlyRate } from './strategy.js';
import { GracePeriod, NightDiscount, Cap } from './rules.js';

const car = new HourlyRate(20);

test('grace period is inclusive: exactly 10 minutes is free, 11 is a full hour', () => {
  const grace = new GracePeriod(car, 10);
  expect(grace.fee({ minutes: 10 })).toBe(0);
  expect(grace.fee({ minutes: 11 })).toBe(20);
});

test('night discount depends on the hour of arrival: 22:00 to 05:59', () => {
  const night = new NightDiscount(car, 50);
  const at = (enterHour) => night.fee({ minutes: 120, enterHour });
  expect([at(21), at(22), at(23), at(5), at(6)]).toEqual([40, 20, 20, 20, 40]);
});

test('night discount rounds halves up', () => {
  expect(new NightDiscount(new HourlyRate(5), 50).fee({ minutes: 60, enterHour: 23 })).toBe(3); // 2.5 becomes 3
});

test('cap stops the fee at the maximum and leaves smaller fees alone', () => {
  const capped = new Cap(car, 100);
  expect(capped.fee({ minutes: 240 })).toBe(80);
  expect(capped.fee({ minutes: 300 })).toBe(100);
  expect(capped.fee({ minutes: 480 })).toBe(100);
});

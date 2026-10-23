import { test, expect } from 'vitest';
import { parkingFee } from './fee-before.js';

test('charges every started hour at the vehicle rate', () => {
  expect(parkingFee({ minutes: 61, enterHour: 12, vehicle: 'bike' })).toBe(20);
  expect(parkingFee({ minutes: 60, enterHour: 12, vehicle: 'car' })).toBe(20);
  expect(parkingFee({ minutes: 120, enterHour: 12, vehicle: 'truck' })).toBe(80);
});

test('grace period, night discount and cap are applied in the order the ifs appear', () => {
  expect(parkingFee({ minutes: 10, enterHour: 12, vehicle: 'car' })).toBe(0);
  expect(parkingFee({ minutes: 480, enterHour: 23, vehicle: 'car' })).toBe(80);  // 160, halved, under the cap
  expect(parkingFee({ minutes: 480, enterHour: 12, vehicle: 'car' })).toBe(100); // 160, capped
});

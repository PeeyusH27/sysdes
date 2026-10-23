import { test, expect } from 'vitest';
import { HourlyRate, FlatRate, Garage, ByVehicle } from './strategy.js';

test('hourly rate charges every started hour', () => {
  const car = new HourlyRate(20);
  expect(car.fee({ minutes: 0 })).toBe(0);
  expect(car.fee({ minutes: 60 })).toBe(20);
  expect(car.fee({ minutes: 61 })).toBe(40);
});

test('the garage uses whatever strategy it was given and can be switched', () => {
  const garage = new Garage(new HourlyRate(20));
  expect(garage.checkout({ minutes: 180 })).toBe(60);
  garage.switchTo(new FlatRate(50));
  expect(garage.checkout({ minutes: 180 })).toBe(50);
});

test('ByVehicle picks a strategy per vehicle and falls back for the rest', () => {
  const pricing = new ByVehicle({ bike: new HourlyRate(10) }, new HourlyRate(20));
  expect(pricing.fee({ vehicle: 'bike', minutes: 180 })).toBe(30);
  expect(pricing.fee({ vehicle: 'car', minutes: 180 })).toBe(60);
  expect(pricing.fee({ vehicle: 'scooter', minutes: 180 })).toBe(60);
});

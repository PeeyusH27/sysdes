import { expect, test } from 'vitest';
import { downtimeMinutes, downtimeMinutesPerYear, parallel, serial } from './availability.js';

test('serial dependencies multiply', () => {
  expect(serial(0.999, 0.999)).toBeCloseTo(0.998, 4);
  expect(serial(0.999, 0.999, 0.9995)).toBeCloseTo(0.9975, 4);
  expect(downtimeMinutesPerYear(serial(0.999, 0.999, 0.9995)) / 60).toBeCloseTo(22, 0);
  expect(serial(...Array(10).fill(0.999))).toBeCloseTo(0.99, 3);   // 10 services at 99.9% → 99%
});

test('redundant copies add nines', () => {
  expect(parallel(0.99, 0.99)).toBeCloseTo(0.9999, 10);
});

test('the nines table', () => {
  // per year (365.25 days)
  expect(downtimeMinutesPerYear(0.99) / 60 / 24).toBeCloseTo(3.65, 2);    // 3.65 days
  expect(downtimeMinutesPerYear(0.999) / 60).toBeCloseTo(8.77, 2);        // 8.77 h
  expect(downtimeMinutesPerYear(0.9999)).toBeCloseTo(52.6, 1);            // 52.6 min
  expect(downtimeMinutesPerYear(0.99999)).toBeCloseTo(5.26, 2);           // 5.26 min
  // per 30 days
  expect(downtimeMinutes(0.99, 30) / 60).toBeCloseTo(7.2, 6);             // 7.2 h
  expect(downtimeMinutes(0.999, 30)).toBeCloseTo(43.2, 6);                // 43.2 min
  expect(downtimeMinutes(0.9999, 30)).toBeCloseTo(4.32, 6);               // 4.32 min
  expect(downtimeMinutes(0.99999, 30) * 60).toBeCloseTo(25.9, 1);         // 25.9 s
  // per day
  expect(downtimeMinutes(0.99, 1)).toBeCloseTo(14.4, 6);                  // 14.4 min
  expect(downtimeMinutes(0.999, 1)).toBeCloseTo(1.44, 6);                 // 1.44 min
  expect(downtimeMinutes(0.9999, 1) * 60).toBeCloseTo(8.64, 6);           // 8.64 s
  expect(downtimeMinutes(0.99999, 1) * 60).toBeCloseTo(0.864, 6);         // 0.86 s
});

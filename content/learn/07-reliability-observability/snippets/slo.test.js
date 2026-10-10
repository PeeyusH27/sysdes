import { expect, test } from 'vitest';
import { budgetSpent, burnRate, errorBudget } from './slo.js';

test('error budget for a 99.9% SLO', () => {
  expect(errorBudget(0.999, 10_000_000)).toBe(10_000);
});

test('burn-rate alert thresholds', () => {
  expect(burnRate(0.0144, 0.999)).toBeCloseTo(14.4, 9);
  expect(burnRate(0.001, 0.999)).toBeCloseTo(1, 9);
  expect(budgetSpent(14.4, 1)).toBeCloseTo(0.02, 9);
  expect(budgetSpent(6, 6)).toBeCloseTo(0.05, 9);
  expect(budgetSpent(1, 72)).toBeCloseTo(0.1, 9);
  expect(budgetSpent(14.4, 50)).toBeCloseTo(1, 9);     // the whole budget in 50 hours
});

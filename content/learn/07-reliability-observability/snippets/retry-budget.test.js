import { expect, test } from 'vitest';
import { amplification, retryBudget } from './retry-budget.js';

test('retries stay near 10% of traffic during a full outage', () => {
  const budget = retryBudget();
  let retries = 0;
  for (let i = 0; i < 1000; i++) {
    budget.onRequest();
    if (budget.canRetry()) retries++;          // every call fails and wants one retry
  }
  expect(retries).toBe(109);                   // the 10-retry reserve, then 1 per 10 requests
});

test('a healthy service builds a reserve but never more than the cap', () => {
  const budget = retryBudget({ ratio: 0.1, reserve: 10 });
  for (let i = 0; i < 10_000; i++) budget.onRequest();
  let burst = 0;
  while (budget.canRetry()) burst++;
  expect(burst).toBe(10);
});

test('retry amplification across layers', () => {
  expect(amplification(3, 3)).toBe(27);
  expect(amplification(1, 3)).toBe(3);        // retry at one layer only
});

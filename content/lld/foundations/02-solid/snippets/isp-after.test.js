import { expect, test } from 'vitest';
import { Card, Cash, checkout, refundAll } from './isp-after.js';

test('checkout needs one role, so a one-method fake is enough', () => {
  expect(checkout(new Cash(), 100)).toBe('took 100 in cash');
  expect(checkout({ charge: (c) => `fake ${c}` }, 100)).toBe('fake 100');
});

test('refunds go only to things that can refund', () => {
  expect(refundAll([new Card()], 100)).toEqual(['sent 100 back to the card']);
});

test('cash simply has no refund, so it cannot be handed to refundAll by mistake', () => {
  expect(new Cash().refund).toBeUndefined();
  expect(new Cash().saveCard).toBeUndefined();
});

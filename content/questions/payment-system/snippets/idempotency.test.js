import { test, expect } from 'vitest';
import { IdempotencyStore, requestHash } from './idempotency.js';

const body = { orderId: 'ord_7', amount: 5000, currency: 'USD', paymentMethod: 'pm_tok_visa' };

test('first request claims the key; the same request afterwards replays the stored response', () => {
  const store = new IdempotencyStore();
  expect(store.begin('cus_1', 'k1', body)).toEqual({ kind: 'new' });
  store.finish('cus_1', 'k1', { status: 201, body: { id: 'pay_1', status: 'succeeded' } });
  expect(store.begin('cus_1', 'k1', { ...body })).toEqual({ kind: 'replay', status: 201, body: { id: 'pay_1', status: 'succeeded' } });
  expect(store.begin('cus_1', 'k1', body)).toEqual({ kind: 'replay', status: 201, body: { id: 'pay_1', status: 'succeeded' } });
});

test('a duplicate while the first is still running gets 409, not a second charge', () => {
  const store = new IdempotencyStore();
  expect(store.begin('cus_1', 'k1', body).kind).toBe('new');
  expect(store.begin('cus_1', 'k1', body)).toEqual({ kind: 'in_flight', status: 409 });
});

test('the same key with a different body is rejected with 422', () => {
  const store = new IdempotencyStore();
  store.begin('cus_1', 'k1', body);
  expect(store.begin('cus_1', 'k1', { ...body, amount: 6000 })).toEqual({ kind: 'mismatch', status: 422 });
  store.finish('cus_1', 'k1', { status: 201, body: { id: 'pay_1' } });
  expect(store.begin('cus_1', 'k1', { ...body, amount: 6000 }).kind).toBe('mismatch');
});

test('keys are scoped per customer, and key order in the body does not matter', () => {
  const store = new IdempotencyStore();
  expect(store.begin('cus_1', 'k1', body).kind).toBe('new');
  expect(store.begin('cus_2', 'k1', body).kind).toBe('new');
  const reordered = { paymentMethod: 'pm_tok_visa', currency: 'USD', amount: 5000, orderId: 'ord_7' };
  expect(requestHash(reordered)).toBe(requestHash(body));
  expect(requestHash({ ...body, amount: 5001 })).not.toBe(requestHash(body));
});

test('a declined payment is a final answer: retrying the key replays the decline', () => {
  const store = new IdempotencyStore();
  store.begin('cus_1', 'k1', body);
  store.finish('cus_1', 'k1', { status: 402, body: { error: 'card_declined' } });
  expect(store.begin('cus_1', 'k1', body)).toMatchObject({ kind: 'replay', status: 402 });
  expect(store.begin('cus_1', 'k2', body).kind).toBe('new'); // a new attempt needs a new key
});

test('abandon releases a key only while it is still started', () => {
  const store = new IdempotencyStore();
  store.begin('cus_1', 'k1', body);
  store.abandon('cus_1', 'k1');
  expect(store.begin('cus_1', 'k1', body).kind).toBe('new');
  store.finish('cus_1', 'k1', { status: 201, body: {} });
  store.abandon('cus_1', 'k1');
  expect(store.begin('cus_1', 'k1', body).kind).toBe('replay');
});

import { test, expect } from 'vitest';
import { TRANSITIONS, applyEvent, applyRefund, canTransition, transition } from './payment-state.js';

const pay = (status, extra = {}) => ({ id: 'pay_1', status, amount: 5000, refunded: 0, version: 0, ...extra });

test('the happy path and the timeout path are legal', () => {
  let p = pay('created');
  for (const to of ['processing', 'succeeded']) p = transition(p, to);
  expect(p).toMatchObject({ status: 'succeeded', version: 2 });

  let q = pay('created');
  for (const to of ['processing', 'unknown', 'succeeded']) q = transition(q, to);
  expect(q.status).toBe('succeeded');
});

test('illegal transitions throw', () => {
  expect(() => transition(pay('succeeded'), 'failed')).toThrow('Illegal transition succeeded → failed');
  expect(() => transition(pay('failed'), 'succeeded')).toThrow();
  expect(() => transition(pay('created'), 'succeeded')).toThrow(); // always processing first
  expect(() => transition(pay('refunded'), 'succeeded')).toThrow();
  expect(() => transition(pay('unknown'), 'processing')).toThrow();
});

test('final states have no way out', () => {
  for (const s of ['failed', 'canceled', 'refunded']) expect(TRANSITIONS[s]).toEqual([]);
  expect(canTransition('nonsense', 'succeeded')).toBe(false);
});

test('webhooks: duplicates and late, out-of-order events are ignored, not errors', () => {
  expect(applyEvent(pay('unknown'), 'succeeded')).toMatchObject({ applied: true, payment: { status: 'succeeded' } });
  expect(applyEvent(pay('succeeded'), 'succeeded')).toMatchObject({ applied: false, reason: 'already succeeded' });
  // the refund webhook won the race; the older "succeeded" event arrives afterwards
  const late = applyEvent(pay('refunded', { refunded: 5000 }), 'succeeded');
  expect(late.applied).toBe(false);
  expect(late.payment.status).toBe('refunded');
  // a failure event after success (a PSP bug or a forged event) can't undo a charge
  expect(applyEvent(pay('succeeded'), 'failed').applied).toBe(false);
});

test('partial refunds add up; the total can never exceed the charge', () => {
  let p = pay('succeeded');
  p = applyRefund(p, 2000);
  expect(p).toMatchObject({ status: 'partially_refunded', refunded: 2000 });
  p = applyRefund(p, 1000);
  expect(p).toMatchObject({ status: 'partially_refunded', refunded: 3000 });
  expect(() => applyRefund(p, 2001)).toThrow('exceeds the refundable 2000');
  p = applyRefund(p, 2000);
  expect(p).toMatchObject({ status: 'refunded', refunded: 5000 });
  expect(() => applyRefund(p, 1)).toThrow("Can't refund a refunded payment");
});

test('refunds need a settled charge and a positive integer amount', () => {
  expect(() => applyRefund(pay('processing'), 100)).toThrow("Can't refund a processing payment");
  expect(() => applyRefund(pay('unknown'), 100)).toThrow();
  expect(() => applyRefund(pay('succeeded'), 0)).toThrow('positive integer');
  expect(() => applyRefund(pay('succeeded'), 12.5)).toThrow('positive integer');
});

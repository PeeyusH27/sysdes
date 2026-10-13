import { test, expect } from 'vitest';
import { Ledger, chargeEntries, refundEntries, validate } from './ledger.js';

test('a $50.00 card payment: PSP fee $1.75, commission $5.00, merchant owed $45.00', () => {
  const entries = chargeEntries({ amount: 5000, merchantId: 'm_42' });
  expect(entries).toEqual([
    { account: 'cash_at_psp', amount: 4825, currency: 'USD' },
    { account: 'psp_fees', amount: 175, currency: 'USD' }, // 2.9% of 5000 = 145, plus 30
    { account: 'merchant_payable:m_42', amount: -4500, currency: 'USD' },
    { account: 'platform_revenue', amount: -500, currency: 'USD' },
  ]);
  expect(entries.reduce((s, e) => s + e.amount, 0)).toBe(0);
});

test('rounding never leaks a cent: every amount from 1¢ to $100 balances', () => {
  for (let amount = 1; amount <= 10_000; amount++) {
    const entries = chargeEntries({ amount, merchantId: 'm_1' });
    expect(entries.reduce((s, e) => s + e.amount, 0)).toBe(0);
  }
  // $19.99: fee round(57.971) + 30 = 88, commission round(199.9) = 200, merchant 1799
  expect(chargeEntries({ amount: 1999, merchantId: 'm_1' }).map((e) => e.amount)).toEqual([1911, 88, -1799, -200]);
});

test('rejects unbalanced, mixed-currency, fractional and one-sided transactions', () => {
  expect(() => validate([{ account: 'a', amount: 100, currency: 'USD' }, { account: 'b', amount: -99, currency: 'USD' }])).toThrow('Unbalanced');
  expect(() => validate([{ account: 'a', amount: 100, currency: 'USD' }, { account: 'b', amount: -100, currency: 'EUR' }])).toThrow('Mixed currencies');
  expect(() => validate([{ account: 'a', amount: 10.5, currency: 'USD' }, { account: 'b', amount: -10.5, currency: 'USD' }])).toThrow('integer');
  expect(() => validate([{ account: 'a', amount: 0, currency: 'USD' }, { account: 'b', amount: 0, currency: 'USD' }])).toThrow('non-zero');
  expect(() => validate([{ account: 'a', amount: 100, currency: 'USD' }])).toThrow('at least two');
});

test('a rejected transaction leaves no trace', () => {
  const ledger = new Ledger();
  expect(() => ledger.post({ id: 'bad', entries: [{ account: 'cash_at_psp', amount: 100, currency: 'USD' }, { account: 'psp_fees', amount: -1, currency: 'USD' }] })).toThrow();
  expect(ledger.entries).toEqual([]);
});

test('balances are derived from entries, and a refund is a new transaction', () => {
  const ledger = new Ledger();
  ledger.post({ id: 'pay_1:charge', entries: chargeEntries({ amount: 5000, merchantId: 'm_42' }) });
  expect(ledger.balance('cash_at_psp')).toBe(4825);
  expect(ledger.balance('merchant_payable:m_42')).toBe(-4500); // a credit balance: we owe the merchant $45
  expect(ledger.balance('platform_revenue')).toBe(-500);

  ledger.post({ id: 'rf_1:refund', entries: refundEntries({ amount: 2000, merchantId: 'm_42' }) });
  expect(ledger.balance('cash_at_psp')).toBe(2825);
  expect(ledger.balance('merchant_payable:m_42')).toBe(-2500);
  expect(ledger.entries).toHaveLength(6); // nothing was edited, two entries were added

  const trial = ledger.trialBalance().USD;
  expect(Object.values(trial).reduce((a, b) => a + b, 0)).toBe(0);
});

test('posting the same transaction twice is a no-op; reusing its id for other entries throws', () => {
  const ledger = new Ledger();
  const entries = chargeEntries({ amount: 5000, merchantId: 'm_42' });
  expect(ledger.post({ id: 'pay_1:charge', entries }).duplicate).toBe(false);
  expect(ledger.post({ id: 'pay_1:charge', entries }).duplicate).toBe(true); // a retried webhook
  expect(ledger.balance('cash_at_psp')).toBe(4825); // posted once
  expect(() => ledger.post({ id: 'pay_1:charge', entries: chargeEntries({ amount: 6000, merchantId: 'm_42' }) })).toThrow('different entries');
});

test('currencies never mix in a balance', () => {
  const ledger = new Ledger();
  ledger.post({ id: 'p1', entries: chargeEntries({ amount: 5000, merchantId: 'm_1' }) });
  ledger.post({ id: 'p2', entries: chargeEntries({ amount: 4000, currency: 'EUR', merchantId: 'm_1' }) });
  expect(ledger.balance('cash_at_psp', 'USD')).toBe(4825);
  expect(ledger.balance('cash_at_psp', 'EUR')).toBe(3854); // fee: round(116) + 30 = 146
  const trial = ledger.trialBalance();
  for (const cur of ['USD', 'EUR']) expect(Object.values(trial[cur]).reduce((a, b) => a + b, 0)).toBe(0);
});

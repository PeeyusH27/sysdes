import { test, expect } from 'vitest';
import { SPLITS } from './splits.js';
import { Ledger } from './ledger.js';
import { Group } from './group.js';

const trip = () => new Group(['ana', 'ben', 'cam', 'dee']);
const sum = xs => xs.reduce((a, b) => a + b, 0);

test('an equal split: the payer is owed everyone else\'s share', () => {
  const g = trip();
  expect(g.addExpense({ payer: 'ana', amount: 3000, type: 'equal', users: ['ana', 'ben', 'cam'] }).shares).toEqual({ ana: 1000, ben: 1000, cam: 1000 });
  expect(g.ledger.owes('ben', 'ana')).toBe(1000);
  expect(g.ledger.owes('ana', 'ben')).toBe(0);
  expect(g.ledger.balances()).toEqual({ ben: -1000, ana: 2000, cam: -1000 });
});

test('leftover cents go to the first participants, one each, in the order given', () => {
  expect(SPLITS.equal(1000, ['a', 'b', 'c'])).toEqual([334, 333, 333]);
  expect(SPLITS.equal(1001, ['a', 'b', 'c'])).toEqual([334, 334, 333]);
  expect(SPLITS.equal(1001, ['c', 'a', 'b'])).toEqual([334, 334, 333]);
});

test('exact: shares must add up to the amount', () => {
  expect(SPLITS.exact(2000, ['a', 'b'], [500, 1500])).toEqual([500, 1500]);
  expect(SPLITS.exact(2000, ['a', 'b'], [500, 1400])).toBeNull();
  expect(SPLITS.exact(2000, ['a', 'b'], [-100, 2100])).toBeNull();
});

test('percent: whole percents that add to 100, with the remainder rule', () => {
  expect(SPLITS.percent(1001, ['a', 'b', 'c'], [50, 30, 20])).toEqual([501, 300, 200]);
  expect(SPLITS.percent(1001, ['a', 'b'], [50, 40])).toBeNull();
  expect(SPLITS.percent(1000, ['a', 'b'], [100, 0])).toBeNull();
});

test('shares: proportional to the weights', () => {
  expect(SPLITS.shares(1001, ['a', 'b', 'c'], [2, 1, 1])).toEqual([501, 250, 250]);
  expect(SPLITS.shares(1000, ['a', 'b'], [1, 0])).toBeNull();
});

test('every split hands out exactly the amount, for 500 random bills', () => {
  let seed = 11;
  const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0; i < 500; i++) {
    const n = 1 + rnd(6), amount = 1 + rnd(100000);
    const users = Array.from({ length: n }, (_, k) => `u${k}`);
    expect(sum(SPLITS.equal(amount, users))).toBe(amount);
    expect(sum(SPLITS.shares(amount, users, users.map(() => 1 + rnd(5))))).toBe(amount);
  }
});

test('bad expenses are rejected and change nothing', () => {
  const g = trip();
  const bad = [
    { payer: 'zed', amount: 100, type: 'equal', users: ['ana'] },
    { payer: 'ana', amount: 100, type: 'equal', users: ['ana', 'zed'] },
    { payer: 'ana', amount: 100, type: 'equal', users: ['ana', 'ana'] },
    { payer: 'ana', amount: 100, type: 'equal', users: [] },
    { payer: 'ana', amount: 0, type: 'equal', users: ['ana'] },
    { payer: 'ana', amount: 10.5, type: 'equal', users: ['ana'] },
    { payer: 'ana', amount: 100, type: 'weird', users: ['ana'] },
    { payer: 'ana', amount: 100, type: 'exact', users: ['ana', 'ben'], data: [50, 49] },
  ];
  for (const e of bad) expect(g.addExpense(e).ok, JSON.stringify(e)).toBe(false);
  expect(g.expenses).toHaveLength(0);
  expect(g.ledger.balances()).toEqual({});
});

test('debts between a pair are netted both ways', () => {
  const g = trip();
  g.addExpense({ payer: 'ana', amount: 1000, type: 'equal', users: ['ana', 'ben'] });   // ben owes ana 500
  g.addExpense({ payer: 'ben', amount: 300, type: 'equal', users: ['ana', 'ben'] });    // ana owes ben 150
  expect(g.ledger.owes('ben', 'ana')).toBe(350);
  expect(g.ledger.owes('ana', 'ben')).toBe(0);
});

test('repeated expenses between the same pair add up', () => {
  const g = trip();
  for (let i = 0; i < 3; i++) g.addExpense({ payer: 'ana', amount: 1000, type: 'equal', users: ['ana', 'ben'] });
  expect(g.ledger.owes('ben', 'ana')).toBe(1500);
  g.addExpense({ payer: 'ben', amount: 4000, type: 'equal', users: ['ana', 'ben'] });   // ana owes ben 2000, which cancels 1500
  expect(g.ledger.owes('ana', 'ben')).toBe(500);
  expect(g.ledger.owes('ben', 'ana')).toBe(0);
});

test('settling reduces the debt, and never more than is owed', () => {
  const g = trip();
  g.addExpense({ payer: 'ana', amount: 1000, type: 'equal', users: ['ana', 'ben'] });
  expect(g.settleUp('ben', 'ana', 200).ok).toBe(true);
  expect(g.ledger.owes('ben', 'ana')).toBe(300);
  expect(g.settleUp('ben', 'ana', 400).ok).toBe(false);                                 // would overpay
  expect(g.settleUp('ana', 'ben', 1).ok).toBe(false);                                   // ana owes nothing
  expect(g.settleUp('ben', 'ana', 300).ok).toBe(true);
  expect(g.ledger.balances()).toEqual({ ben: 0, ana: 0 });
});

test('simplify: A owes B and B owes C becomes A pays C', () => {
  const g = trip();
  g.addExpense({ payer: 'ben', amount: 1000, type: 'exact', users: ['ana'], data: [1000] });   // ana owes ben 1000
  g.addExpense({ payer: 'cam', amount: 1000, type: 'exact', users: ['ben'], data: [1000] });   // ben owes cam 1000
  expect(g.ledger.simplify()).toEqual([['ana', 'cam', 1000]]);
});

test('simplify: ties break by name', () => {
  const g = trip();
  g.addExpense({ payer: 'dee', amount: 4000, type: 'equal', users: ['ana', 'ben', 'cam', 'dee'] });
  expect(g.ledger.simplify()).toEqual([['ana', 'dee', 1000], ['ben', 'dee', 1000], ['cam', 'dee', 1000]]);
});

test('simplify: a messy trip settles to zero in at most n - 1 transfers', () => {
  const g = new Group(['ana', 'ben', 'cam', 'dee', 'eve']);
  g.addExpense({ payer: 'ana', amount: 4500, type: 'equal', users: ['ana', 'ben', 'cam'] });
  g.addExpense({ payer: 'ben', amount: 1200, type: 'exact', users: ['cam', 'dee'], data: [700, 500] });
  g.addExpense({ payer: 'cam', amount: 3333, type: 'percent', users: ['ana', 'ben', 'cam', 'dee'], data: [10, 20, 30, 40] });
  g.addExpense({ payer: 'eve', amount: 999, type: 'equal', users: ['ana', 'ben', 'cam', 'dee', 'eve'] });
  const net = g.ledger.balances();
  expect(sum(Object.values(net))).toBe(0);
  const plan = g.ledger.simplify();
  for (const [from, to, cents] of plan) { net[from] += cents; net[to] -= cents; }
  expect(Object.values(net).every(v => v === 0)).toBe(true);
  expect(plan.length).toBeLessThanOrEqual(4);
});

test('listeners hear about expenses and settlements', () => {
  const g = trip();
  const seen = [];
  g.on(e => seen.push(e.type));
  g.addExpense({ payer: 'ana', amount: 100, type: 'equal', users: ['ana', 'ben'] });
  g.addExpense({ payer: 'ana', amount: 0, type: 'equal', users: ['ana'] });
  g.settleUp('ben', 'ana', 50);
  expect(seen).toEqual(['expense', 'settled']);
});

import { test, expect } from 'vitest';
import { Account } from './models.js';
import { buildChain } from './dispenser.js';
import { STATES } from './states.js';
import { Atm } from './atm.js';

const make = (over = {}) => new Atm({
  accounts: [new Account('ann', '1234', 500), new Account('bob', '9999', 40)],
  stock: { 100: 5, 50: 5, 20: 5, 10: 5 },
  ...over,
});
const login = (atm, id = 'ann', pin = '1234') => { atm.insertCard(id); atm.enterPin(pin); return atm; };
const snapshot = atm => JSON.stringify({ s: atm.state, card: atm.card?.id, stock: atm.stock, bal: [...atm.accounts.values()].map(a => a.balance) });

test('a normal session: card, PIN, withdraw 130, eject', () => {
  const atm = login(make());
  const r = atm.withdraw(130);
  expect(r).toMatchObject({ ok: true, notes: { 100: 1, 20: 1, 10: 1 }, balance: 370 });
  expect(atm.stock).toEqual({ 100: 4, 50: 5, 20: 4, 10: 4 });
  expect(atm.eject().state).toBe('idle');
});

test('every event a state does not list is rejected and changes nothing', () => {
  const events = ['insertCard', 'enterPin', 'withdraw', 'balance', 'eject'];
  const reach = { idle: a => a, cardIn: a => (a.insertCard('ann'), a), authenticated: a => login(a) };
  for (const [state, table] of Object.entries(STATES)) {
    for (const e of events.filter(e => !table[e])) {
      const atm = reach[state](make());
      const before = snapshot(atm);
      expect(atm.send(e, { id: 'ann', pin: '1234', amount: 10 }).ok, `${state}.${e}`).toBe(false);
      expect(snapshot(atm), `${state}.${e}`).toBe(before);
    }
  }
});

test('three wrong PINs lock the account and keep the card', () => {
  const atm = make();
  atm.insertCard('ann');
  expect(atm.enterPin('0000')).toMatchObject({ ok: true, authenticated: false, attemptsLeft: 2 });
  expect(atm.enterPin('0001').attemptsLeft).toBe(1);
  expect(atm.enterPin('0002')).toMatchObject({ authenticated: false, retained: true, state: 'idle' });
  expect(atm.insertCard('ann')).toMatchObject({ ok: false, reason: 'card retained: account locked' });
  expect(atm.insertCard('bob').ok).toBe(true);                  // other cards are unaffected
});

test('a correct PIN resets the failure count', () => {
  const atm = make();
  atm.insertCard('ann'); atm.enterPin('0000'); atm.enterPin('1234'); atm.eject();
  atm.insertCard('ann');
  expect(atm.enterPin('0000').attemptsLeft).toBe(2);
});

test('insufficient funds: rejected, nothing debited, no notes leave', () => {
  const atm = login(make(), 'bob', '9999');
  const before = snapshot(atm);
  expect(atm.withdraw(50)).toEqual({ ok: false, reason: 'insufficient funds' });
  expect(snapshot(atm)).toBe(before);
});

test('limited notes: greedy would strand 10, the chain backtracks', () => {
  const stock = { 100: 0, 50: 1, 20: 3, 10: 0 };
  const greedy = (amount, s) => [100, 50, 20, 10].reduce((left, d) => left - Math.min(Math.floor(left / d), s[d]) * d, amount);
  expect(greedy(60, stock)).toBe(10);                            // 50 taken, 10 left over: stuck
  expect(buildChain([100, 50, 20, 10]).plan(60, stock)).toEqual({ 20: 3 });
  expect(login(make({ stock })).withdraw(60).notes).toEqual({ 20: 3 });
});

test('an amount the notes cannot make is rejected before any debit', () => {
  const atm = login(make({ stock: { 100: 0, 50: 3, 20: 0, 10: 0 } }));
  expect(atm.withdraw(70)).toEqual({ ok: false, reason: 'cannot dispense that amount' });
  expect(atm.balance().balance).toBe(500);
});

test('zero, negative, fractional and off-unit amounts are invalid', () => {
  const atm = login(make());
  for (const amount of [0, -20, 15, 12.5, 7]) expect(atm.withdraw(amount).reason, String(amount)).toBe('invalid amount');
  expect(atm.balance().balance).toBe(500);
});

test('a jammed cash unit refunds the debit and keeps the stock', () => {
  const atm = login(make({ hardware: { dispense: () => false } }));
  expect(atm.withdraw(100)).toEqual({ ok: false, reason: 'dispenser jam: nothing charged' });
  expect(atm.balance().balance).toBe(500);
  expect(atm.stock[100]).toBe(5);
});

test('a new note value is one more handler in the list', () => {
  const atm = login(make({ notes: [200, 100, 50, 20, 10], stock: { 200: 2, 100: 0, 50: 0, 20: 0, 10: 0 } }));
  expect(atm.withdraw(400).notes).toEqual({ 200: 2 });
});

test('listeners see accepted and rejected events', () => {
  const atm = make();
  const seen = [];
  atm.on(e => seen.push(`${e.type}:${e.ok}`));
  atm.withdraw(10);
  atm.insertCard('ann');
  expect(seen).toEqual(['withdraw:false', 'insertCard:true']);
});

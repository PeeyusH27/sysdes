import { SPLITS } from './splits.js';
import { Ledger } from './ledger.js';

export class Group {
  constructor(members) {
    this.members = new Set(members);
    this.ledger = new Ledger();
    this.expenses = [];
    this.listeners = [];
  }

  on(listener) { this.listeners.push(listener); }                 // observer: push notifications, activity feed

  // Validation first, so a bad expense never half-applies.
  addExpense({ payer, amount, type, users, data = [] }) {
    const split = SPLITS[type];
    const known = this.members.has(payer) && users.every(u => this.members.has(u));
    if (!split || !known || !users.length || new Set(users).size !== users.length) return { ok: false, reason: 'invalid participants' };
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid amount' };
    const shares = split(amount, users, data);
    if (!shares) return { ok: false, reason: `invalid ${type} split` };
    users.forEach((u, i) => this.ledger.add(u, payer, shares[i]));      // every participant owes the payer their share
    this.expenses.push({ payer, amount, type, shares });
    this.listeners.forEach(l => l({ type: 'expense', payer, amount, shares }));
    return { ok: true, shares: Object.fromEntries(users.map((u, i) => [u, shares[i]])) };
  }

  settleUp(from, to, cents) {
    if (!this.members.has(from) || !this.members.has(to) || !this.ledger.settle(from, to, cents)) return { ok: false, reason: 'nothing to settle' };
    this.listeners.forEach(l => l({ type: 'settled', from, to, cents }));
    return { ok: true };
  }
}

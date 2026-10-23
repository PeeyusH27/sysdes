import { NOTES } from './models.js';
import { buildChain } from './dispenser.js';
import { STATES } from './states.js';

export class Atm {
  // `hardware` is the cash unit: injected so a test can make it jam.
  constructor({ accounts, stock, notes = NOTES, hardware = { dispense: () => true } }) {
    this.accounts = new Map(accounts.map(a => [a.id, a]));
    this.stock = { ...stock };
    this.chain = buildChain(notes);
    this.unit = Math.min(...notes);
    this.hardware = hardware;
    this.state = 'idle';
    this.card = null;
    this.listeners = [];
  }

  on(listener) { this.listeners.push(listener); }          // observer: audit log, receipts, alerts

  insertCard(id) { return this.send('insertCard', { id }); }
  enterPin(pin) { return this.send('enterPin', { pin }); }
  withdraw(amount) { return this.send('withdraw', { amount }); }
  balance() { return this.send('balance'); }
  eject() { return this.send('eject'); }

  send(type, args = {}) {
    const handler = STATES[this.state][type];
    if (!handler) return this.#reject(type, `${type} not allowed in ${this.state}`);
    const result = handler(this, args);
    if (result.rejected) return this.#reject(type, result.rejected);
    this.state = result.next;
    const reply = { ok: true, state: this.state, ...result.data };
    this.listeners.forEach(l => l({ type, ...reply }));
    return reply;
  }

  #reject(type, reason) {
    this.listeners.forEach(l => l({ type, ok: false, reason }));
    return { ok: false, reason };
  }
}

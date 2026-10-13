import { EventEmitter } from 'node:events';
import { COINS, sum, Inventory, CoinBox } from './models.js';
import { STATES } from './states.js';

export class VendingMachine extends EventEmitter {
  constructor({ slots, coins = {} }) {
    super();
    this.inventory = new Inventory(slots);
    this.box = new CoinBox(coins);
    this.state = 'idle';
    this.escrow = [];             // the customer's coins: not the machine's money until the sale commits
    this.pending = null;          // { code, price, change } between "motor on" and the drop sensor
    this.queue = [];
    this.draining = false;
  }

  get credit() { return sum(this.escrow); }

  // Every input (coin mech, keypad, drop sensor, service key) is one event on one queue, handled in order.
  send(event) {
    this.queue.push(event);
    if (this.draining) return null;             // sent by a listener mid-transition: it runs next, not inside
    this.draining = true;
    let first = null;
    try {
      while (this.queue.length) {
        const result = this.#handle(this.queue.shift());
        first ??= result;
      }
    } finally {
      this.draining = false;
    }
    return first;
  }

  #handle(event) {
    const from = this.state;
    if (event.type === 'coin' && !COINS.includes(event.coin)) return this.#reject(event, 'coin not accepted');
    const handler = STATES[from][event.type];
    if (!handler) return this.#reject(event, `${event.type} not allowed in ${from}`);
    const next = handler(this, event);
    if (typeof next !== 'string') return this.#reject(event, next.rejected);
    this.state = next;
    this.emit('transition', { from, to: next, event: event.type });   // display, telemetry, persistence
    return { ok: true, state: next };
  }

  #reject(event, reason) {
    if (event.type === 'coin') this.emit('returned', [event.coin], 'refused');   // drops straight to the cup
    this.emit('rejected', { event: event.type, state: this.state, reason });
    return { ok: false, reason };
  }

  // Called by the state objects.
  refund(why) {
    const coins = this.escrow;
    this.escrow = [];
    this.emit('returned', coins, why);          // the same coins the customer inserted
  }

  commit() {
    const { code, price, change } = this.pending;
    this.box.add(this.escrow);                  // the escrow becomes the machine's money...
    this.box.remove(change);                    // ...and the reserved change leaves
    this.escrow = [];
    this.pending = null;
    this.inventory.take(code);                  // exactly once per sale
    this.emit('returned', change, 'change');
    this.emit('sale', { code, price });
  }
}

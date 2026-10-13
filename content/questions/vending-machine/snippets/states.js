import { sum } from './models.js';
import { makeChange } from './change.js';

const no = reason => ({ rejected: reason });
const admin = apply => (m, e) => { apply(m, e); return m.state; };
const restock = admin((m, { code, n }) => m.inventory.restock(code, n));
const refill = admin((m, { coins }) => m.box.add(coins));

// The State pattern as plain objects: each state lists the events it accepts and returns the next state.
// An event a state doesn't list is rejected and changes nothing, so every (state, event) pair has one outcome.
export const STATES = {
  idle: {
    coin: (m, { coin }) => { m.escrow.push(coin); return 'hasMoney'; },
    service: () => 'outOfService',
    restock,
    refill,
  },
  hasMoney: {
    coin: (m, { coin }) => { m.escrow.push(coin); return 'hasMoney'; },
    select: (m, { code }) => {
      const slot = m.inventory.get(code);
      if (!slot) return no(`No slot ${code}`);
      if (slot.soldOut) return no(`${code} is sold out`);              // keep the credit: pick another or cancel
      const credit = sum(m.escrow);
      if (credit < slot.price) return no(`Insert ${slot.price - credit}¢ more`);
      const change = makeChange(credit - slot.price, m.box.with(m.escrow));
      if (!change) { m.refund('exact change only'); return 'idle'; }   // never sell without paying change
      m.pending = { code, price: slot.price, change };                  // reserved: no coin or item moves yet
      return 'dispensing';
    },
    cancel: m => { m.refund('cancelled'); return 'idle'; },
    service: m => { m.refund('out of service'); return 'outOfService'; },
  },
  dispensing: {
    dropped: m => { m.commit(); return 'idle'; },                       // the drop sensor saw the item fall
    dropFailed: m => { m.pending = null; m.refund('nothing dropped'); return 'idle'; },
  },
  outOfService: {
    service: () => 'idle',
    restock,
    refill,
  },
};

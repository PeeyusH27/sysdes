// Money is integer cents everywhere: 0.1 + 0.2 is 0.30000000000000004 in floating point,
// and a cash box has to balance to the cent.
export const COINS = Object.freeze([100, 25, 10, 5]);                // accepted coins, largest first
export const sum = coins => coins.reduce((total, c) => total + c, 0);

export class Slot {
  constructor(code, product, price, count, capacity = 10) {
    Object.assign(this, { code, product, price, count, capacity });
  }
  get soldOut() { return this.count === 0; }                         // a property of one slot, not a machine state
}

export class Inventory {
  constructor(slots) { this.slots = new Map(slots.map(s => [s.code, s])); }
  get(code) { return this.slots.get(code); }
  take(code) {
    const slot = this.slots.get(code);
    if (!slot || slot.soldOut) throw new Error(`Nothing left in ${code}`);
    slot.count--;
  }
  restock(code, n) {
    const slot = this.slots.get(code);
    slot.count = Math.min(slot.capacity, slot.count + n);
  }
}

export class CoinBox {                                                // the change tubes
  constructor(counts = {}) { this.counts = Object.fromEntries(COINS.map(c => [c, counts[c] ?? 0])); }
  add(coins) { for (const c of coins) this.counts[c]++; }
  remove(coins) {
    const need = {};
    for (const c of coins) need[c] = (need[c] ?? 0) + 1;
    for (const c in need) if (this.counts[c] < need[c]) throw new Error(`Only ${this.counts[c]} × ${c}¢ left`);
    for (const c of coins) this.counts[c]--;                          // all or nothing
  }
  with(coins) {                                                       // counts as if `coins` were added
    const counts = { ...this.counts };
    for (const c of coins) counts[c]++;
    return counts;
  }
  total() { return COINS.reduce((t, c) => t + c * this.counts[c], 0); }
}

const COINS = new Set([5, 10, 25, 100]);

// Each phase is an object that decides what every event means. The machine just forwards events to it.
class IdleState {
  name = "IDLE";
  insert(m, cents) {
    if (!COINS.has(cents)) return "REJECTED";
    m.credit += cents;
    m.go(new HasMoneyState());
    return "OK";
  }
  select() {
    return "NO_MONEY";
  }
  cancel() {
    return 0;
  }
  service(m, on) {
    if (on) m.go(new OutOfServiceState());
    return 0;
  }
}

class HasMoneyState {
  name = "HAS_MONEY";
  insert(m, cents) {
    if (!COINS.has(cents)) return "REJECTED";
    m.credit += cents;
    return "OK";
  }
  select(m, slot) {
    const item = m.slots.get(slot);
    if (!item) return "INVALID_SLOT";
    if (item.qty === 0) return "SOLD_OUT";
    if (m.credit < item.price) return "INSUFFICIENT";
    item.qty--;
    m.lastChange = m.credit - item.price;
    m.credit = 0;
    m.go(new IdleState());
    return "DISPENSED";
  }
  cancel(m) {
    const refund = m.credit;
    m.credit = 0;
    m.go(new IdleState());
    return refund;
  }
  service(m, on) {
    if (!on) return 0;
    const refund = this.cancel(m); // money goes back first
    m.go(new OutOfServiceState());
    return refund;
  }
}

class OutOfServiceState {
  name = "OUT_OF_SERVICE";
  insert() {
    return "REJECTED";
  }
  select() {
    return "OUT_OF_SERVICE";
  }
  cancel() {
    return 0;
  }
  service(m, on) {
    if (!on) m.go(new IdleState());
    return 0;
  }
}

class VendingMachine {
  constructor(stock) {
    this.slots = new Map(Object.entries(stock).map(([slot, s]) => [slot, { price: s.price, qty: s.qty }]));
    this.credit = 0; // cents inserted and not yet spent or refunded
    this.lastChange = 0; // change paid out by the most recent DISPENSED
    this.current = new IdleState();
  }

  go(next) {
    this.current = next;
  }

  insert(cents) {
    return this.current.insert(this, cents);
  }
  select(slot) {
    return this.current.select(this, slot);
  }
  cancel() {
    return this.current.cancel(this);
  }
  service(on) {
    return this.current.service(this, on);
  }

  // Restocking is allowed in every phase and never changes it, so it does not need a state object.
  restock(slot, qty) {
    const item = this.slots.get(slot);
    if (!item || !Number.isInteger(qty) || qty < 1) return -1;
    item.qty += qty;
    return item.qty;
  }

  state() {
    return this.current.name;
  }
  balance() {
    return this.credit;
  }
  change() {
    return this.lastChange;
  }
  stock(slot) {
    return this.slots.get(slot)?.qty ?? -1;
  }
}

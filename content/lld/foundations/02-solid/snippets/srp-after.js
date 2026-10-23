// One reason to change each: what an order holds, what tax is, how it prints, where it is stored.
export class Order {
  items = [];
  add(name, cents, qty) { this.items.push({ name, cents, qty }); }
  subtotal() { return this.items.reduce((sum, i) => sum + i.cents * i.qty, 0); }
}

export const withTax = (cents, percent) => Math.floor((cents * (100 + percent) + 50) / 100);

export const receiptText = (order, totalCents) =>
  [...order.items.map((i) => `${i.qty} x ${i.name}`), `Total: ${(totalCents / 100).toFixed(2)}`].join('\n');

export class OrderStore {
  constructor(db) { this.db = db; }
  save(order, totalCents) { this.db.insert('orders', { items: order.items, total: totalCents }); }
}

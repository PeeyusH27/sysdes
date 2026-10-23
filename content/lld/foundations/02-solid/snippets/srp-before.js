// Three teams edit this class: finance (tax), marketing (receipt text), platform (storage).
export class Order {
  constructor(db) { this.db = db; this.items = []; }
  add(name, cents, qty) { this.items.push({ name, cents, qty }); }

  total() {
    const subtotal = this.items.reduce((sum, i) => sum + i.cents * i.qty, 0);
    return Math.floor((subtotal * 118 + 50) / 100); // 18% tax, rounded to the cent
  }

  receipt() {
    const lines = this.items.map((i) => `${i.qty} x ${i.name}`);
    return [...lines, `Total: ${(this.total() / 100).toFixed(2)}`].join('\n');
  }

  save() { this.db.insert('orders', { items: this.items, total: this.total() }); }
}

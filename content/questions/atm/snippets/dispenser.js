// Chain of Responsibility: each handler owns one note value, takes what it can, and hands the rest on.
export class NoteHandler {
  constructor(denom, next = null) { this.denom = denom; this.next = next; }

  // Notes that add up to exactly `amount`, as { note: count }, or null. Try the most notes first, then fewer:
  // taking 50 greedily when you owe 60 from one 50 and three 20s would strand the last 10.
  plan(amount, stock) {
    const most = Math.min(Math.floor(amount / this.denom), stock[this.denom] ?? 0);
    for (let n = most; n >= 0; n--) {
      const rest = amount - n * this.denom;
      const tail = this.next ? this.next.plan(rest, stock) : rest === 0 ? {} : null;
      if (tail) return n ? { [this.denom]: n, ...tail } : tail;
    }
    return null;
  }
}

// A new note value is one more handler in this list; no existing class changes.
export const buildChain = denoms => denoms.reduceRight((next, d) => new NoteHandler(d, next), null);

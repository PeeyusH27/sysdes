// Who owes whom, netted per pair: if Ben owes Ana 500 and Ana then owes Ben 150, the ledger holds one fact, Ben owes Ana 350.
export class Ledger {
  constructor() { this.owed = new Map(); }               // "from>to" -> cents; at most one direction per pair is non-zero

  owes(from, to) { return this.owed.get(`${from}>${to}`) ?? 0; }

  add(debtor, creditor, cents) {
    if (debtor === creditor || cents === 0) return;       // paying your own share creates no debt
    const net = this.owes(debtor, creditor) + cents - this.owes(creditor, debtor);   // positive: the debtor owes the creditor
    this.owed.set(`${creditor}>${debtor}`, Math.max(0, -net));
    this.owed.set(`${debtor}>${creditor}`, Math.max(0, net));
  }

  settle(from, to, cents) {
    if (!Number.isInteger(cents) || cents <= 0 || cents > this.owes(from, to)) return false;   // never pay more than is owed
    this.owed.set(`${from}>${to}`, this.owes(from, to) - cents);
    return true;
  }

  // Net per person: positive means the group owes them, negative means they owe the group. They always add up to 0.
  balances() {
    const net = {};
    for (const [key, cents] of this.owed) {
      const [from, to] = key.split('>');
      net[from] = (net[from] ?? 0) - cents;
      net[to] = (net[to] ?? 0) + cents;
    }
    return net;
  }

  // Greedy: the biggest debtor pays the biggest creditor. At most n - 1 transfers, because each one settles somebody.
  // The true minimum is NP-hard (it is a subset-sum problem), and for n people the greedy answer is never worse than n - 1.
  simplify() {
    const split = [[], []];
    for (const [who, n] of Object.entries(this.balances())) if (n) split[n < 0 ? 0 : 1].push([who, Math.abs(n)]);
    const [debtors, creditors] = split;
    const biggest = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);   // ties by name, so the result is repeatable
    const plan = [];
    while (debtors.length && creditors.length) {
      debtors.sort(biggest);
      creditors.sort(biggest);
      const pay = Math.min(debtors[0][1], creditors[0][1]);
      plan.push([debtors[0][0], creditors[0][0], pay]);
      debtors[0][1] -= pay;
      creditors[0][1] -= pay;
      if (!debtors[0][1]) debtors.shift();
      if (!creditors[0][1]) creditors.shift();
    }
    return plan;
  }
}

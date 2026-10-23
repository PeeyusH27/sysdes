const sum = xs => xs.reduce((a, b) => a + b, 0);
const whole = xs => xs.every(Number.isInteger);

// Strategy: a split type turns (amount, users, data) into one share per user, or null if the data is invalid.
// Floor each proportional share, then give the leftover cents one each to the first users in order.
function spread(amount, weights) {
  const total = sum(weights);
  const shares = weights.map(w => Math.floor((amount * w) / total));
  for (let i = 0, left = amount - sum(shares); left > 0; i++, left--) shares[i]++;
  return shares;
}

// Adding a split type is one new entry here. Nothing else changes.
const SPLITS = {
  equal: (amount, users) => spread(amount, users.map(() => 1)),
  exact: (amount, users, data) => (data.length === users.length && whole(data) && data.every(c => c >= 0) && sum(data) === amount ? data : null),
  percent: (amount, users, data) =>
    data.length === users.length && whole(data) && data.every(p => p >= 1) && sum(data) === 100 ? spread(amount, data) : null,
  shares: (amount, users, data) => (data.length === users.length && whole(data) && data.every(w => w >= 1) ? spread(amount, data) : null),
};

class Splitwise {
  constructor(members) {
    this.members = new Set(members);
    this.owed = new Map(); // "from>to" -> cents; only one direction per pair is non-zero
    this.count = 0;
  }

  #get(from, to) { return this.owed.get(`${from}>${to}`) ?? 0; }

  #add(debtor, creditor, cents) {
    if (debtor === creditor || cents === 0) return;
    const net = this.#get(debtor, creditor) + cents - this.#get(creditor, debtor); // positive: debtor owes creditor
    this.owed.set(`${debtor}>${creditor}`, Math.max(0, net));
    this.owed.set(`${creditor}>${debtor}`, Math.max(0, -net));
  }

  addExpense(payer, amount, type, users, data) {
    const split = Object.hasOwn(SPLITS, type) ? SPLITS[type] : null;
    if (!split) return 'INVALID';
    if (!this.members.has(payer) || users.length === 0 || new Set(users).size !== users.length) return 'INVALID';
    if (!users.every(u => this.members.has(u)) || !Number.isInteger(amount) || amount <= 0) return 'INVALID';
    const shares = split(amount, users, data);
    if (!shares) return 'INVALID'; // validate everything before the first write
    users.forEach((u, i) => this.#add(u, payer, shares[i]));
    this.count++;
    return 'OK';
  }

  settle(from, to, amount) {
    if (!this.members.has(from) || !this.members.has(to) || from === to) return 'INVALID';
    if (!Number.isInteger(amount) || amount <= 0 || amount > this.#get(from, to)) return 'INVALID';
    this.owed.set(`${from}>${to}`, this.#get(from, to) - amount);
    return 'OK';
  }

  owes(from, to) { return this.#get(from, to); }

  balance(user) {
    let net = 0;
    for (const [key, cents] of this.owed) {
      const [from, to] = key.split('>');
      if (from === user) net -= cents;
      if (to === user) net += cents;
    }
    return net;
  }

  simplify() {
    const debtors = [], creditors = [];
    for (const m of this.members) {
      const n = this.balance(m);
      if (n < 0) debtors.push([m, -n]);
      if (n > 0) creditors.push([m, n]);
    }
    const biggest = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
    const plan = [];
    while (debtors.length && creditors.length) {
      debtors.sort(biggest);
      creditors.sort(biggest);
      const pay = Math.min(debtors[0][1], creditors[0][1]);
      plan.push([debtors[0][0], creditors[0][0], pay]);
      debtors[0][1] -= pay;
      creditors[0][1] -= pay;
      if (debtors[0][1] === 0) debtors.shift();
      if (creditors[0][1] === 0) creditors.shift();
    }
    return plan;
  }

  expenseCount() { return this.count; }
}

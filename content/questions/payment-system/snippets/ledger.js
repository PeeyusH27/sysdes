// A tiny double-entry ledger. Amounts are integers in minor units (cents for USD):
// positive is a debit, negative is a credit, so a balanced transaction sums to exactly 0.
// Floats never touch money: 0.1 + 0.2 !== 0.3, and a ledger can't be off by a fraction of a cent.

/** Throws unless the entries form one valid transaction. */
export function validate(entries) {
  if (!Array.isArray(entries) || entries.length < 2) throw new Error('A transaction needs at least two entries');
  const currency = entries[0].currency;
  let sum = 0;
  for (const e of entries) {
    if (!e.account) throw new Error('Every entry needs an account');
    if (!Number.isSafeInteger(e.amount) || e.amount === 0) throw new Error(`Amount must be a non-zero integer in minor units, got ${e.amount}`);
    // One currency per transaction: an FX conversion is two transactions through an FX account.
    if (e.currency !== currency) throw new Error(`Mixed currencies in one transaction: ${currency} and ${e.currency}`);
    sum += e.amount;
  }
  if (sum !== 0) throw new Error(`Unbalanced transaction: entries sum to ${sum}`);
}

export class Ledger {
  #txs = new Map(); // id → transaction, e.g. 'pay_1:charge'
  #entries = []; // append-only: nothing is ever updated or deleted

  /** Post a transaction once. Re-posting the same id is a no-op; reusing an id for other entries is an error. */
  post({ id, entries, memo = '' }) {
    validate(entries);
    const seen = this.#txs.get(id);
    if (seen) {
      if (JSON.stringify(seen.entries) !== JSON.stringify(entries)) throw new Error(`Transaction ${id} was already posted with different entries`);
      return { ...seen, duplicate: true };
    }
    const tx = Object.freeze({ id, memo, entries: Object.freeze(entries.map((e) => Object.freeze({ ...e }))) });
    this.#txs.set(id, tx);
    for (const e of tx.entries) this.#entries.push({ txId: id, ...e });
    return { ...tx, duplicate: false };
  }

  /** Balances are derived from the entries, never stored as the source of truth. */
  balance(account, currency = 'USD') {
    let sum = 0;
    for (const e of this.#entries) if (e.account === account && e.currency === currency) sum += e.amount;
    return sum;
  }

  /** Every account's balance per currency: the trial balance, which must sum to 0 in each currency. */
  trialBalance() {
    const out = {};
    for (const e of this.#entries) {
      out[e.currency] ??= {};
      out[e.currency][e.account] = (out[e.currency][e.account] ?? 0) + e.amount;
    }
    return out;
  }

  get entries() {
    return this.#entries.map((e) => ({ ...e }));
  }
}

/**
 * The posting for one successful card payment on a marketplace. The PSP keeps its fee
 * (2.9% + 30¢ here) and the platform keeps a commission; the rest is owed to the merchant.
 * The merchant's share is the remainder, so rounding can never create or lose a cent.
 */
export function chargeEntries({ amount, currency = 'USD', merchantId, feeBps = 290, feeFixed = 30, commissionBps = 1000 }) {
  const fee = Math.round((amount * feeBps) / 10_000) + feeFixed;
  const commission = Math.round((amount * commissionBps) / 10_000);
  return [
    { account: 'cash_at_psp', amount: amount - fee, currency }, // asset: the PSP holds it until settlement
    { account: 'psp_fees', amount: fee, currency }, // expense
    { account: `merchant_payable:${merchantId}`, amount: -(amount - commission), currency }, // liability: we owe the merchant
    { account: 'platform_revenue', amount: -commission, currency }, // revenue
  ];
}

/** A refund the merchant pays for: the money goes back out of what we hold at the PSP. */
export function refundEntries({ amount, currency = 'USD', merchantId }) {
  return [
    { account: `merchant_payable:${merchantId}`, amount, currency },
    { account: 'cash_at_psp', amount: -amount, currency },
  ];
}

const NOTES = [100, 50, 20, 10];
const MAX_TRIES = 3;

// Chain of Responsibility: each handler owns one note value, takes what it can and hands the rest on.
class NoteHandler {
  constructor(note, next) { this.note = note; this.next = next; }

  // [[note, count], ...] largest first covering `amount` exactly, or null.
  // Most notes first, then fewer: a greedy 50 for 60 would strand 10 when only three 20s can finish it.
  plan(amount, stock) {
    const most = Math.min(Math.floor(amount / this.note), stock[this.note]);
    for (let n = most; n >= 0; n--) {
      const rest = amount - n * this.note;
      const tail = this.next ? this.next.plan(rest, stock) : rest === 0 ? [] : null;
      if (tail) return n > 0 ? [[this.note, n], ...tail] : tail;
    }
    return null;
  }
}

// State pattern as a table: a state lists the events it accepts. Anything else gets the caller's sentinel.
const TABLE = {
  IDLE: {
    insertCard(atm, id) {
      const account = atm.accounts.get(id);
      if (!account) return 'UNKNOWN_CARD';
      if (account.locked) return 'LOCKED';
      atm.card = account;
      atm.current = 'CARD_IN';
      return 'OK';
    },
  },
  CARD_IN: {
    enterPin(atm, pin) {
      const account = atm.card;
      if (pin === account.pin) { account.failed = 0; atm.current = 'AUTHENTICATED'; return 'OK'; }
      if (++account.failed < MAX_TRIES) return 'WRONG_PIN';
      account.locked = true;
      atm.card = null;
      atm.current = 'IDLE';
      return 'LOCKED';
    },
    eject: atm => atm.leave(),
  },
  AUTHENTICATED: {
    balance: atm => atm.card.balance,
    withdraw(atm, amount) {
      if (!Number.isInteger(amount) || amount <= 0 || amount % 10 !== 0) return 'INVALID_AMOUNT';
      const notes = atm.chain.plan(amount, atm.stock);
      if (!notes) return 'NO_EXACT_NOTES';
      if (atm.card.balance < amount) return 'INSUFFICIENT_FUNDS';
      if (atm.jammed) return 'JAM'; // the cash unit fails before anything is committed
      atm.card.balance -= amount;
      for (const [note, n] of notes) atm.stock[note] -= n;
      return notes;
    },
    eject: atm => atm.leave(),
  },
};

class Atm {
  constructor(accounts, stock) {
    this.accounts = new Map(accounts.map(([id, pin, balance]) => [id, { pin, balance, failed: 0, locked: false }]));
    this.stock = Object.fromEntries(NOTES.map((note, i) => [note, stock[i]]));
    this.chain = NOTES.reduceRight((next, note) => new NoteHandler(note, next), null);
    this.current = 'IDLE';
    this.card = null;
    this.jammed = false;
  }

  #on(event, invalid, ...args) {
    const handler = TABLE[this.current][event];
    return handler ? handler(this, ...args) : invalid;
  }

  leave() { this.card = null; this.current = 'IDLE'; return 'OK'; }

  insertCard(id) { return this.#on('insertCard', 'INVALID_STATE', id); }
  enterPin(pin) { return this.#on('enterPin', 'INVALID_STATE', pin); }
  balance() { return this.#on('balance', -1); }
  withdraw(amount) { return this.#on('withdraw', 'INVALID_STATE', amount); }
  eject() { return this.#on('eject', 'INVALID_STATE'); }
  state() { return this.current; }
  cash() { return NOTES.map(note => [note, this.stock[note]]); }
  jam(flag) { this.jammed = Boolean(flag); return true; }
}

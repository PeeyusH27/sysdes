const no = reason => ({ rejected: reason });
const to = (next, data = {}) => ({ next, data });

// The State pattern as plain objects: each state lists the events it accepts and returns the next state.
// An event a state does not list is rejected and changes nothing, so every (state, event) pair has one outcome.
export const STATES = {
  idle: {
    insertCard: (atm, { id }) => {
      const account = atm.accounts.get(id);
      if (!account) return no('unknown card');
      if (account.locked) return no('card retained: account locked');
      atm.card = account;
      return to('cardIn');
    },
  },
  cardIn: {
    enterPin: (atm, { pin }) => {
      const result = atm.card.tryPin(pin);
      if (result === 'ok') return to('authenticated', { authenticated: true });
      if (result === 'locked') { atm.card = null; return to('idle', { authenticated: false, retained: true }); }
      return to('cardIn', { authenticated: false, attemptsLeft: atm.card.attemptsLeft });
    },
    eject: atm => { atm.card = null; return to('idle'); },
  },
  authenticated: {
    balance: atm => to('authenticated', { balance: atm.card.balance }),
    withdraw: (atm, { amount }) => {
      if (!Number.isInteger(amount) || amount <= 0 || amount % atm.unit !== 0) return no('invalid amount');
      const notes = atm.chain.plan(amount, atm.stock);              // plan first: no plan, no debit
      if (!notes) return no('cannot dispense that amount');
      if (!atm.card.debit(amount)) return no('insufficient funds');
      if (!atm.hardware.dispense(notes)) { atm.card.credit(amount); return no('dispenser jam: nothing charged'); }
      for (const [note, n] of Object.entries(notes)) atm.stock[note] -= n;
      return to('authenticated', { notes, balance: atm.card.balance });
    },
    eject: atm => { atm.card = null; return to('idle'); },
  },
};

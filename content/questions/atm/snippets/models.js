export const NOTES = [100, 50, 20, 10];   // largest first; money is whole dollars in integers, never floats
export const MAX_PIN_TRIES = 3;

export class Account {
  constructor(id, pin, balance) {
    Object.assign(this, { id, pin, balance });
    this.failedPins = 0;                  // lives on the account, so two machines share one count
    this.locked = false;
  }

  get attemptsLeft() { return MAX_PIN_TRIES - this.failedPins; }

  tryPin(pin) {
    if (this.locked) return 'locked';
    if (pin === this.pin) { this.failedPins = 0; return 'ok'; }
    if (++this.failedPins >= MAX_PIN_TRIES) { this.locked = true; return 'locked'; }
    return 'wrong';
  }

  // Check and subtract in one step. In Java and Python this method holds the account's lock.
  debit(amount) {
    if (this.balance < amount) return false;
    this.balance -= amount;
    return true;
  }

  credit(amount) { this.balance += amount; }   // also the undo for a debit when the cash jams
}

// The clock is a parameter, so a test can move time instead of waiting for it.
export class RoomHolds {
  #until = new Map();
  #now;
  #holdMs;

  constructor(now = Date.now, holdMs = 10 * 60 * 1000) {
    this.#now = now;
    this.#holdMs = holdMs;
  }

  isHeld(room) {
    return (this.#until.get(room) ?? 0) > this.#now();
  }

  // A hold lasts until the exact instant start + holdMs; at that instant it is gone.
  hold(room) {
    if (this.isHeld(room)) return false;
    this.#until.set(room, this.#now() + this.#holdMs);
    return true;
  }
}

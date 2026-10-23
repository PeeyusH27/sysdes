const pause = () => new Promise((resolve) => setTimeout(resolve, 0)); // stands in for a payment or database call

// Check, then act, with a gap between them. Another caller can slip into the gap.
export class RoomsRacy {
  #owner = new Map();

  async book(room, who) {
    if (this.#owner.has(room)) return false; // check
    await pause();                           // anyone else may pass the same check now
    this.#owner.set(room, who);              // act: too late, the check is stale
    return true;
  }

  owner(room) { return this.#owner.get(room); }
}

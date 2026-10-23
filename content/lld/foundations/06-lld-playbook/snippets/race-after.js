const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

// Claim the room in the same synchronous step as the check, then do the slow work.
// JavaScript runs one step at a time, so nothing can run between the check and the claim.
export class Rooms {
  #owner = new Map();

  async book(room, who) {
    if (this.#owner.has(room)) return false;
    this.#owner.set(room, who); // check and act with no await between them
    await pause();              // the slow part; on failure, release the claim here
    return true;
  }

  owner(room) { return this.#owner.get(room); }
}

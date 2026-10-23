// Producer-consumer with a bounded buffer. A full buffer makes put() wait (backpressure);
// an empty one makes take() wait. Waiting hands the thread back instead of spinning.
export class BoundedQueue {
  #items = [];
  #takers = []; // consumers waiting for an item
  #putters = []; // producers waiting for room, with the item they hold

  constructor(capacity) {
    this.capacity = capacity;
  }

  async put(item) {
    if (this.#takers.length > 0) {
      this.#takers.shift()(item); // a consumer is already waiting: hand it over
      return;
    }
    if (this.#items.length < this.capacity) {
      this.#items.push(item);
      return;
    }
    await new Promise((resume) => this.#putters.push({ item, resume })); // full: wait for a take()
  }

  async take() {
    if (this.#items.length > 0) {
      const item = this.#items.shift();
      const waiting = this.#putters.shift();
      if (waiting) {
        this.#items.push(waiting.item); // room appeared: the oldest blocked producer goes in
        waiting.resume();
      }
      return item;
    }
    return new Promise((resolve) => this.#takers.push(resolve)); // empty: wait for a put()
  }
}

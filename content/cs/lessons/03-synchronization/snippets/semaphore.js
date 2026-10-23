// A counting semaphore: at most `n` holders at once. A mutex is the n = 1 case,
// except that any task may release a semaphore permit, not only the one that took it.
export class Semaphore {
  #permits;
  #waiters = [];

  constructor(n) {
    this.#permits = n;
  }

  async acquire() {
    if (this.#permits > 0) {
      this.#permits -= 1;
      return;
    }
    await new Promise((resolve) => this.#waiters.push(resolve)); // sleep until a release hands us a permit
  }

  release() {
    const next = this.#waiters.shift();
    if (next) next(); // hand the permit straight to the longest waiter
    else this.#permits += 1;
  }
}

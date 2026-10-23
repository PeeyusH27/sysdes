// A mutex for async code. JavaScript has one thread, but a race is still possible
// whenever you read a value, `await`, then write it back.
export class Mutex {
  #tail = Promise.resolve();

  // Resolves with a release function once every earlier holder has released.
  lock() {
    let release;
    const released = new Promise((resolve) => { release = resolve; });
    const ready = this.#tail.then(() => release);
    this.#tail = this.#tail.then(() => released);
    return ready;
  }

  async withLock(fn) {
    const release = await this.lock();
    try {
      return await fn();
    } finally {
      release(); // always unlock, even if fn throws
    }
  }
}

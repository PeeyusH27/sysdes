// How many workers? CPU-bound work: about one per core. Work that waits: more, in
// proportion to wait time over compute time.
export const poolSize = (cores, waitMs, computeMs) => Math.round(cores * (1 + waitMs / computeMs));

// A fixed number of workers pulling from a bounded queue. When both are full,
// reject at once instead of letting the queue (and memory) grow without limit.
export class Pool {
  #running = 0;
  #queue = [];

  constructor(size, maxQueue) {
    this.size = size;
    this.maxQueue = maxQueue;
  }

  submit(task) {
    return new Promise((resolve, reject) => {
      if (this.#running >= this.size && this.#queue.length >= this.maxQueue) {
        reject(new Error('rejected: queue full'));
        return;
      }
      this.#queue.push({ task, resolve, reject });
      this.#next();
    });
  }

  #next() {
    while (this.#running < this.size && this.#queue.length > 0) {
      const { task, resolve, reject } = this.#queue.shift();
      this.#running += 1;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.#running -= 1;
          this.#next();
        });
    }
  }
}

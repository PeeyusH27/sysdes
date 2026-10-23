export class Emitter {
  #listeners = new Set();  // a Set: subscribing the same function twice is still one subscription

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);  // hand back the way out, so callers cannot forget it
  }

  get size() { return this.#listeners.size; }

  emit(event) {
    const errors = [];
    for (const fn of [...this.#listeners]) {    // loop over a copy: listeners may unsubscribe while we run
      try { fn(event); } catch (err) { errors.push(err); }  // one bad listener must not silence the rest
    }
    return errors;
  }
}

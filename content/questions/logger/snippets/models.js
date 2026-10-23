export const Level = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
const nameOf = n => Object.keys(Level).find(k => Level[k] === n);

// Strategy: how a record becomes a line. A new format is a new function, and nothing else changes.
export const plain = r => `${r.time} ${nameOf(r.level)} ${r.logger} - ${r.message}`;
export const json = r => JSON.stringify({ time: r.time, level: nameOf(r.level), logger: r.logger, message: r.message });

// An appender is where lines go. The sink is a function, so a console, a file and a list all look alike.
export class Appender {
  constructor(sink, { threshold = Level.DEBUG, format = plain } = {}) {
    Object.assign(this, { sink, threshold, format });
  }

  append(record) {
    if (record.level < this.threshold) return false;   // each appender has its own bar
    this.sink(this.format(record));
    return true;
  }
}

// Decorator: wraps any appender so the caller never waits for slow I/O. The queue is bounded on purpose.
export class AsyncAppender {
  constructor(inner, { capacity = 1000 } = {}) {
    Object.assign(this, { inner, capacity });
    this.queue = [];
    this.dropped = 0;
  }

  append(record) {
    if (this.queue.length >= this.capacity) { this.dropped++; return false; }   // full: drop the newest, never block
    this.queue.push(record);
    if (this.queue.length === 1) queueMicrotask(() => this.flush());              // JavaScript's "worker thread"
    return true;
  }

  flush() { while (this.queue.length) this.inner.append(this.queue.shift()); }
}

// A toy database with a write-ahead log. `memory` is the buffer pool and is lost in a crash.
// `disk` holds data pages and is updated lazily. `log` is durable: appending to it is the fsync.
// A transaction counts as committed only when its commit marker is in the log.
export class Db {
  constructor() {
    this.disk = {};
    this.log = [];
    this.memory = {};
    this.nextTx = 1;
  }

  begin() {
    return { id: this.nextTx++, writes: [] }; // private until commit
  }

  set(tx, key, value) {
    tx.writes.push({ tx: tx.id, key, value });
  }

  // Log first, then memory. `tornAfter` simulates a crash while the log was being written.
  commit(tx, { tornAfter = null } = {}) {
    const records = tx.writes.slice(0, tornAfter ?? tx.writes.length);
    this.log.push(...records);
    if (tornAfter !== null) return this.crash(); // died before the commit marker was written
    this.log.push({ tx: tx.id, commit: true }); // <- the commit point
    for (const { key, value } of tx.writes) this.memory[key] = value; // data pages are only dirty in memory
  }

  // Flush every page and forget the log up to here: recovery will start from this point.
  checkpoint() {
    this.disk = { ...this.disk, ...this.memory };
    this.log = [];
  }

  crash() {
    this.memory = {}; // RAM is gone; disk and log survive
  }

  // Start from the data pages, then redo every transaction that has a commit marker.
  recover() {
    const committed = new Set(this.log.filter((r) => r.commit).map((r) => r.tx));
    this.memory = { ...this.disk };
    for (const r of this.log) if (!r.commit && committed.has(r.tx)) this.memory[r.key] = r.value;
  }

  get(key) {
    return this.memory[key];
  }
}

// Each commit waits for one fsync. Group commit lets many transactions share it.
export const commitsPerSecond = (fsyncMs, groupSize = 1) => (groupSize * 1000) / fsyncMs;

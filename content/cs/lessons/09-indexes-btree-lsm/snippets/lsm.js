// A tiny LSM-tree. Writes go to an in-memory table; when it fills, it is flushed as an immutable
// sorted run. Reads check memory, then runs from newest to oldest. Compaction merges the runs.
const TOMBSTONE = Symbol('deleted'); // a delete is a write too: it hides older versions

const find = (run, key) => {
  let lo = 0;
  let hi = run.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (run[mid][0] === key) return run[mid];
    if (run[mid][0] < key) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
};
const byKey = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);
const visible = (v) => (v === TOMBSTONE ? undefined : v);

export class Lsm {
  constructor(memtableLimit = 4) {
    this.limit = memtableLimit;
    this.mem = new Map();
    this.runs = []; // newest first, each a sorted array of [key, value]
    this.runsRead = 0; // how many runs reads had to look in: read amplification
  }

  put(key, value) {
    this.mem.set(key, value);
    if (this.mem.size >= this.limit) this.flush();
  }

  delete(key) {
    this.put(key, TOMBSTONE);
  }

  flush() {
    this.runs.unshift([...this.mem].sort(byKey)); // one sequential write
    this.mem = new Map();
  }

  get(key) {
    if (this.mem.has(key)) return visible(this.mem.get(key));
    for (const run of this.runs) {
      this.runsRead += 1;
      const hit = find(run, key);
      if (hit) return visible(hit[1]); // the newest version wins
    }
    return undefined;
  }

  compact() {
    const merged = new Map();
    for (const run of [...this.runs].reverse()) for (const [k, v] of run) merged.set(k, v); // newer overwrites older
    this.runs = [[...merged].filter(([, v]) => v !== TOMBSTONE).sort(byKey)]; // dead keys finally disappear
  }
}

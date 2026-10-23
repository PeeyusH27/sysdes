// A tiny multi-version store with snapshot isolation. A write never overwrites: it adds a new version
// stamped with a commit number. A transaction reads the newest version committed before it began.
class Tx {
  constructor(store) {
    this.store = store;
    this.snapshot = store.clock; // the world as of this moment
    this.writes = new Map(); // private until commit: nobody else can see it (no dirty reads)
  }

  get(key) {
    if (this.writes.has(key)) return this.writes.get(key);
    const versions = this.store.versions.get(key) ?? [];
    for (let i = versions.length - 1; i >= 0; i--) if (versions[i].at <= this.snapshot) return versions[i].value;
    return undefined;
  }

  set(key, value) {
    this.writes.set(key, value);
  }

  commit() {
    for (const key of this.writes.keys()) {
      const versions = this.store.versions.get(key) ?? [];
      // first committer wins: someone changed this key after our snapshot, so our write is based on stale data
      if (versions.length && versions.at(-1).at > this.snapshot) throw new Error(`write conflict on ${key}`);
    }
    const at = ++this.store.clock;
    for (const [key, value] of this.writes) {
      if (!this.store.versions.has(key)) this.store.versions.set(key, []);
      this.store.versions.get(key).push({ value, at });
    }
    return at;
  }
}

export class Store {
  constructor() {
    this.versions = new Map(); // key -> [{ value, at }], oldest first
    this.clock = 0;
  }

  begin() {
    return new Tx(this);
  }
}

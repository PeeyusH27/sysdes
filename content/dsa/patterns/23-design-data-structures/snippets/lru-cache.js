// Template 1: a hash map for O(1) lookup + a doubly linked list for O(1) "move to front" and "evict the oldest".
// head.next is the most recently used entry, tail.prev the least recently used. Sentinels remove edge cases.
class Entry {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.entries = new Map(); // key -> Entry
    this.head = new Entry(0, 0);
    this.tail = new Entry(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  unlink(e) {
    e.prev.next = e.next;
    e.next.prev = e.prev;
  }

  pushFront(e) {
    e.prev = this.head;
    e.next = this.head.next;
    this.head.next.prev = e;
    this.head.next = e;
  }

  get(key) {
    const e = this.entries.get(key);
    if (!e) return -1;
    this.unlink(e); // a read is a use: move to the front
    this.pushFront(e);
    return e.val;
  }

  put(key, value) {
    const old = this.entries.get(key);
    if (old) {
      old.val = value;
      this.unlink(old);
      this.pushFront(old);
      return;
    }
    if (this.entries.size === this.capacity) {
      const lru = this.tail.prev; // nobody touched it for the longest time
      this.unlink(lru);
      this.entries.delete(lru.key); // the node remembers its key for exactly this
    }
    const e = new Entry(key, value);
    this.entries.set(key, e);
    this.pushFront(e);
  }
}

// The shortcut: a JavaScript Map iterates in insertion order, so delete + set moves a key to the end.
export class LRUCacheMap {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // oldest key first
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value); // now the newest
    return value;
  }

  put(key, value) {
    this.map.delete(key);
    if (this.map.size === this.capacity) this.map.delete(this.map.keys().next().value); // evict the oldest
    this.map.set(key, value);
  }
}

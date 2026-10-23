class Entry {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.entries = new Map(); // key -> its list entry, so a lookup is O(1)
    // Two sentinels remove every "is this the first/last node?" case.
    // head.next is the most recently used entry, tail.prev the least recently used.
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
    this.unlink(e); // a read counts as a use: move to the front
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
      const lru = this.tail.prev; // the entry nobody touched for longest
      this.unlink(lru);
      this.entries.delete(lru.key);
    }
    const e = new Entry(key, value);
    this.entries.set(key, e);
    this.pushFront(e);
  }
}

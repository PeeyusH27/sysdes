class Bucket {
  constructor(count) {
    this.count = count;
    this.keys = new Set(); // every key currently seen exactly `count` times
    this.prev = null;
    this.next = null;
  }
}

class AllOne {
  constructor() {
    // Buckets form a doubly linked list sorted by count, with sentinels at both ends.
    this.head = new Bucket(0);
    this.tail = new Bucket(Infinity);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.where = new Map(); // key -> the bucket it is in
  }

  insertAfter(bucket, count) {
    const b = new Bucket(count);
    b.prev = bucket;
    b.next = bucket.next;
    bucket.next.prev = b;
    bucket.next = b;
    return b;
  }

  unlinkIfEmpty(bucket) {
    if (bucket.keys.size > 0) return;
    bucket.prev.next = bucket.next;
    bucket.next.prev = bucket.prev;
  }

  inc(key) {
    const cur = this.where.get(key) ?? this.head; // a new key starts "in the count 0 bucket"
    let up = cur.next;
    if (up.count !== cur.count + 1) up = this.insertAfter(cur, cur.count + 1);
    up.keys.add(key);
    this.where.set(key, up);
    if (cur !== this.head) {
      cur.keys.delete(key);
      this.unlinkIfEmpty(cur);
    }
  }

  dec(key) {
    const cur = this.where.get(key);
    if (cur.count === 1) {
      this.where.delete(key); // count 0 means "gone"
    } else {
      let down = cur.prev;
      if (down.count !== cur.count - 1) down = this.insertAfter(down, cur.count - 1);
      down.keys.add(key);
      this.where.set(key, down);
    }
    cur.keys.delete(key);
    this.unlinkIfEmpty(cur);
  }

  getMaxKey() {
    return this.tail.prev === this.head ? "" : this.tail.prev.keys.values().next().value;
  }

  getMinKey() {
    return this.head.next === this.tail ? "" : this.head.next.keys.values().next().value;
  }
}

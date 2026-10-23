// Strategy: the cache owns the data, the policy owns the order. A policy answers one question: who goes next?
class Node {
  constructor(key) { this.key = key; this.prev = null; this.next = null; }
}

export class LruPolicy {
  constructor() {
    this.nodes = new Map();                       // key -> node, so any key is found in O(1)
    this.head = new Node(null);                   // sentinels: the ends need no null checks
    this.tail = new Node(null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #unlink(n) { n.prev.next = n.next; n.next.prev = n.prev; }

  #pushFront(n) {
    n.next = this.head.next; n.prev = this.head;
    this.head.next.prev = n; this.head.next = n;
  }

  onInsert(key) { const n = new Node(key); this.nodes.set(key, n); this.#pushFront(n); }
  onAccess(key) { const n = this.nodes.get(key); this.#unlink(n); this.#pushFront(n); }  // newest to the front
  onRemove(key) { this.#unlink(this.nodes.get(key)); this.nodes.delete(key); }
  victim() { return this.tail.prev === this.head ? undefined : this.tail.prev.key; }      // the back is the oldest
}

export class FifoPolicy {
  constructor() { this.order = new Set(); }       // a Set remembers insertion order
  onInsert(key) { this.order.add(key); }
  onAccess() {}                                   // reads do not change who is next
  onRemove(key) { this.order.delete(key); }
  victim() { return this.order.values().next().value; }
}

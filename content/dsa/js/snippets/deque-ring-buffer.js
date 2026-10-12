// A double-ended queue on a circular array: O(1) at both ends (amortized when it grows).
class Deque {
  constructor(capacity = 8) {
    this.buf = new Array(capacity);
    this.head = 0;                       // index of the front item
    this.size = 0;
  }
  #grow() {
    const old = this.buf;
    this.buf = new Array(old.length * 2);
    for (let i = 0; i < this.size; i++) this.buf[i] = old[(this.head + i) % old.length];
    this.head = 0;                       // items are now unwrapped at the start
  }
  pushBack(x) {
    if (this.size === this.buf.length) this.#grow();
    this.buf[(this.head + this.size) % this.buf.length] = x;
    this.size++;
  }
  pushFront(x) {
    if (this.size === this.buf.length) this.#grow();
    this.head = (this.head - 1 + this.buf.length) % this.buf.length; // + length keeps it non-negative
    this.buf[this.head] = x;
    this.size++;
  }
  popFront() {
    if (this.size === 0) return undefined;
    const x = this.buf[this.head];
    this.buf[this.head] = undefined;     // let the item be garbage-collected
    this.head = (this.head + 1) % this.buf.length;
    this.size--;
    return x;
  }
  popBack() {
    if (this.size === 0) return undefined;
    const i = (this.head + this.size - 1) % this.buf.length;
    const x = this.buf[i];
    this.buf[i] = undefined;
    this.size--;
    return x;
  }
  front() {
    return this.size ? this.buf[this.head] : undefined;
  }
  back() {
    return this.size ? this.buf[(this.head + this.size - 1) % this.buf.length] : undefined;
  }
  toArray() {
    return Array.from({ length: this.size }, (_, i) => this.buf[(this.head + i) % this.buf.length]);
  }
}
const d = new Deque(2);
d.pushBack(2);
d.pushBack(3);
d.pushFront(1);                          // full at capacity 2, so it grows to 4 first
d.pushFront(0);
console.log(d.toArray(), d.front(), d.back()); // [0, 1, 2, 3] 0 3
console.log(d.popFront(), d.popBack(), d.toArray(), d.size); // 0 3 [1, 2] 2

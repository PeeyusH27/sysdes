// A binary heap stored in an array. compare(a, b) < 0 means a comes out first.
class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.compare = compare;
    this.items = [];
  }
  get size() { return this.items.length; }
  peek() { return this.items[0]; }       // undefined when empty
  push(x) {
    this.items.push(x);                  // add as the last leaf...
    this.siftUp(this.items.length - 1);  // ...then float it up to its place
  }
  pop() {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0];
    const last = items.pop();            // remove the last leaf
    if (items.length > 0) {
      items[0] = last;                   // move it to the root...
      this.siftDown(0);                  // ...and sink it to its place
    }
    return top;
  }
  siftUp(i) {
    const items = this.items;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(items[i], items[parent]) >= 0) break; // parent already first: done
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }
  siftDown(i) {
    const items = this.items;
    const n = items.length;
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;
      if (left < n && this.compare(items[left], items[best]) < 0) best = left;
      if (right < n && this.compare(items[right], items[best]) < 0) best = right;
      if (best === i) break;             // both children come later: done
      [items[i], items[best]] = [items[best], items[i]];
      i = best;
    }
  }
}

// Min heap of numbers.
const h = new MinHeap();
for (const x of [5, 1, 8, 3, 9, 2]) h.push(x);
console.log(h.peek(), h.size);           // 1 6
const drained = [];
while (h.size) drained.push(h.pop());
console.log(drained, h.pop());           // [1, 2, 3, 5, 8, 9] undefined

// Max heap: flip the comparator.
const maxHeap = new MinHeap((a, b) => b - a);
for (const x of [5, 1, 8, 3]) maxHeap.push(x);
console.log(maxHeap.pop(), maxHeap.pop()); // 8 5

// [priority, value] tuples: compare by priority, break ties by value.
const tasks = new MinHeap((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
tasks.push([2, 'write']);
tasks.push([1, 'plan']);
tasks.push([2, 'test']);
console.log(tasks.pop(), tasks.pop(), tasks.pop()); // [1, 'plan'] [2, 'test'] [2, 'write']

// k largest: keep a min heap of size k; its root is the k-th largest seen so far.
function kLargest(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    heap.push(x);
    if (heap.size > k) heap.pop();       // drop the smallest of the k + 1
  }
  return heap.peek();
}
console.log(kLargest([3, 2, 1, 5, 6, 4], 2)); // 5

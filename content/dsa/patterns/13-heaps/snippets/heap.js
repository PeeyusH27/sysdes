// Template 1: a binary heap. JavaScript has no built-in priority queue, so write this once and reuse it.
// The heap lives in an array: the parent of index i is (i - 1) >> 1, its children are 2i + 1 and 2i + 2.
// compare(a, b) < 0 means a leaves first: (a, b) => a - b is a min-heap, (a, b) => b - a a max-heap.
export class Heap {
  constructor(compare = (a, b) => a - b) {
    this.items = [];
    this.compare = compare;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0]; // undefined when empty
  }

  push(value) {
    this.items.push(value);              // add as the last leaf…
    this.siftUp(this.items.length - 1);  // …and float it up past larger parents
  }

  pop() {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;                   // move the last leaf to the root…
      this.siftDown(0);                  // …and sink it below smaller children
    }
    return top;
  }

  siftUp(i) {
    const items = this.items;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(items[i], items[parent]) >= 0) break; // parent already comes first
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  siftDown(i) {
    const items = this.items;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;                      // whichever of i, left, right should come first
      if (left < items.length && this.compare(items[left], items[best]) < 0) best = left;
      if (right < items.length && this.compare(items[right], items[best]) < 0) best = right;
      if (best === i) return;
      [items[i], items[best]] = [items[best], items[i]];
      i = best;
    }
  }
}

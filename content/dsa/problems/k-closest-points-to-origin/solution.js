// A binary heap stored in an array: compare(a, b) < 0 means a leaves the heap first.
class Heap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }
  size() {
    return this.items.length;
  }
  peek() {
    return this.items[0];
  }
  push(value) {
    this.items.push(value);
    this.siftUp(this.items.length - 1);
  }
  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      this.siftDown(0);
    }
    return top;
  }
  siftUp(i) {
    const items = this.items;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(items[i], items[parent]) >= 0) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }
  siftDown(i) {
    const items = this.items;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;
      if (left < items.length && this.compare(items[left], items[best]) < 0) best = left;
      if (right < items.length && this.compare(items[right], items[best]) < 0) best = right;
      if (best === i) return;
      [items[i], items[best]] = [items[best], items[i]];
      i = best;
    }
  }
}

function kClosest(points, k) {
  const dist = ([x, y]) => x * x + y * y; // squared distance: same order, no Math.sqrt

  // Max-heap by distance: the farthest of the current k candidates is on top, ready to be evicted.
  const heap = new Heap((a, b) => dist(b) - dist(a));
  for (const p of points) {
    heap.push(p);
    if (heap.size() > k) heap.pop();
  }

  const result = [];
  while (heap.size() > 0) result.push(heap.pop());
  return result;
}

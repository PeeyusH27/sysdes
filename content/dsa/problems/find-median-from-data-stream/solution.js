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

class MedianFinder {
  constructor() {
    this.low = new Heap((a, b) => b - a);  // max-heap: the smaller half
    this.high = new Heap((a, b) => a - b); // min-heap: the larger half
  }

  addNum(num) {
    // Route the number through low, so the largest of the small half moves up to high:
    // afterwards every value in low is <= every value in high.
    this.low.push(num);
    this.high.push(this.low.pop());
    // Sizes: low holds as many values as high, or exactly one more.
    if (this.high.size() > this.low.size()) this.low.push(this.high.pop());
  }

  findMedian() {
    if (this.low.size() > this.high.size()) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}

// A queue with O(1) enqueue and dequeue that frees memory as it goes.
class Queue {
  #items = [];
  #head = 0;
  enqueue(x) {
    this.#items.push(x);
  }
  dequeue() {
    if (this.#head === this.#items.length) return undefined;
    const x = this.#items[this.#head++];
    if (this.#head > 1024 && this.#head * 2 > this.#items.length) {
      this.#items = this.#items.slice(this.#head); // compact: drop the consumed prefix
      this.#head = 0;
    }
    return x;
  }
  peek() {
    return this.#items[this.#head];
  }
  get size() {
    return this.#items.length - this.#head;
  }
}

// BFS level by level: read the level's size before adding the next level.
const graph = [[1, 2], [3], [3, 4], [5], [5], []]; // node -> neighbours
function levels(start) {
  const queue = new Queue();
  const seen = new Set([start]);
  const out = [];
  queue.enqueue(start);
  while (queue.size > 0) {
    const level = [];
    for (let n = queue.size; n > 0; n--) {
      const node = queue.dequeue();
      level.push(node);
      for (const next of graph[node]) {
        if (!seen.has(next)) {
          seen.add(next);                // mark when enqueued, so nothing is queued twice
          queue.enqueue(next);
        }
      }
    }
    out.push(level);
  }
  return out;
}
console.log(levels(0));                  // [[0], [1, 2], [3, 4], [5]]

// A long-running queue stays small thanks to compaction.
const q = new Queue();
for (let i = 0; i < 100000; i++) {
  q.enqueue(i);
  if (i % 2 === 1) q.dequeue();          // two in, one out
}
console.log(q.size, q.peek());           // 50000 50000

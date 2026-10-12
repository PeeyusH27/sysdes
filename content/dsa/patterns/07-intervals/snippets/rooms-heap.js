// A small binary min-heap of numbers (JavaScript has no built-in priority queue).
export class MinHeap {
  #a = [];
  get size() { return this.#a.length; }
  peek() { return this.#a[0]; }
  push(x) {
    const a = this.#a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.#a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

// Template 2b: rooms needed for half-open meetings. Take meetings by start; the heap holds the end time of each
// busy room, so its top is the room that frees up first. Reuse it if it is free, otherwise open a new room.
export function minRooms(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const ends = new MinHeap();
  for (const [start, end] of sorted) {
    if (ends.size && ends.peek() <= start) ends.pop(); // that room is free again: hand it over
    ends.push(end);
  }
  return ends.size;
}

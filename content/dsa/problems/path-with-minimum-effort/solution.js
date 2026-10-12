// JavaScript has no built-in priority queue, so Dijkstra brings its own binary min-heap.
class MinHeap {
  constructor(compare = (a, b) => a[0] - b[0]) {
    this.items = [];
    this.compare = compare;
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.compare(a[p], a[i]) <= 0) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.compare(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.compare(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function minimumEffortPath(heights) {
  const rows = heights.length;
  const cols = heights[0].length;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // best[r][c] = smallest effort found so far for any route from the start to (r, c)
  const best = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  best[0][0] = 0;
  const heap = new MinHeap();
  heap.push([0, 0, 0]);                                   // [effort of the route, row, col]
  while (heap.size > 0) {
    const [effort, r, c] = heap.pop();
    if (effort > best[r][c]) continue;                    // stale entry
    if (r === rows - 1 && c === cols - 1) return effort;  // popped = settled: no route can do better
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      // A route's cost is its single biggest step, not the sum of its steps.
      const next = Math.max(effort, Math.abs(heights[nr][nc] - heights[r][c]));
      if (next < best[nr][nc]) {
        best[nr][nc] = next;
        heap.push([next, nr, nc]);
      }
    }
  }
  return 0;
}

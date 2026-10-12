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

function swimInWater(grid) {
  const n = grid.length;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // best[r][c] = earliest time found so far at which you can be standing on (r, c)
  const best = Array.from({ length: n }, () => new Array(n).fill(Infinity));
  best[0][0] = grid[0][0];                    // you can't even leave the start before it is covered
  const heap = new MinHeap();
  heap.push([grid[0][0], 0, 0]);              // [time, row, col]
  while (heap.size > 0) {
    const [time, r, c] = heap.pop();
    if (time > best[r][c]) continue;          // stale entry
    if (r === n - 1 && c === n - 1) return time;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      // Entering a cell means waiting until the water covers it: the route's time is its highest cell.
      const next = Math.max(time, grid[nr][nc]);
      if (next < best[nr][nc]) {
        best[nr][nc] = next;
        heap.push([next, nr, nc]);
      }
    }
  }
  return -1;
}

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

function networkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);   // nodes are labelled 1..n
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  const heap = new MinHeap();
  heap.push([0, k]);                                      // [time the signal reaches the node, node]
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;                            // stale entry: u was settled earlier with a smaller time
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  let slowest = 0;
  for (let i = 1; i <= n; i++) slowest = Math.max(slowest, dist[i]);
  return slowest === Infinity ? -1 : slowest;
}

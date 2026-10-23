function minCostConnectPoints(points) {
  const n = points.length;

  // Every pair of points is a candidate edge.
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const cost = Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]);
      edges.push([cost, i, j]);
    }
  }
  edges.sort((a, b) => a[0] - b[0]);

  // Union-find with path compression.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  let total = 0;
  let used = 0;
  for (const [cost, a, b] of edges) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue; // already connected: this edge would make a cycle
    parent[ra] = rb;
    total += cost;
    if (++used === n - 1) break; // a spanning tree has n - 1 edges
  }
  return total;
}

// Template 3: Bellman-Ford. Each round relaxes every edge once, reading the previous round's
// distances, so after r rounds dist[v] is the shortest path that uses at most r edges.
// Negative weights are fine. Pass maxEdges = k + 1 for "at most k stops".
export function bellmanFord(n, edges, source, maxEdges = n - 1) {
  let dist = new Array(n).fill(Infinity);
  dist[source] = 0;
  for (let round = 1; round <= maxEdges; round++) {
    const next = dist.slice();            // read from dist, write into next
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist[u] + w < next[v]) {        // Infinity + w stays Infinity, so unreached nodes relax nothing
        next[v] = dist[u] + w;
        changed = true;
      }
    }
    dist = next;
    if (!changed) break;                  // nothing improved, so later rounds can't either
  }
  return dist;
}

// After n - 1 rounds every shortest path is final. If an edge can still be relaxed,
// a negative cycle is reachable and "shortest" is undefined.
export function hasNegativeCycle(n, edges, source) {
  const dist = bellmanFord(n, edges, source);
  return edges.some(([u, v, w]) => dist[u] + w < dist[v]);
}

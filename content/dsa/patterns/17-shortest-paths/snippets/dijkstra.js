import { MinHeap } from './min-heap.js';

// Template 2: Dijkstra for non-negative weights. Always expand the closest node not yet settled.
// Lazy deletion: instead of updating an entry inside the heap, push a new one and skip
// entries that are stale (a shorter distance was found after they were pushed).
export function dijkstra(n, edges, source) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]); // directed; also push [u, w] onto adj[v] if undirected
  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;            // stale entry: u was settled with a smaller distance
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;                            // Infinity = unreachable
}

// The same loop with two extras: remember how each node was reached (prev) to rebuild the path,
// and stop as soon as the target is popped, because a popped node's distance is final.
export function shortestPath(n, edges, source, target) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (u === target) break;
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        prev[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  if (dist[target] === Infinity) return { dist: -1, path: [] };
  const path = [];
  for (let v = target; v !== -1; v = prev[v]) path.push(v);
  return { dist: dist[target], path: path.reverse() };
}

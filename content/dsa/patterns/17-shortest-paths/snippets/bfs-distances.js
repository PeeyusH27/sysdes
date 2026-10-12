// Template 1: BFS for unweighted graphs (every edge costs 1). Nodes leave the queue in order of
// distance, so the first time a node is reached is along a shortest path.
export function bfsDistances(n, edges, source) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);                     // undirected: drop this line for a directed graph
  }
  const dist = new Array(n).fill(-1);   // -1 = not reached (yet)
  dist[source] = 0;
  const queue = [source];
  for (let head = 0; head < queue.length; head++) { // a head index: shift() is O(n)
    const u = queue[head];
    for (const v of adj[u]) {
      if (dist[v] !== -1) continue;
      dist[v] = dist[u] + 1;            // mark when pushed so nothing is queued twice
      queue.push(v);
    }
  }
  return dist;
}

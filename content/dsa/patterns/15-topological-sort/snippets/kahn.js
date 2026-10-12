// Template 1: Kahn's algorithm. Nodes are 0..n-1 and each edge [from, to] means "from must come before to".
// Repeatedly take a node with no remaining incoming edges. Returns a topological order, or [] if there is a cycle.
export function topoSortKahn(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [from, to] of edges) {
    adj[from].push(to);
    indegree[to]++;
  }
  const queue = [];
  for (let v = 0; v < n; v++) if (indegree[v] === 0) queue.push(v); // nothing has to come before these
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) {
      indegree[v]--;                         // the edge u → v is used up
      if (indegree[v] === 0) queue.push(v);  // everything v waited for is now placed
    }
  }
  return order.length === n ? order : [];    // nodes on (or behind) a cycle never reach in-degree 0
}

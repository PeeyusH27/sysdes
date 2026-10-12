// Template 2: DFS with three colours. WHITE = not visited, GRAY = on the current path, BLACK = finished.
// An edge into a GRAY node closes a cycle. A node finishes after everything it points to, so the reversed
// finishing order is a topological order. Edges [from, to] mean "from before to". Returns [] on a cycle.
export function topoSortDfs(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [from, to] of edges) adj[from].push(to);
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Array(n).fill(WHITE);
  const finished = [];

  function visit(u) {                                    // false if a cycle is reachable from u
    color[u] = GRAY;
    for (const v of adj[u]) {
      if (color[v] === GRAY) return false;               // back edge: v is still on the path
      if (color[v] === WHITE && !visit(v)) return false; // BLACK: already finished, nothing to do
    }
    color[u] = BLACK;
    finished.push(u);                                    // everything after u is already in `finished`
    return true;
  }

  for (let u = 0; u < n; u++) {
    if (color[u] === WHITE && !visit(u)) return [];
  }
  return finished.reverse();
}

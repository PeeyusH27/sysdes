// Template 2: BFS from one start node. Nodes come out of the queue in order of distance, so the first time a
// node is discovered is along a fewest-edges path. dist[v] = number of edges from start, or -1 if unreachable.
export function bfsDistances(adj, start) {
  const dist = new Array(adj.length).fill(-1);  // -1 doubles as "not visited"
  dist[start] = 0;                              // mark the start when it is enqueued
  const queue = [start];
  for (let head = 0; head < queue.length; head++) { // head index: queue.shift() would be O(n) per call
    const node = queue[head];
    for (const next of adj[node]) {
      if (dist[next] !== -1) continue;          // already queued, so its distance is final
      dist[next] = dist[node] + 1;              // mark on enqueue
      queue.push(next);
    }
  }
  return dist;
}

// Fewest moves between two cells of a grid of strings ("." open, "#" wall), one level per step. -1 if blocked.
export function gridSteps(grid, [sr, sc], [tr, tc]) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (grid[sr][sc] === "#" || grid[tr][tc] === "#") return -1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  seen[sr][sc] = true;
  const queue = [[sr, sc]];
  let head = 0;
  for (let steps = 0; head < queue.length; steps++) {
    const levelEnd = queue.length;              // everything queued so far is `steps` moves away
    while (head < levelEnd) {
      const [r, c] = queue[head++];
      if (r === tr && c === tc) return steps;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (seen[nr][nc] || grid[nr][nc] === "#") continue;
        seen[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return -1;
}

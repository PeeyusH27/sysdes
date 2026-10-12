function shortestPathBinaryMatrix(grid) {
  const n = grid.length;
  if (grid[0][0] === 1 || grid[n - 1][n - 1] === 1) return -1;
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const dist = Array.from({ length: n }, () => new Array(n).fill(0)); // 0 means "not reached yet"
  dist[0][0] = 1;                       // the length counts cells, so the start cell alone is 1
  const queue = [[0, 0]];
  for (let head = 0; head < queue.length; head++) {   // a head index instead of shift(), which is O(n)
    const [r, c] = queue[head];
    if (r === n - 1 && c === n - 1) return dist[r][c]; // BFS reaches each cell first by a shortest path
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (grid[nr][nc] === 1 || dist[nr][nc] !== 0) continue;
      dist[nr][nc] = dist[r][c] + 1;  // mark when enqueued, so no cell enters the queue twice
      queue.push([nr, nc]);
    }
  }
  return -1;
}

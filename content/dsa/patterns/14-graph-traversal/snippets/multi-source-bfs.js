// Template 3: multi-source BFS. Every source starts in the queue at distance 0, so one pass gives each cell its
// distance to the NEAREST source. Grid of strings: "E" exit (a source), "." open, "#" wall; -1 = unreachable.
export function distanceToNearest(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const queue = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "E") {
        dist[r][c] = 0;                           // all sources are seeded (and marked) together
        queue.push([r, c]);
      }
    }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] !== "." || dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;              // first discovery = nearest source
      queue.push([nr, nc]);
    }
  }
  return dist;
}

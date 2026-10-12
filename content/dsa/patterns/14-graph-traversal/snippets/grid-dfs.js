// Template 1a: recursive DFS on a grid. A grid is an implicit graph: cell (r, c) is a node and its
// neighbours are the in-bounds cells one step away. Counts the regions of connected cells equal to `target`.
export function countRegions(grid, target = 1) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function dfs(r, c) {
    seen[r][c] = true;                                          // mark before exploring further
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue; // off the grid
      if (seen[nr][nc] || grid[nr][nc] !== target) continue;      // visited, or not part of a region
      dfs(nr, nc);
    }
  }

  let regions = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === target && !seen[r][c]) {
        regions++;                                              // nothing earlier reached it: a new region
        dfs(r, c);
      }
    }
  }
  return regions;
}

// Template 1b: the same flood with an explicit stack, so a huge region can't overflow the call stack.
// Returns the size of every region in the order the scan finds them.
export function regionSizes(grid, target = 1) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const sizes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== target || seen[r][c]) continue;
      seen[r][c] = true;                                        // mark on push
      const stack = [[r, c]];
      let size = 0;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        size++;
        for (const [dr, dc] of dirs) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (seen[nr][nc] || grid[nr][nc] !== target) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      sizes.push(size);
    }
  }
  return sizes;
}

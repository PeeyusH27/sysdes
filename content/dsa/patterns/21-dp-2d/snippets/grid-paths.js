// Grid DP: dp[r][c] = number of ways to reach cell (r, c) from the top-left, moving only right or down.
// The last move came from above or from the left, so add those two cells. Walls (1) have 0 ways.
export function countPaths(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0)); // NOT fill(new Array(...)): shared row!
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) continue;                     // a wall: no path ends here
      if (r === 0 && c === 0) dp[r][c] = 1;               // the start: one way, standing still
      else dp[r][c] = (r > 0 ? dp[r - 1][c] : 0) + (c > 0 ? dp[r][c - 1] : 0);
    }
  }
  return dp[rows - 1][cols - 1];
}

// The same table kept as ONE row. Before row[c] is updated it still holds the value from the row above,
// and row[c - 1] already holds the current row's value: exactly "above + left".
export function countPathsOneRow(grid) {
  const cols = grid[0].length;
  const row = new Array(cols).fill(0);
  row[0] = 1;
  for (const cells of grid) {
    for (let c = 0; c < cols; c++) {
      if (cells[c] === 1) row[c] = 0;
      else if (c > 0) row[c] += row[c - 1];
    }
  }
  return row[cols - 1];
}

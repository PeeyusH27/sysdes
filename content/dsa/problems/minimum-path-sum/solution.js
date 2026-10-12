function minPathSum(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  // best[r][c] = cheapest right/down path from the top-left corner to (r, c), counting both ends
  const best = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) best[r][c] = grid[0][0];
      else if (r === 0) best[r][c] = best[r][c - 1] + grid[r][c]; // top row: only from the left
      else if (c === 0) best[r][c] = best[r - 1][c] + grid[r][c]; // left column: only from above
      else best[r][c] = Math.min(best[r - 1][c], best[r][c - 1]) + grid[r][c];
    }
  }
  return best[rows - 1][cols - 1];
}

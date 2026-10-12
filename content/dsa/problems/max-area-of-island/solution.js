function maxAreaOfIsland(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  // Size of the island containing (r, c), sinking its cells so each one is counted once.
  function area(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return 0;
    grid[r][c] = 0;
    return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1);
  }

  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) best = Math.max(best, area(r, c));
    }
  }
  return best;
}

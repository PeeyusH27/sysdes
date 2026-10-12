function uniquePaths(m, n) {
  // paths[r][c] = number of right/down paths from the top-left corner to cell (r, c)
  const paths = Array.from({ length: m }, () => new Array(n).fill(1)); // row 0 and column 0 stay 1
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      paths[r][c] = paths[r - 1][c] + paths[r][c - 1]; // last move: down from above, or right from the left
    }
  }
  return paths[m - 1][n - 1];
}

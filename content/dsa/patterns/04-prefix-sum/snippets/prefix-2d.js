// Template 3: 2D prefix sums. P[r][c] is the sum of the rectangle grid[0..r-1][0..c-1] (one extra row and
// column of zeros), so any rectangle sum is four lookups by inclusion-exclusion.
export function buildPrefix2D(grid) {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const P = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];   // the overlap was added twice
    }
  }
  return P;
}

// Sum of grid[r1..r2][c1..c2], all ends inclusive.
export function rectSum(P, r1, c1, r2, c2) {
  return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
}

// Template 5b: diagonals. Cells on one anti-diagonal share r + c; cells on one main diagonal share r - c.
// Walk the sums in order, clip the row range to the grid, and reverse every other diagonal to zig-zag.
export function antiDiagonals(m) {
  const rows = m.length;
  const cols = m[0].length;
  const out = [];
  for (let sum = 0; sum <= rows + cols - 2; sum++) {
    const diagonal = [];
    for (let r = Math.max(0, sum - cols + 1); r <= Math.min(rows - 1, sum); r++) diagonal.push(m[r][sum - r]);
    out.push(diagonal); // rows increasing: top-right to bottom-left
  }
  return out;
}

export function diagonalOrder(m) {
  const out = [];
  antiDiagonals(m).forEach((diagonal, sum) => {
    if (sum % 2 === 0) diagonal.reverse(); // even diagonals are read bottom-left to top-right
    out.push(...diagonal);
  });
  return out;
}

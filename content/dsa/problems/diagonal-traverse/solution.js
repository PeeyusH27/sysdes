function findDiagonalOrder(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const out = [];
  // Cells with the same r + c lie on one anti-diagonal; there are rows + cols - 1 of them.
  for (let sum = 0; sum <= rows + cols - 2; sum++) {
    const diagonal = [];
    // Row range on this diagonal: column = sum - row must stay inside 0..cols-1.
    for (let r = Math.max(0, sum - cols + 1); r <= Math.min(rows - 1, sum); r++) {
      diagonal.push(matrix[r][sum - r]); // rows increasing = walking down-left
    }
    if (sum % 2 === 0) diagonal.reverse(); // even diagonals are read up-right
    out.push(...diagonal);
  }
  return out;
}

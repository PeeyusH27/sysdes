function searchMatrix(matrix, target) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  // The grid read row by row is one sorted list of rows * cols values: binary search over positions.
  let lo = 0;
  let hi = rows * cols - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const value = matrix[Math.floor(mid / cols)][mid % cols]; // position -> (row, column)
    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

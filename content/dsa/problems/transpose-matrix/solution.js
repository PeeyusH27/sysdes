function transpose(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  // The result is cols x rows. Build each row separately: fill() would share one row.
  const result = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j]; // row and column swap places
    }
  }
  return result;
}

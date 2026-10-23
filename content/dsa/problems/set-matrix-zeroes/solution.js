function setZeroes(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  // The first row and column double as the "clear this column / row" flags,
  // so remember separately whether they themselves held a zero.
  let firstRowZero = false;
  let firstColZero = false;
  for (let j = 0; j < cols; j++) if (matrix[0][j] === 0) firstRowZero = true;
  for (let i = 0; i < rows; i++) if (matrix[i][0] === 0) firstColZero = true;

  // Mark: a zero at (i, j) writes a zero into matrix[i][0] and matrix[0][j].
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (matrix[i][j] === 0) {
        matrix[i][0] = 0;
        matrix[0][j] = 0;
      }
    }
  }
  // Apply the marks to the inner cells.
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
    }
  }
  // Only now is it safe to clear the marker row and column themselves.
  if (firstRowZero) for (let j = 0; j < cols; j++) matrix[0][j] = 0;
  if (firstColZero) for (let i = 0; i < rows; i++) matrix[i][0] = 0;
}

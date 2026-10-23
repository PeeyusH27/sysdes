// Template 3: marker row and column. Record "this row/column must be cleared" inside the grid itself (its first
// row and first column), instead of in extra arrays. Decide first, change later: never zero while scanning.
export function setZeroes(m) {
  const rows = m.length;
  const cols = m[0].length;
  let firstRowZero = false; // the markers live in row 0 and column 0, so remember if they held a zero
  let firstColZero = false;
  for (let j = 0; j < cols; j++) if (m[0][j] === 0) firstRowZero = true;
  for (let i = 0; i < rows; i++) if (m[i][0] === 0) firstColZero = true;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (m[i][j] === 0) {
        m[i][0] = 0; // mark row i
        m[0][j] = 0; // mark column j
      }
    }
  }
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (m[i][0] === 0 || m[0][j] === 0) m[i][j] = 0;
    }
  }
  if (firstRowZero) for (let j = 0; j < cols; j++) m[0][j] = 0; // only now is it safe to clear the markers
  if (firstColZero) for (let i = 0; i < rows; i++) m[i][0] = 0;
}

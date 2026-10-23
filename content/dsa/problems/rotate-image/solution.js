function rotate(matrix) {
  const n = matrix.length;
  // Step 1: transpose. Only visit cells above the diagonal, or every pair is swapped twice.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }
  // Step 2: reverse each row. Transpose + reverse rows = 90 degrees clockwise.
  for (const row of matrix) row.reverse();
}

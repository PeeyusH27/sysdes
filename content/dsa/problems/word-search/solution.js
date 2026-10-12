function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;

  // Can word[i..] be traced starting at cell (r, c)?
  function dfs(r, c, i) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    const letter = board[r][c];
    board[r][c] = "#";          // choose: the cell is on the path, so it can't match again
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    board[r][c] = letter;       // un-choose: free the cell for other paths
    return found;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}

function gameOfLife(board) {
  const rows = board.length;
  const cols = board[0].length;
  // Encode the transition in the cell so the old state is still readable while we scan:
  //   0 dead -> dead, 1 alive -> alive, 2 alive -> dead, 3 dead -> alive.
  // "Was alive" is therefore value 1 or 2.
  const wasAlive = (v) => v === 1 || v === 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let live = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && wasAlive(board[nr][nc])) live++;
        }
      }
      if (board[r][c] === 1 && (live < 2 || live > 3)) board[r][c] = 2; // dies
      else if (board[r][c] === 0 && live === 3) board[r][c] = 3; // is born
    }
  }
  // Second pass: keep only the new state.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c] = board[r][c] === 1 || board[r][c] === 3 ? 1 : 0;
    }
  }
}

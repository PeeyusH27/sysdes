function isValidSudoku(board) {
  const rows = Array.from({ length: 9 }, () => new Set());
  const cols = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const digit = board[r][c];
      if (digit === ".") continue;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3); // which of the nine 3 x 3 boxes
      if (rows[r].has(digit) || cols[c].has(digit) || boxes[b].has(digit)) return false;
      rows[r].add(digit);
      cols[c].add(digit);
      boxes[b].add(digit);
    }
  }
  return true;
}

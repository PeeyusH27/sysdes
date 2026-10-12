function solveNQueens(n) {
  const result = [];
  const queens = [];               // queens[r] = column of the queen in row r
  const cols = new Set();
  const diagonals = new Set();     // r - c is the same on every square of a ↘ diagonal
  const antiDiagonals = new Set(); // r + c is the same on every square of a ↙ diagonal

  function place(r) {
    if (r === n) {
      result.push(queens.map((c) => ".".repeat(c) + "Q" + ".".repeat(n - c - 1)));
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diagonals.has(r - c) || antiDiagonals.has(r + c)) continue; // attacked: prune
      queens.push(c);           // choose
      cols.add(c);
      diagonals.add(r - c);
      antiDiagonals.add(r + c);
      place(r + 1);             // explore the next row
      queens.pop();             // un-choose
      cols.delete(c);
      diagonals.delete(r - c);
      antiDiagonals.delete(r + c);
    }
  }

  place(0);
  return result;
}

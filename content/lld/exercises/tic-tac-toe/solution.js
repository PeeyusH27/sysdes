// One job each: Board knows the grid and whether a mark completes a line; Game knows whose turn it is and how the game ends.
class Board {
  constructor(n) {
    this.n = n;
    this.cells = Array.from({ length: n }, () => Array(n).fill(""));
    // Running totals per line, +1 for each X and -1 for each O. A line is won when its total reaches ±n.
    this.rows = Array(n).fill(0);
    this.cols = Array(n).fill(0);
    this.diag = 0;
    this.anti = 0;
    this.filled = 0;
  }

  isFree(row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < this.n && col >= 0 && col < this.n && this.cells[row][col] === "";
  }

  // Places a mark and returns true when it completes a line. O(1): only four counters change.
  place(mark, row, col) {
    const d = mark === "X" ? 1 : -1;
    this.cells[row][col] = mark;
    this.filled++;
    this.rows[row] += d;
    this.cols[col] += d;
    if (row === col) this.diag += d;
    if (row + col === this.n - 1) this.anti += d;
    return [this.rows[row], this.cols[col], this.diag, this.anti].some((t) => Math.abs(t) === this.n);
  }

  isFull() {
    return this.filled === this.n * this.n;
  }

  snapshot() {
    return this.cells.map((r) => [...r]);
  }
}

class Game {
  constructor(n) {
    this.grid = new Board(n);
    this.turn = "X";
    this.result = null; // "X", "O" or "DRAW" once finished
  }

  move(player, row, col) {
    if (this.result !== null) return "GAME_OVER";
    if (player !== this.turn) return "NOT_YOUR_TURN";
    if (!this.grid.isFree(row, col)) return "INVALID_MOVE";
    const won = this.grid.place(player, row, col);
    if (won) {
      this.result = player;
      return player + "_WINS";
    }
    if (this.grid.isFull()) {
      this.result = "DRAW";
      return "DRAW";
    }
    this.turn = player === "X" ? "O" : "X";
    return "OK";
  }

  winner() {
    return this.result;
  }

  board() {
    return this.grid.snapshot();
  }
}

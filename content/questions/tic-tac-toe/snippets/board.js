const weight = mark => (mark === 'X' ? 1 : -1);

// Board knows the grid and whether a mark finishes a line. It keeps a running total per line
// (+1 for each X, -1 for each O), so a line is won exactly when its total reaches n or -n.
export class Board {
  constructor(n) {
    this.n = n;
    this.cells = Array.from({ length: n }, () => Array(n).fill(null));
    this.rows = Array(n).fill(0);
    this.cols = Array(n).fill(0);
    this.diag = 0;                                 // cells where row === col
    this.anti = 0;                                 // cells where row + col === n - 1
    this.filled = 0;
  }

  isFree(r, c) {
    return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < this.n && c >= 0 && c < this.n && this.cells[r][c] === null;
  }

  isFull() { return this.filled === this.n * this.n; }

  // O(1) and read-only: would this mark complete a line? A mixed line can never reach n in absolute value.
  wouldComplete(mark, r, c) {
    const d = weight(mark);
    const totals = [this.rows[r] + d, this.cols[c] + d];
    if (r === c) totals.push(this.diag + d);
    if (r + c === this.n - 1) totals.push(this.anti + d);
    return totals.some(t => Math.abs(t) === this.n);
  }

  place(mark, r, c) { this.#apply(r, c, mark, 1); }

  clear(r, c) { this.#apply(r, c, this.cells[r][c], -1); }   // the undo of place: same counters, opposite sign

  #apply(r, c, mark, sign) {
    const d = weight(mark) * sign;
    this.cells[r][c] = sign > 0 ? mark : null;
    this.filled += sign;
    this.rows[r] += d;
    this.cols[c] += d;
    if (r === c) this.diag += d;
    if (r + c === this.n - 1) this.anti += d;
  }
}

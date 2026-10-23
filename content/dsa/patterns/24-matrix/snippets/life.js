// Template 4: simulation with state encoding. All cells change at once, so decisions must use the OLD board.
// Encode old and new state in one number: 0 dead, 1 alive, 2 alive -> dead, 3 dead -> alive.
// Eight directions as (row, column) steps: the direction-array idiom for every grid walk.
const NEIGHBOURS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function aliveNeighbours(board, r, c) {
  let live = 0;
  for (const [dr, dc] of NEIGHBOURS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= board.length || nc < 0 || nc >= board[0].length) continue;
    if (board[nr][nc] === 1 || board[nr][nc] === 2) live++; // 2 was alive in the old generation
  }
  return live;
}

export function gameOfLife(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const live = aliveNeighbours(board, r, c);
      if (board[r][c] === 1 && (live < 2 || live > 3)) board[r][c] = 2; // dies
      else if (board[r][c] === 0 && live === 3) board[r][c] = 3; // is born
    }
  }
  for (const row of board) {
    for (let c = 0; c < row.length; c++) row[c] = row[c] === 1 || row[c] === 3 ? 1 : 0; // keep the new state
  }
}

// The simple alternative: write into a copy, read from the original. O(rows * columns) extra space.
export function nextGeneration(board) {
  const next = board.map((row) => row.slice());
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const live = aliveNeighbours(board, r, c);
      next[r][c] = board[r][c] === 1 ? (live === 2 || live === 3 ? 1 : 0) : live === 3 ? 1 : 0;
    }
  }
  return next;
}

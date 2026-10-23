// Strategy: a bot is just a function (board, mark) -> [row, col]. The game never knows which one is playing.
const free = board => {
  const cells = [];
  for (let r = 0; r < board.n; r++) for (let c = 0; c < board.n; c++) if (board.isFree(r, c)) cells.push([r, c]);
  return cells;
};

export const firstFree = board => free(board)[0];

// Win if you can, else block the opponent, else take the middle, else the first free cell.
export function sensible(board, mark) {
  const other = mark === 'X' ? 'O' : 'X';
  const cells = free(board);
  const mid = Math.floor(board.n / 2);
  return cells.find(([r, c]) => board.wouldComplete(mark, r, c))
    ?? cells.find(([r, c]) => board.wouldComplete(other, r, c))
    ?? cells.find(([r, c]) => r === mid && c === mid)
    ?? cells[0];
}

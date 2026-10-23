import { test, expect } from 'vitest';
import { Game } from './game.js';
import { firstFree, sensible } from './bots.js';

const play = (g, ...moves) => moves.map(([m, r, c]) => g.move(m, r, c));

test('X wins a row, and the game then refuses every move', () => {
  const g = new Game();
  expect(play(g, ['X', 0, 0], ['O', 1, 0], ['X', 0, 1], ['O', 1, 1], ['X', 0, 2]).at(-1)).toBe('WIN');
  expect([g.status, g.winner]).toEqual(['WON', 'X']);
  expect(g.move('O', 2, 2)).toBe('GAME_OVER');
});

test('both diagonals win', () => {
  const a = new Game();
  expect(play(a, ['X', 0, 0], ['O', 0, 1], ['X', 1, 1], ['O', 0, 2], ['X', 2, 2]).at(-1)).toBe('WIN');
  const b = new Game();
  expect(play(b, ['X', 0, 2], ['O', 0, 0], ['X', 1, 1], ['O', 0, 1], ['X', 2, 0]).at(-1)).toBe('WIN');
});

test('a mixed line never counts: X O X across a row is not a win', () => {
  const g = new Game();
  expect(play(g, ['X', 0, 0], ['O', 0, 1], ['X', 0, 2])).toEqual(['OK', 'OK', 'OK']);
});

test('a full board with no line is a draw; a last move that completes a line is a win, not a draw', () => {
  const draw = new Game();
  const results = play(draw, ['X', 0, 0], ['O', 0, 1], ['X', 0, 2], ['O', 1, 1], ['X', 1, 0], ['O', 1, 2], ['X', 2, 1], ['O', 2, 0], ['X', 2, 2]);
  expect([results.at(-1), draw.status, draw.winner]).toEqual(['DRAW', 'DRAW', null]);
  const win = new Game();
  const last = play(win, ['X', 0, 0], ['O', 0, 1], ['X', 1, 1], ['O', 0, 2], ['X', 1, 2], ['O', 1, 0], ['X', 2, 0], ['O', 2, 1], ['X', 2, 2]);
  expect([last.at(-1), win.board.isFull(), win.status]).toEqual(['WIN', true, 'WON']);
});

test('rejected moves change nothing and do not use up the turn', () => {
  const g = new Game();
  expect(g.move('O', 0, 0)).toBe('NOT_YOUR_TURN');
  expect(g.move('X', 3, 0)).toBe('INVALID_MOVE');
  expect(g.move('X', 0, 0)).toBe('OK');
  expect(g.move('O', 0, 0)).toBe('INVALID_MOVE');       // taken
  expect([g.current, g.version, g.board.filled]).toEqual(['O', 1, 1]);
});

test('undo takes back a winning move: board, turn, status and counters', () => {
  const g = new Game();
  play(g, ['X', 0, 0], ['O', 1, 0], ['X', 0, 1], ['O', 1, 1], ['X', 0, 2]);
  expect(g.undo()).toBe(true);
  expect([g.status, g.winner, g.current, g.board.filled]).toEqual(['IN_PROGRESS', null, 'X', 4]);
  expect(g.move('X', 2, 2)).toBe('OK');                 // a different move now
  expect(g.move('O', 1, 2)).toBe('WIN');                // O completes the middle row
  expect(new Game().undo()).toBe(false);
});

test('a stale version is refused, so two clients cannot both act on the same board', () => {
  const g = new Game();
  expect(g.move('X', 0, 0, 0)).toBe('OK');
  expect(g.move('O', 1, 1, 0)).toBe('STALE');           // O looked at version 0
  expect(g.move('O', 1, 1, 1)).toBe('OK');
});

test('wouldComplete is read-only', () => {
  const g = new Game();
  play(g, ['X', 0, 0], ['O', 1, 0], ['X', 0, 1]);
  const before = JSON.stringify(g.board);
  expect(g.board.wouldComplete('X', 0, 2)).toBe(true);
  expect(g.board.wouldComplete('O', 0, 2)).toBe(false);
  expect(JSON.stringify(g.board)).toBe(before);
});

test('the counters agree with a brute-force scan over 300 random 4x4 games', () => {
  let seed = 11;
  const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const scan = (cells, n, m) => {
    const lines = [];
    for (let i = 0; i < n; i++) { lines.push(cells[i], cells.map(r => r[i])); }
    lines.push(cells.map((r, i) => r[i]), cells.map((r, i) => r[n - 1 - i]));
    return lines.some(l => l.every(x => x === m));
  };
  for (let game = 0; game < 300; game++) {
    const g = new Game(4);
    for (let i = 0; i < 16 && g.status === 'IN_PROGRESS'; i++) {
      const free = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g.board.isFree(r, c)) free.push([r, c]);
      const [r, c] = free[rnd(free.length)];
      const mark = g.current;
      const res = g.move(mark, r, c);
      expect(res === 'WIN').toBe(scan(g.board.cells, 4, mark));
    }
  }
});

test('bots: take the win, else block, else the middle, else the first free cell', () => {
  expect(sensible(new Game().board, 'X')).toEqual([1, 1]);
  const g = new Game();
  play(g, ['X', 0, 0], ['O', 1, 0], ['X', 0, 1], ['O', 1, 1], ['X', 2, 2]);
  expect(sensible(g.board, 'O')).toEqual([1, 2]);       // O can win, and that beats blocking X at 0,2
  const h = new Game();
  play(h, ['X', 0, 0], ['O', 1, 1], ['X', 0, 1]);
  expect(sensible(h.board, 'O')).toEqual([0, 2]);       // O cannot win, so it blocks
  expect(firstFree(h.board)).toEqual([0, 2]);
});

test('a 500 by 500 board plays a winning row without scanning anything', () => {
  const g = new Game(500);
  let last;
  for (let c = 0; c < 500; c++) {
    last = g.move('X', 0, c);
    if (c < 499) g.move('O', 1, c);
  }
  expect(last).toBe('WIN');
  expect(firstFree(g.board)).toEqual([1, 499]);
});

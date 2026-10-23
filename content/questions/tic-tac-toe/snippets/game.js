import { Board } from './board.js';

// Game knows whose turn it is and how the match ends. Each applied change bumps `version`,
// so two clients that both acted on the same view cannot both succeed.
export class Game {
  constructor(n = 3, marks = ['X', 'O']) {
    this.board = new Board(n);
    this.marks = marks;
    this.turn = 0;
    this.status = 'IN_PROGRESS';                   // IN_PROGRESS -> WON | DRAW, and undo goes back
    this.winner = null;
    this.version = 0;
    this.history = [];                             // one entry per move: the undo stack (Command)
  }

  get current() { return this.marks[this.turn]; }

  move(mark, r, c, seen = this.version) {
    if (this.status !== 'IN_PROGRESS') return 'GAME_OVER';
    if (seen !== this.version) return 'STALE';     // the caller decided on an old board
    if (mark !== this.current) return 'NOT_YOUR_TURN';
    if (!this.board.isFree(r, c)) return 'INVALID_MOVE';
    const wins = this.board.wouldComplete(mark, r, c);
    this.board.place(mark, r, c);
    this.history.push({ mark, r, c });
    this.version++;
    if (wins) { this.status = 'WON'; this.winner = mark; return 'WIN'; }
    if (this.board.isFull()) { this.status = 'DRAW'; return 'DRAW'; }
    this.turn = (this.turn + 1) % this.marks.length;
    return 'OK';
  }

  undo() {
    const last = this.history.pop();
    if (!last) return false;
    this.board.clear(last.r, last.c);
    this.turn = this.marks.indexOf(last.mark);
    this.status = 'IN_PROGRESS';
    this.winner = null;
    this.version++;
    return true;
  }
}

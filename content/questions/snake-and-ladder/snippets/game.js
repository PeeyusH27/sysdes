import { exact } from './models.js';

export class Game {
  constructor({ board, players, dice, rule = exact, sixAgain = false }) {
    Object.assign(this, { board, players, dice, rule, sixAgain });
    this.position = new Map(players.map(p => [p, 0]));   // 0 means "not on the board yet"
    this.turn = 0;                                       // index into players
    this.winner = null;
    this.listeners = [];
  }

  on(listener) { this.listeners.push(listener); }        // observer: a UI, a log or a test

  // One roll by whoever is next. Returns what happened, or null once someone has won.
  play() {
    if (this.winner) return null;
    const player = this.players[this.turn];
    const roll = this.dice.roll();
    const from = this.position.get(player);
    const landed = this.rule(from, roll, this.board.size);
    const to = landed === null ? from : this.board.land(landed);
    let event = landed === null ? 'stay' : this.board.kindAt(landed);
    if (to === this.board.size) { event = 'win'; this.winner = player; }
    this.position.set(player, to);
    if (!this.winner && !(roll === 6 && this.sixAgain)) this.turn = (this.turn + 1) % this.players.length;
    const result = { player, roll, from, to, event };
    for (const l of this.listeners) l(result);
    return result;
  }
}

// Strategy: an ending rule maps (position, roll, size) to a landing square, or null if the move is refused.
// A fourth rule is one new entry here, and Game never changes.
const RULES = {
  exact: (p, r, size) => (p + r > size ? null : p + r),
  finish: (p, r, size) => Math.min(p + r, size),
  bounce: (p, r, size) => (p + r > size ? size - (p + r - size) : p + r),
};

const toMap = (obj) => new Map(Object.entries(obj ?? {}).map(([k, v]) => [Number(k), v]));

class Game {
  constructor(config) {
    this.size = config.size;
    this.snakes = toMap(config.snakes);
    this.ladders = toMap(config.ladders);
    this.players = config.players;
    this.rolls = config.rolls;
    this.rule = config.rule;
    this.sixAgain = config.sixAgain === true;
    this.valid = this.#validate();
    this.pos = new Map((this.players ?? []).map((p) => [p, 0]));
    this.turnIndex = 0;
    this.rollCount = 0;
    this.won = '';
  }

  // Check everything up front, so a bad config can never half-work.
  #validate() {
    const { size, players, rolls } = this;
    if (!Number.isInteger(size) || size < 6) return false;
    if (!Array.isArray(players) || players.length < 2 || new Set(players).size !== players.length) return false;
    if (!Array.isArray(rolls) || rolls.length === 0 || !rolls.every((r) => Number.isInteger(r) && r >= 1 && r <= 6)) return false;
    if (!(this.rule in RULES)) return false;
    const inRange = (s) => Number.isInteger(s) && s >= 1 && s <= size;
    for (const [map, down] of [[this.snakes, true], [this.ladders, false]]) {
      for (const [from, to] of map) {
        if (!inRange(from) || !inRange(to) || from >= size) return false;
        if (down ? from <= to : to <= from) return false;
      }
    }
    for (const from of this.snakes.keys()) if (this.ladders.has(from)) return false;
    const starts = new Set([...this.snakes.keys(), ...this.ladders.keys()]);
    for (const to of [...this.snakes.values(), ...this.ladders.values()]) if (starts.has(to)) return false; // a chain
    return true;
  }

  isValid() {
    return this.valid;
  }

  turn() {
    if (!this.valid) return 'INVALID';
    if (this.won) return 'OVER';
    const player = this.players[this.turnIndex];
    const roll = this.rolls[this.rollCount++ % this.rolls.length];
    const from = this.pos.get(player);
    const landed = RULES[this.rule](from, roll, this.size);
    let to = from;
    let event = 'stay';
    if (landed !== null) {
      to = landed;
      event = 'move';
      if (this.snakes.has(landed)) { to = this.snakes.get(landed); event = 'snake'; }
      else if (this.ladders.has(landed)) { to = this.ladders.get(landed); event = 'ladder'; }
    }
    if (to === this.size) { event = 'win'; this.won = player; }
    this.pos.set(player, to);
    if (!this.won && !(roll === 6 && this.sixAgain)) this.turnIndex = (this.turnIndex + 1) % this.players.length;
    return { player, roll, from, to, event };
  }

  position(player) {
    return this.valid && this.pos.has(player) ? this.pos.get(player) : -1;
  }

  winner() {
    return this.won;
  }

  next() {
    return this.valid && !this.won ? this.players[this.turnIndex] : '';
  }
}

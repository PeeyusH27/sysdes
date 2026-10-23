// A snake and a ladder are the same thing pointing different ways, so the board stores one map of jumps.
export class Board {
  constructor(size, jumps) {                        // jumps: square -> square, e.g. [[4, 14], [17, 7]]
    this.size = size;
    this.jumps = new Map(jumps);
    for (const [from, to] of this.jumps) {
      if (from < 1 || from >= size) throw new RangeError(`a jump cannot start on ${from}`);   // never on the last square
      if (to < 1 || to > size || to === from) throw new RangeError(`bad jump ${from} -> ${to}`);
      if (this.jumps.has(to)) throw new RangeError(`${from} lands on the start of another jump`);  // no chains, so no cycles
    }
  }

  land(square) { return this.jumps.get(square) ?? square; }
  kindAt(square) { const to = this.jumps.get(square); return to === undefined ? 'move' : to > square ? 'ladder' : 'snake'; }
}

// Strategy 1: where the roll comes from. The game never knows if it is random.
export class RandomDice {
  constructor(rng = Math.random, sides = 6) { this.rng = rng; this.sides = sides; }
  roll() { return 1 + Math.floor(this.rng() * this.sides); }
}

export class FixedDice {                            // for tests and demos: the same rolls, in order, then again
  constructor(rolls) { this.rolls = rolls; this.next = 0; }
  roll() { return this.rolls[this.next++ % this.rolls.length]; }
}

// Strategy 2: how the last square is reached. A rule maps (position, roll, size) to a square, or null if the move is refused.
export const exact = (pos, roll, size) => (pos + roll > size ? null : pos + roll);      // must land on the last square
export const finish = (pos, roll, size) => Math.min(pos + roll, size);                  // any roll that reaches it wins
export const bounce = (pos, roll, size) => {                                            // the extra steps walk back
  const target = pos + roll;
  return target > size ? size - (target - size) : target;
};

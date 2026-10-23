import { test, expect } from 'vitest';
import { Board, FixedDice, RandomDice, bounce, exact, finish } from './models.js';
import { Game } from './game.js';

const make = (rolls, { jumps = [], size = 10, rule, sixAgain } = {}) =>
  new Game({ board: new Board(size, jumps), players: ['A', 'B'], dice: new FixedDice(rolls), rule, sixAgain });

test('players alternate, and each move reports where it started and ended', () => {
  const g = make([3, 4]);
  expect(g.play()).toEqual({ player: 'A', roll: 3, from: 0, to: 3, event: 'move' });
  expect(g.play()).toEqual({ player: 'B', roll: 4, from: 0, to: 4, event: 'move' });
  expect(g.play().player).toBe('A');
});

test('a ladder carries the player up', () => {
  const g = make([3], { jumps: [[3, 8]] });
  expect(g.play()).toMatchObject({ to: 8, event: 'ladder' });
});

test('a snake carries the player down', () => {
  const g = make([5], { jumps: [[9, 2]] });
  g.position.set('A', 4);
  expect(g.play()).toMatchObject({ from: 4, to: 2, event: 'snake' });
});

test('exact rule: an overshoot stays put, and an exact landing wins', () => {
  const g = make([3, 1, 2], { rule: exact });
  g.position.set('A', 8);
  expect(g.play()).toMatchObject({ player: 'A', to: 8, event: 'stay' });
  g.play();                                                           // B rolls 1
  expect(g.play()).toMatchObject({ player: 'A', to: 10, event: 'win' });
  expect(g.winner).toBe('A');
});

test('finish rule: any roll that reaches the last square wins', () => {
  const g = make([5], { rule: finish });
  g.position.set('A', 8);
  expect(g.play()).toMatchObject({ to: 10, event: 'win' });
});

test('bounce rule: the extra steps walk back from the last square', () => {
  expect(bounce(8, 4, 10)).toBe(8);
  expect(bounce(8, 6, 10)).toBe(6);
  expect(bounce(8, 2, 10)).toBe(10);
});

test('a six gives another turn only when the rule is on', () => {
  const on = make([6, 2], { sixAgain: true });
  expect(on.play().player).toBe('A');
  expect(on.play().player).toBe('A');                                  // 6 again, then 2 ends the extra turn
  expect(on.play().player).toBe('B');
  const off = make([6, 2]);
  expect(off.play().player).toBe('A');
  expect(off.play().player).toBe('B');
});

test('a ladder to the last square wins', () => {
  const g = make([2], { jumps: [[2, 10]] });
  expect(g.play()).toMatchObject({ to: 10, event: 'win' });
});

test('after a win nothing moves any more', () => {
  const g = make([6], { rule: finish });
  g.position.set('A', 6);
  g.play();
  expect(g.play()).toBeNull();
  expect(g.position.get('B')).toBe(0);
});

test('the board rejects jumps that would break the game', () => {
  expect(() => new Board(10, [[10, 3]])).toThrow(RangeError);          // from the last square
  expect(() => new Board(10, [[4, 11]])).toThrow(RangeError);          // off the board
  expect(() => new Board(10, [[4, 4]])).toThrow(RangeError);           // goes nowhere
  expect(() => new Board(10, [[3, 6], [6, 1]])).toThrow(RangeError);   // a chain, which could loop
  expect(new Board(10, [[3, 6], [8, 1]]).land(8)).toBe(1);
});

test('listeners hear every move', () => {
  const g = make([1, 2]);
  const heard = [];
  g.on(r => heard.push(`${r.player}:${r.to}`));
  g.play(); g.play();
  expect(heard).toEqual(['A:1', 'B:2']);
});

test('the dice are swappable: fixed rolls repeat, seeded random rolls stay in 1 to 6', () => {
  const fixed = new FixedDice([2, 5]);
  expect([fixed.roll(), fixed.roll(), fixed.roll()]).toEqual([2, 5, 2]);
  let seed = 11;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const dice = new RandomDice(rng);
  const seen = new Set();
  for (let i = 0; i < 600; i++) { const r = dice.roll(); expect(r >= 1 && r <= 6).toBe(true); seen.add(r); }
  expect(seen.size).toBe(6);
});

import { describe, expect, test } from "vitest";
import { autoProbe, isDone, isWasted, midOf, newGame, probe, solve, worstCase, type Game, type Mode } from "../BinarySearchLab";

const game = (mode: Mode, n: number, secret: number): Game => ({ mode, n, secret, lo: 1, hi: n, probes: [] });

describe("halving finds the answer", () => {
  test("exact match: every secret in 1..200 is found within ⌈log2(n + 1)⌉ guesses", () => {
    for (const n of [1, 2, 3, 7, 8, 100, 200])
      for (let s = 1; s <= n; s++) {
        const g = solve("guess", n, s);
        expect(g.probes.at(-1)).toMatchObject({ x: s, result: "hit" });
        expect(g.probes.length).toBeLessThanOrEqual(worstCase("guess", n));
      }
  });
  test("first true: the first bad build matches a linear scan, within ⌈log2 n⌉ checks", () => {
    for (let n = 1; n <= 64; n++)
      for (let s = 1; s <= n; s++) {
        const g = solve("bad", n, s);
        const linear = Array.from({ length: n }, (_, i) => i + 1).find((v) => v >= s);
        expect(g.lo).toBe(linear);
        expect(g.probes.length).toBeLessThanOrEqual(worstCase("bad", n));
      }
  });
  test("worst cases match the textbook numbers", () => {
    expect(worstCase("guess", 100)).toBe(7);
    expect(worstCase("guess", 1000)).toBe(10);
    expect(worstCase("guess", 1)).toBe(1);
    expect(worstCase("bad", 16)).toBe(4);
    expect(worstCase("bad", 17)).toBe(5);
    expect(worstCase("bad", 1)).toBe(0);
  });
  test("some secret really needs the worst case (the bound is tight)", () => {
    const most = Math.max(...Array.from({ length: 100 }, (_, i) => solve("guess", 100, i + 1).probes.length));
    expect(most).toBe(7);
  });
});

describe("invariant: the secret never leaves [lo, hi]", () => {
  test("for any sequence of reader checks, wasted or not", () => {
    for (const mode of ["guess", "bad"] as const)
      for (let seed = 1; seed < 60; seed++) {
        let g = newGame(mode, 24, seed);
        const picks = [12, 3, 20, 3, 18, 7, 24, 1, 15, 9, 22, 5];
        for (const x of picks) {
          g = probe(g, x);
          expect(g.lo).toBeLessThanOrEqual(g.secret);
          expect(g.secret).toBeLessThanOrEqual(g.hi);
          if (isDone(g)) break;
        }
      }
  });
  test("halving always shrinks the range (mid rounds down, so mid < hi)", () => {
    let g = game("bad", 2, 2);
    expect(midOf(g.lo, g.hi)).toBe(1);
    g = autoProbe(g);
    expect([g.lo, g.hi]).toEqual([2, 2]);
    expect(isDone(g)).toBe(true);
  });
});

describe("feedback and wasted checks", () => {
  test("too low / too high / hit narrow the range like the exact-match template", () => {
    let g = game("guess", 100, 42);
    g = probe(g, 50);
    expect(g.probes[0].result).toBe("high");
    expect([g.lo, g.hi]).toEqual([1, 49]);
    g = probe(g, 30);
    expect([g.lo, g.hi]).toEqual([31, 49]);
    g = probe(g, 60);
    expect(g.probes.at(-1)!.wasted).toBe(true);
    expect([g.lo, g.hi]).toEqual([31, 49]);
    g = probe(g, 42);
    expect(isDone(g)).toBe(true);
    expect(probe(g, 41)).toBe(g); // finished games ignore further checks
  });
  test("first bad build: good moves lo past it, bad pulls hi onto it", () => {
    let g = game("bad", 16, 11);
    g = probe(g, 8);
    expect(g.probes[0].result).toBe("good");
    expect([g.lo, g.hi]).toEqual([9, 16]);
    g = probe(g, 12);
    expect([g.lo, g.hi]).toEqual([9, 12]);
    expect(isWasted(g, 5)).toBe(true); // below lo: known good
    expect(isWasted(g, 14)).toBe(true); // past a bad build: known bad
    expect(isWasted(g, 12)).toBe(true);
    expect(isWasted(g, 10)).toBe(false);
  });
  test("ignores checks outside 1..n and non-integers", () => {
    const g = game("guess", 10, 3);
    expect(probe(g, 0)).toBe(g);
    expect(probe(g, 11)).toBe(g);
    expect(probe(g, 2.5)).toBe(g);
  });
  test("new games are deterministic and in range", () => {
    expect(newGame("guess", 100, 5).secret).toBe(newGame("guess", 100, 5).secret);
    for (let seed = 0; seed < 200; seed++) {
      const s = newGame("bad", 9, seed).secret;
      expect(s >= 1 && s <= 9).toBe(true);
    }
  });
});

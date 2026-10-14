import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { bruteLongestUnique, bruteMaxSumK, cleanLetters, fixedFrames, parseNums, randomCase, uniqueFrames } from "../SlidingWindowLab";

const randomWord = (rnd: () => number, n: number, alphabet = "abcde") => Array.from({ length: n }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join("");

test("input cleaning: letters only, lower case, capped", () => {
  expect(cleanLetters("Ab-c 9d")).toBe("abcd");
  expect(cleanLetters("abcdefghijklmnop")).toHaveLength(12);
  expect(parseNums("2, 1 -5 x")).toEqual([2, 1, -5]);
});

test("the default word: “vdfabc” is the longest run without repeats", () => {
  const frames = uniqueFrames("dvdfabcda");
  const end = frames.at(-1)!;
  expect(end.action).toBe("done");
  expect(end.bestVal).toBe(6);
  expect("dvdfabcda".slice(end.best![0], end.best![1] + 1)).toBe("vdfabc");
  expect(end.ops).toBeLessThanOrEqual(2 * 9);
});

test("no repeats: matches a brute force on many random words", () => {
  const rnd = mulberry32(5);
  for (let t = 0; t < 400; t++) {
    const s = randomWord(rnd, Math.floor(rnd() * 13));
    const end = uniqueFrames(s).at(-1)!;
    expect(end.bestVal, s).toBe(bruteLongestUnique(s));
  }
});

test("no repeats invariants: counts match the window, edges only move forward, each index enters once and leaves at most once", () => {
  const rnd = mulberry32(8);
  for (let t = 0; t < 200; t++) {
    const s = randomWord(rnd, 1 + Math.floor(rnd() * 12), "abcd");
    const frames = uniqueFrames(s);
    let prev = frames[0];
    for (const f of frames.slice(1, -1)) {
      expect(f.l).toBeGreaterThanOrEqual(prev.l);
      expect(f.r).toBeGreaterThanOrEqual(prev.r);
      const real = new Map<string, number>();
      for (const c of s.slice(f.l, f.r + 1)) real.set(c, (real.get(c) ?? 0) + 1);
      expect(new Map(f.counts)).toEqual(real);
      // valid exactly when no letter repeats; the repeat is named while invalid
      const repeats = [...real.entries()].filter(([, n]) => n > 1).map(([c]) => c);
      expect(repeats).toEqual(f.dup ? [f.dup] : []);
      expect(f.ops).toBe(f.r + 1 + f.l);
      if (f.best) expect(new Set(s.slice(f.best[0], f.best[1] + 1)).size).toBe(f.bestVal);
      prev = f;
    }
    expect(frames.at(-1)!.ops).toBeLessThanOrEqual(2 * s.length);
  }
});

test("fixed k: the running sum always equals the real window sum, and the best matches a brute force", () => {
  const rnd = mulberry32(13);
  for (let t = 0; t < 300; t++) {
    const nums = Array.from({ length: 1 + Math.floor(rnd() * 10) }, () => Math.floor(rnd() * 21) - 10);
    const k = 1 + Math.floor(rnd() * nums.length);
    const frames = fixedFrames(nums, k);
    for (const f of frames.slice(1, -1)) {
      expect(f.sum).toBe(nums.slice(f.l, f.r + 1).reduce((a, b) => a + b, 0));
      expect(f.r - f.l + 1).toBeLessThanOrEqual(k);
      if (f.action === "slide") expect(f.r - f.l + 1).toBe(k);
    }
    const end = frames.at(-1)!;
    expect(end.bestVal).toBe(bruteMaxSumK(nums, k).best);
    expect(end.ops).toBe(k + 2 * (nums.length - k));
  }
});

test("fixed k: the default numbers peak at 12 (3 + 2 + 7), 13 operations vs 18 to re-add every window", () => {
  const nums = [2, 1, 5, 1, 3, 2, 7, 1];
  const end = fixedFrames(nums, 3).at(-1)!;
  expect(end.bestVal).toBe(12);
  expect(end.best).toEqual([4, 6]);
  expect(end.ops).toBe(13);
  expect(bruteMaxSumK(nums, 3).ops).toBe(18);
});

test("edge cases: empty input, one element, k larger than the array", () => {
  expect(uniqueFrames("").map((f) => f.action)).toEqual(["start", "done"]);
  expect(uniqueFrames("").at(-1)!.bestVal).toBe(0);
  expect(uniqueFrames("a").at(-1)!.bestVal).toBe(1);
  expect(uniqueFrames("aaaa").at(-1)!.bestVal).toBe(1);
  expect(fixedFrames([], 3).map((f) => f.action)).toEqual(["start", "done"]);
  expect(fixedFrames([4], 1).at(-1)!.bestVal).toBe(4);
  expect(fixedFrames([1, 2], 5).at(-1)!.bestVal).toBe(3);
  expect(fixedFrames([-3, -1, -2], 1).at(-1)!.bestVal).toBe(-1);
});

test("shuffles are deterministic and valid input", () => {
  expect(randomCase(4, "unique")).toBe(randomCase(4, "unique"));
  expect(cleanLetters(randomCase(4, "unique"))).toBe(randomCase(4, "unique"));
  expect(parseNums(randomCase(4, "fixed")).length).toBeGreaterThanOrEqual(8);
});

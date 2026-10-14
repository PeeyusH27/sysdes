import { describe, expect, test } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { bracketFrames, bruteBalanced, bruteNextGreater, countsLookBalanced, ngeFrames, parseNums } from "../StackLab";

const balanced = (s: string) => bracketFrames(s).at(-1)!.verdict === "balanced";

describe("bracket matcher", () => {
  test("classic cases", () => {
    expect(balanced("{[()]}")).toBe(true);
    expect(balanced("()[]{}")).toBe(true);
    expect(balanced("")).toBe(true);
    expect(balanced("([)]")).toBe(false);
    expect(balanced("(()")).toBe(false);
    expect(balanced(")(")).toBe(false);
    expect(balanced("(a[b]c)")).toBe(true); // non-brackets are skipped
  });
  test("agrees with deleting adjacent pairs on every bracket string up to length 6", () => {
    const alphabet = "()[]{}";
    const all = (len: number): string[] => (len === 0 ? [""] : all(len - 1).flatMap((p) => [...alphabet].map((c) => p + c)));
    for (let len = 0; len <= 6; len++) for (const s of all(len)) expect(balanced(s), s).toBe(bruteBalanced(s));
  });
  test("the stack only ever holds openers, each still unmatched, in the order they opened", () => {
    const r = mulberry32(3);
    for (let t = 0; t < 300; t++) {
      const s = Array.from({ length: 10 }, () => "()[]{}"[Math.floor(r() * 6)]).join("");
      for (const f of bracketFrames(s)) {
        expect(f.stack.every((i) => "([{".includes(s[i]))).toBe(true);
        expect(f.stack.every((i, k) => k === 0 || f.stack[k - 1] < i)).toBe(true);
        expect(f.stack.every((i) => i < f.pos)).toBe(true);
      }
    }
  });
  test("stops at the first crossing and names the opener on top", () => {
    const frames = bracketFrames("([)]");
    expect(frames.at(-1)!.event).toEqual({ kind: "mismatch", i: 2, opener: 1 });
    expect(frames.at(-1)!.pos).toBe(3);
    expect(bracketFrames("())(").at(-1)!.event).toEqual({ kind: "extra", i: 2 });
  });
  test("counting alone is fooled by crossings, the stack is not", () => {
    expect(countsLookBalanced("([)]")).toBe(true);
    expect(bruteBalanced("([)]")).toBe(false);
    expect(countsLookBalanced("(()")).toBe(false);
  });
});

describe("next greater with a monotonic stack", () => {
  test("matches the brute force on fixed and random inputs, with no more than 2n comparisons", () => {
    const cases = [[], [5], [2, 7, 3, 5, 4, 6, 1, 8], [8, 6, 7, 3, 5, 2, 4, 9], [5, 4, 3, 2, 1], [1, 2, 3, 4], [3, 3, 3]];
    const r = mulberry32(9);
    for (let t = 0; t < 200; t++) cases.push(Array.from({ length: 1 + Math.floor(r() * 10) }, () => Math.floor(r() * 6)));
    for (const nums of cases) {
      const last = ngeFrames(nums).at(-1)!;
      expect(last.ans, nums.join(",")).toEqual(bruteNextGreater(nums).ans);
      expect(last.comparisons).toBeLessThanOrEqual(2 * nums.length);
    }
  });
  test("values on the stack never increase from bottom to top, after every step", () => {
    const r = mulberry32(21);
    for (let t = 0; t < 200; t++) {
      const nums = Array.from({ length: 9 }, () => Math.floor(r() * 20));
      for (const f of ngeFrames(nums)) for (let k = 1; k < f.stack.length; k++) expect(nums[f.stack[k - 1]]).toBeGreaterThanOrEqual(nums[f.stack[k]]);
    }
  });
  test("each index is pushed once and popped at most once; popping j at i means i is j's answer", () => {
    const nums = [8, 6, 7, 3, 5, 2, 4, 9];
    const frames = ngeFrames(nums);
    const popped = frames.flatMap((f) => f.popped);
    expect(new Set(popped).size).toBe(popped.length);
    for (const f of frames) for (const j of f.popped) expect(f.ans[j]).toBe(f.i);
    expect(frames.at(-1)!.stack).toEqual([7]);
  });
  test("the stack wins big on a falling run: n − 1 pushes wait for one big value", () => {
    const nums = [9, 8, 7, 6, 5, 4, 3, 10];
    expect(bruteNextGreater(nums).comparisons).toBe(28);
    expect(ngeFrames(nums).at(-1)!.comparisons).toBe(13);
  });
  test("parses typed numbers", () => {
    expect(parseNums("3, 1  4,x,150")).toEqual([3, 1, 4, 99]);
    expect(parseNums("1 2 3 4 5 6 7 8 9 10")).toHaveLength(8);
    expect(parseNums("")).toEqual([]);
  });
});

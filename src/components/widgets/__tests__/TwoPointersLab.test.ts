import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { allPairs, autoFrames, autoMove, pairInRange, parseSorted, playMove, randomCase, startPtr, status, type Ptr } from "../TwoPointersLab";

const solve = (nums: number[], target: number) => {
  const frames = autoFrames(nums, target);
  const end = frames.at(-1)!;
  return { end, found: status(nums, target, end) === "found", checks: end.checks, frames };
};

test("parseSorted reads free text, clamps, caps and sorts numerically", () => {
  expect(parseSorted("10 9 1")).toEqual([1, 9, 10]);
  expect(parseSorted("-5, 200 3")).toEqual([-5, 3, 99]);
  expect(parseSorted("1 2 3 4 5 6 7 8 9 10 11")).toHaveLength(10);
});

test("the default story: 4 + 13 = 17 in 4 checks instead of 28 pairs", () => {
  const nums = [1, 3, 4, 6, 8, 11, 13, 15];
  const { end, found, checks } = solve(nums, 17);
  expect(found).toBe(true);
  expect([nums[end.l], nums[end.r]]).toEqual([4, 13]);
  expect(checks).toBe(4);
  expect(allPairs(nums.length)).toBe(28);
});

test("agrees with a brute force on many random sorted inputs, within n - 1 checks", () => {
  const rnd = mulberry32(3);
  for (let t = 0; t < 500; t++) {
    const n = Math.floor(rnd() * 11);
    const nums = Array.from({ length: n }, () => Math.floor(rnd() * 30) - 10).sort((a, b) => a - b);
    const target = Math.floor(rnd() * 50) - 15;
    const { end, found, checks } = solve(nums, target);
    expect(found, `${nums} → ${target}`).toBe(pairInRange(nums, target, 0, n - 1) !== null);
    if (found) expect(nums[end.l] + nums[end.r]).toBe(target);
    expect(checks).toBeLessThanOrEqual(Math.max(0, n - 1));
    expect(end.wasted).toBe(0);
  }
});

test("invariant: the pattern never discards an answer (if one exists, it stays inside [l, r])", () => {
  const rnd = mulberry32(11);
  for (let t = 0; t < 300; t++) {
    const nums = Array.from({ length: 2 + Math.floor(rnd() * 9) }, () => Math.floor(rnd() * 20)).sort((a, b) => a - b);
    const target = Math.floor(rnd() * 40);
    const exists = pairInRange(nums, target, 0, nums.length - 1) !== null;
    for (const p of autoFrames(nums, target)) {
      expect(p.l).toBeLessThanOrEqual(p.r + 1);
      if (exists) expect(pairInRange(nums, target, p.l, p.r)).not.toBeNull();
      if (p.last) expect(p.last.kind).toBe("safe");
    }
  }
});

test("judging the reader's moves: safe, risky and lost", () => {
  const nums = [1, 3, 4, 6, 8, 11, 13, 15];
  let p: Ptr = startPtr(nums); // 1 + 15 = 16 < 17
  expect(autoMove(nums, 17, p)).toBe("L");
  p = playMove(nums, 17, p, "R"); // drops 15 without proof, answers remain
  expect(p.last).toMatchObject({ kind: "risky", sum: 16, move: "R" });
  p = playMove(nums, 17, p, "R"); // drops 13: 6 + 11 still there
  expect(p.last!.kind).toBe("risky");
  p = playMove(nums, 17, p, "R"); // drops 11: the last answer
  expect(p.last!.kind).toBe("lost");
  expect(p.lost).toEqual([3, 5]);
  expect(p.wasted).toBe(3);
  p = playMove(nums, 17, p, "L");
  expect(p.last!.kind).toBe("safe");
  expect(p.lost).toEqual([3, 5]); // remembered
});

test("moves stop once the pair is found or the pointers meet", () => {
  const found = autoFrames([2, 7], 9).at(-1)!;
  expect(status([2, 7], 9, found)).toBe("found");
  expect(playMove([2, 7], 9, found, "L")).toBe(found);
  const met = autoFrames([1, 2], 10).at(-1)!;
  expect(status([1, 2], 10, met)).toBe("met");
  expect(playMove([1, 2], 10, met, "R")).toBe(met);
});

test("edge cases: empty, one element, duplicates", () => {
  expect(solve([], 5).frames).toHaveLength(1);
  expect(status([], 5, startPtr([]))).toBe("met");
  expect(solve([5], 10).found).toBe(false);
  expect(solve([5, 5], 10).found).toBe(true);
  expect(startPtr([5]).checks).toBe(0);
});

test("shuffled cases are sorted, deterministic and solvable", () => {
  for (let s = 1; s < 60; s++) {
    const c = randomCase(s);
    expect(randomCase(s)).toEqual(c);
    expect([...c.nums].sort((a, b) => a - b)).toEqual(c.nums);
    expect(solve(c.nums, c.target).found).toBe(true);
  }
});

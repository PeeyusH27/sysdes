import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { bruteTwoSum, bucketOf, parseNums, randomCase, twoSumFrames, type HashFrame } from "../HashingLab";

const answer = (frames: HashFrame[]) => {
  const f = frames.at(-1)!;
  return f.phase === "found" ? [f.hit!, f.i] : null;
};

test("bucketOf keeps negative numbers in range", () => {
  expect(bucketOf(9, 7)).toBe(2);
  expect(bucketOf(-3, 7)).toBe(4);
  expect(bucketOf(-14, 7)).toBe(0);
  expect(bucketOf(5, 1)).toBe(0);
});

test("parseNums reads free text, clamps and caps the count", () => {
  expect(parseNums("3, 8 -2")).toEqual([3, 8, -2]);
  expect(parseNums("1000 -500")).toEqual([99, -99]);
  expect(parseNums("1 2 3 4 5 6 7 8 9 10 11 12")).toHaveLength(10);
  expect(parseNums("abc")).toEqual([]);
});

test("the default story: [5, 6] after 7 lookups, while nested loops check all 21 pairs", () => {
  const nums = [3, 8, 11, 4, 15, 7, 2];
  const frames = twoSumFrames(nums, 9, 7);
  expect(answer(frames)).toEqual([5, 6]);
  expect(frames.at(-1)!.lookups).toBe(7);
  expect(bruteTwoSum(nums, 9)).toEqual({ pair: [5, 6], checks: 21 });
});

test("matches a brute force on many random inputs, and finds the pair with the earliest second index", () => {
  const rnd = mulberry32(7);
  for (let t = 0; t < 400; t++) {
    const n = Math.floor(rnd() * 11);
    const nums = Array.from({ length: n }, () => Math.floor(rnd() * 21) - 10);
    const target = Math.floor(rnd() * 21) - 10;
    const B = 1 + Math.floor(rnd() * 7);
    const got = answer(twoSumFrames(nums, target, B));
    let earliest: number | null = null;
    for (let j = 0; j < n && earliest === null; j++) for (let i = 0; i < j; i++) if (nums[i] + nums[j] === target) earliest = j;
    expect(got !== null, `${nums} → ${target}`).toBe(bruteTwoSum(nums, target).pair !== null);
    if (got) {
      const [i, j] = got;
      expect(i).toBeLessThan(j);
      expect(nums[i] + nums[j]).toBe(target);
      expect(j).toBe(earliest);
    }
  }
});

test("invariant: the map holds exactly the values seen before the current index, each in its own bucket", () => {
  const rnd = mulberry32(99);
  for (let t = 0; t < 150; t++) {
    const nums = Array.from({ length: 1 + Math.floor(rnd() * 10) }, () => Math.floor(rnd() * 15) - 5);
    const B = 1 + Math.floor(rnd() * 7);
    for (const f of twoSumFrames(nums, 100, B)) {
      const stored = f.table.flat();
      f.table.forEach((chain, b) => chain.forEach((e) => expect(bucketOf(e.v, B)).toBe(b)));
      expect(new Set(stored.map((e) => e.v)).size).toBe(stored.length);
      for (const e of stored) expect(nums.indexOf(e.v)).toBe(e.i); // the first index is kept
      const seenUpTo = f.phase === "store" ? f.i + 1 : Math.max(0, f.i);
      expect(new Set(stored.map((e) => e.v))).toEqual(new Set(nums.slice(0, seenUpTo)));
      if (f.phase === "look") expect(f.lookups).toBe(f.i + 1);
    }
  }
});

test("one bucket turns every lookup into a scan of everything stored", () => {
  const nums = [1, 2, 3, 4, 5, 6];
  const frames = twoSumFrames(nums, 100, 1);
  expect(frames.at(-1)!.phase).toBe("none");
  expect(frames.at(-1)!.compared).toBe(0 + 1 + 2 + 3 + 4 + 5); // = n(n-1)/2, the nested loop again
  const spread = twoSumFrames(nums, 100, 7).at(-1)!.compared;
  expect(spread).toBeLessThan(15);
});

test("a repeated value keeps its first index, and x never pairs with itself", () => {
  expect(answer(twoSumFrames([3, 4], 6, 7))).toBeNull();
  expect(answer(twoSumFrames([3, 3], 6, 7))).toEqual([0, 1]);
  const frames = twoSumFrames([5, 5, 1], 100, 3);
  const dup = frames.find((f) => f.phase === "store" && f.i === 1)!;
  expect(dup.added).toBe(false);
  expect(dup.table.flat()).toEqual([{ v: 5, i: 0 }]);
});

test("edge cases: empty and single-element input", () => {
  expect(twoSumFrames([], 5, 7).map((f) => f.phase)).toEqual(["start", "none"]);
  expect(twoSumFrames([5], 10, 7).map((f) => f.phase)).toEqual(["start", "look", "store", "none"]);
  expect(bruteTwoSum([], 1)).toEqual({ pair: null, checks: 0 });
});

test("shuffled cases always have an answer and are deterministic", () => {
  for (let s = 1; s < 60; s++) {
    const c = randomCase(s);
    expect(randomCase(s)).toEqual(c);
    expect(c.nums.length).toBeLessThanOrEqual(10);
    expect(bruteTwoSum(c.nums, c.target).pair).not.toBeNull();
  }
});

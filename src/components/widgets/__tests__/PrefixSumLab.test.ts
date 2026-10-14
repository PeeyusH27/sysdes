import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { bruteCountK, parseNums, prefixSums, query, randomQuery, rangeSum, sumKFrames, type RangeState } from "../PrefixSumLab";

const randomNums = (rnd: () => number, n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 21) - 10);
const loopSum = (nums: number[], l: number, r: number) => nums.slice(l, r + 1).reduce((a, b) => a + b, 0);

test("parseNums clamps to −20…20 and caps the count", () => {
  expect(parseNums("3 -1 x 40 -40")).toEqual([3, -1, 20, -20]);
  expect(parseNums("1 2 3 4 5 6 7 8 9 10 11")).toHaveLength(10);
});

test("prefix sums have n + 1 entries and start at 0", () => {
  expect(prefixSums([3, -1, 4, 1, -5, 9, 2, -6])).toEqual([0, 3, 2, 6, 7, 2, 11, 13, 7]);
  expect(prefixSums([])).toEqual([0]);
});

test("every range sum is P[r + 1] − P[l], negatives included", () => {
  const rnd = mulberry32(21);
  for (let t = 0; t < 200; t++) {
    const nums = randomNums(rnd, 1 + Math.floor(rnd() * 10));
    const P = prefixSums(nums);
    for (let l = 0; l < nums.length; l++) for (let r = l; r < nums.length; r++) expect(rangeSum(P, l, r)).toBe(loopSum(nums, l, r));
  }
  expect(rangeSum(prefixSums([3, -1, 4, 1, -5, 9, 2, -6]), 2, 5)).toBe(9);
});

test("the query tally: one subtraction per query, r − l + 1 numbers for the loop", () => {
  let s: RangeState = { l: 2, r: 5, queries: 0, loopAdds: 0, seq: 0 };
  expect(query(s, 2, 5)).toBe(s); // same range: not a new query
  s = query(s, 0, 7);
  s = query(s, 3, 3);
  expect(s).toMatchObject({ l: 3, r: 3, queries: 2, loopAdds: 8 + 1 });
  let q: RangeState = { l: 0, r: 0, queries: 0, loopAdds: 0, seq: 0 };
  for (let i = 0; i < 50; i++) {
    q = randomQuery(q, 8);
    expect(q.l).toBeGreaterThanOrEqual(0);
    expect(q.l).toBeLessThanOrEqual(q.r);
    expect(q.r).toBeLessThan(8);
  }
  expect(q.loopAdds).toBeGreaterThan(q.queries); // the loop always does at least as much work
  expect(randomQuery({ l: 0, r: 0, queries: 0, loopAdds: 0, seq: 7 }, 8)).toEqual(randomQuery({ l: 0, r: 0, queries: 0, loopAdds: 0, seq: 7 }, 8));
});

test("subarrays = k: the default numbers have 4 (two found on the last step)", () => {
  const nums = [3, -1, 4, 1, -5, 9, 2, -6];
  const frames = sumKFrames(nums, 5);
  const end = frames.at(-1)!;
  expect(end.total).toBe(4);
  expect(bruteCountK(nums, 5)).toBe(4);
  expect(end.hits).toEqual([2, 5]); // subarrays 2..7 and 5..7
  for (const j of end.hits) expect(loopSum(nums, j, end.i)).toBe(5);
});

test("subarrays = k matches a brute force, and every hit is a real subarray", () => {
  const rnd = mulberry32(34);
  for (let t = 0; t < 300; t++) {
    const nums = randomNums(rnd, Math.floor(rnd() * 11)).map((x) => Math.round(x / 3));
    const k = Math.floor(rnd() * 9) - 4;
    const frames = sumKFrames(nums, k);
    expect(frames.at(-1)!.total, `${nums} k=${k}`).toBe(bruteCountK(nums, k));
    const P = prefixSums(nums);
    for (const f of frames.slice(1)) {
      expect(f.sum).toBe(P[f.i + 1]);
      for (const j of f.hits) expect(rangeSum(P, j, f.i)).toBe(k);
      // invariant: the map counts exactly the prefixes P[0..i+1]
      const real = new Map<number, number>();
      for (const p of P.slice(0, f.i + 2)) real.set(p, (real.get(p) ?? 0) + 1);
      expect(new Map(f.seen)).toEqual(real);
    }
  }
});

test("k = 0 never counts the empty subarray", () => {
  expect(sumKFrames([1, 2, 3], 0).at(-1)!.total).toBe(0);
  expect(sumKFrames([1, -1, 0], 0).at(-1)!.total).toBe(bruteCountK([1, -1, 0], 0));
});

test("edge cases: empty and one element", () => {
  expect(sumKFrames([], 3)).toHaveLength(1);
  expect(sumKFrames([], 3)[0].seen).toEqual([[0, 1]]);
  expect(sumKFrames([3], 3).at(-1)!.total).toBe(1);
  expect(bruteCountK([], 0)).toBe(0);
});

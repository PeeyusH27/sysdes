import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { applyWrite, newestSeen, pickReplicas, quorumInfo, staleReadProbability } from "../QuorumPlayground";

test("pickReplicas returns k distinct, sorted indices and is deterministic per seed", () => {
  const a = pickReplicas(7, 4, mulberry32(1));
  const b = pickReplicas(7, 4, mulberry32(1));
  expect(a).toEqual(b);
  expect(new Set(a).size).toBe(4);
  expect([...a].sort((x, y) => x - y)).toEqual(a);
  expect(a.every((i) => i >= 0 && i < 7)).toBe(true);
  expect(pickReplicas(3, 3, mulberry32(9))).toEqual([0, 1, 2]);
});

test("quorumInfo: R + W > N guarantees overlap", () => {
  expect(quorumInfo(3, 2, 2)).toEqual({ overlap: true, minOverlap: 1, writeTolerates: 1, readTolerates: 1 });
  expect(quorumInfo(3, 1, 1).overlap).toBe(false);
  expect(quorumInfo(5, 3, 3).minOverlap).toBe(1);
  expect(quorumInfo(5, 5, 1).overlap).toBe(true);
});

test("stale probability is C(N−W, R) / C(N, R)", () => {
  expect(staleReadProbability(3, 2, 2)).toBe(0);
  expect(staleReadProbability(3, 1, 1)).toBeCloseTo(2 / 3);
  expect(staleReadProbability(5, 2, 2)).toBeCloseTo(3 / 10); // C(3,2)/C(5,2)
  expect(staleReadProbability(7, 1, 1)).toBeCloseTo(6 / 7);
});

test("with R + W > N every random read sees the newest write", () => {
  const rand = mulberry32(42);
  for (const [n, w, r] of [
    [3, 2, 2],
    [5, 3, 3],
    [7, 4, 4],
    [5, 1, 5],
  ]) {
    for (let k = 0; k < 200; k++) {
      const versions = applyWrite(Array(n).fill(1), pickReplicas(n, w, rand), 2);
      expect(newestSeen(versions, pickReplicas(n, r, rand))).toBe(2);
    }
  }
});

test("with R + W ≤ N some reads are stale", () => {
  const rand = mulberry32(7);
  let stale = 0;
  for (let k = 0; k < 600; k++) {
    const versions = applyWrite([1, 1, 1], pickReplicas(3, 1, rand), 2);
    if (newestSeen(versions, pickReplicas(3, 1, rand)) < 2) stale++;
  }
  expect(stale / 600).toBeGreaterThan(0.55);
  expect(stale / 600).toBeLessThan(0.78);
});

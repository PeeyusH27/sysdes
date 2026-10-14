import { test, expect } from "vitest";
import { before, board, expectedPick, finish, initHeap, isHeap, pick, pushValue, sortCost, stepHeap, streamValue, type HeapState, type Keep } from "../HeapLab";

/** Push every value of `xs` (each operation run to the end), checking the heap property after every single move. */
function run(xs: number[], k: number, keep: Keep) {
  let s = initHeap(k, keep);
  for (const x of xs) {
    s = pushValue(s, x);
    for (let guard = 0; s.phase.kind !== "idle"; guard++) {
      expect(guard).toBeLessThan(40);
      s = stepHeap(s);
      // Mid-sift only the moving value may be out of place; once idle the whole array must be a heap.
      if (s.phase.kind === "idle") expect(isHeap(s.heap, keep)).toBe(true);
    }
    expect(s.heap.length).toBeLessThanOrEqual(k);
  }
  return s;
}
const brute = (xs: number[], k: number, keep: Keep) => [...xs].sort((a, b) => (keep === "largest" ? b - a : a - b)).slice(0, k);

test("keeps exactly the k largest with a min-heap, and the root is the kth largest", () => {
  const xs = [3, 1, 5, 12, 2, 11, 7];
  const s = run(xs, 3, "largest");
  expect(board(s)).toEqual([12, 11, 7]);
  expect(s.heap[0].v).toBe(7);
});

test("keeps the k smallest with a max-heap", () => {
  const xs = [40, 8, 15, 4, 23, 16, 42];
  const s = run(xs, 3, "smallest");
  expect(board(s)).toEqual([4, 8, 15]);
  expect(s.heap[0].v).toBe(15);
});

test("matches a brute-force sort on many random streams, for every k and both directions", () => {
  for (let trial = 0; trial < 60; trial++) {
    const xs = Array.from({ length: 5 + (trial % 17) }, (_, i) => streamValue(trial * 31 + i));
    for (const keep of ["largest", "smallest"] as Keep[]) {
      for (let k = 1; k <= 7; k++) {
        const s = run(xs, k, keep);
        expect(board(s)).toEqual(brute(xs, k, keep));
        expect(s.heap.length).toBe(Math.min(k, xs.length));
      }
    }
  }
});

test("duplicates and k = 1", () => {
  expect(board(run([4, 4, 1, 4, 2], 2, "largest"))).toEqual([4, 4]);
  expect(board(run([9, 2, 9, 1], 1, "largest"))).toEqual([9]);
  expect(board(run([9, 2, 9, 1], 1, "smallest"))).toEqual([1]);
});

test("empty and one element", () => {
  const empty = initHeap(3, "largest");
  expect(board(empty)).toEqual([]);
  expect(expectedPick(empty)).toBeNull();
  expect(pick(empty, 0)).toBe(empty);
  const one = finish(pushValue(empty, 42));
  expect(board(one)).toEqual([42]);
  expect(one.comps).toBe(0);
});

test("the streamed path: Step pulls the next value, and the stream is deterministic", () => {
  let s = initHeap(3, "largest");
  const seen: number[] = [];
  for (let i = 0; i < 200; i++) {
    if (s.phase.kind === "idle") seen.push(streamValue(s.streamPos));
    s = stepHeap(s);
  }
  s = finish(s);
  expect(s.seen).toBe(seen.length);
  expect(board(s)).toEqual(brute(seen, 3, "largest"));
  expect(streamValue(5)).toBe(streamValue(5));
  for (let n = 0; n < 50; n++) {
    expect(streamValue(n)).toBeGreaterThanOrEqual(1);
    expect(streamValue(n)).toBeLessThanOrEqual(99);
  }
});

test("a full heap evicts its root: the k+1 value that is too small bubbles to the top and leaves", () => {
  let s = run([10, 20, 30], 3, "largest");
  s = pushValue(s, 5);
  expect(s.last).toMatchObject({ kind: "land", i: 3 });
  s = stepHeap(s); // 5 < 20 (its parent): swap up
  expect(s.last?.kind).toBe("swap");
  s = stepHeap(s); // 5 < 10: swap up to the root; heap now holds k + 1
  expect(s.phase.kind).toBe("evict");
  s = stepHeap(s);
  expect(s.last).toMatchObject({ kind: "evict" });
  expect(s.out.at(-1)?.v).toBe(5);
  s = finish(s);
  expect(board(s)).toEqual([30, 20, 10]);
});

test("comparisons grow like n log k, far below re-sorting after every arrival", () => {
  const xs = Array.from({ length: 200 }, (_, i) => streamValue(i));
  const s = run(xs, 3, "largest");
  // each value: at most 2 comparisons up (height 2) + at most 2 levels down × 2 children
  expect(s.comps).toBeLessThanOrEqual(200 * 6);
  let naive = 0;
  for (let n = 1; n <= 200; n++) naive += sortCost(n);
  expect(s.naive).toBe(naive);
  expect(s.naive).toBeGreaterThan(20 * s.comps);
  expect(sortCost(1)).toBe(0);
  expect(sortCost(8)).toBe(24);
});

test("game mode: the expected pick is the swap partner, the value itself when it stays, or the root to evict", () => {
  let s: HeapState = run([10, 20, 30], 3, "largest");
  s = pushValue(s, 5); // lands at index 3, parent is 20 (index 1)
  const parent = s.heap[1];
  expect(expectedPick(s)).toBe(parent.id);
  const wrong = pick(s, s.heap[2].id);
  expect(wrong.miss).toBe(s.heap[2].id);
  expect(wrong.misses).toBe(1);
  expect(wrong.heap).toEqual(s.heap);
  s = pick(s, parent.id);
  expect(s.miss).toBeNull();
  s = pick(s, expectedPick(s)!); // swap with the root
  expect(s.phase.kind).toBe("evict");
  expect(expectedPick(s)).toBe(s.heap[0].id);
  s = pick(s, s.heap[0].id);
  // the last leaf moved to the root; it sifts down or stays
  while (s.phase.kind !== "idle") {
    const want = expectedPick(s)!;
    if (s.phase.kind === "down") {
      const i = s.phase.i;
      const kids = [2 * i + 1, 2 * i + 2].filter((c) => c < s.heap.length).map((c) => s.heap[c]);
      const best = kids.reduce((a, b) => (before("largest", b.v, a.v) ? b : a));
      expect(want).toBe(before("largest", best.v, s.heap[i].v) ? best.id : s.heap[i].id);
    }
    s = pick(s, want);
  }
  expect(isHeap(s.heap, "largest")).toBe(true);
  expect(board(s)).toEqual([30, 20, 10]);
});

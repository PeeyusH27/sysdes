import { test, expect } from "vitest";
import { bfsFrames, grow, levelsByDepth, minDepth, prune, rightView, type BfsMode } from "../TreeBfsLab";
import { has, nodesOf, parseTree, randomTree, type Slots } from "../TreeDfsLab";

const T = parseTree("8 3 10 1 6 null 14 null null 4 7").slots;
const vals = (t: Slots, ids: number[]) => ids.map((i) => t[i]);
const end = (t: Slots, mode: BfsMode, snapshot = true) => bfsFrames(t, mode, snapshot).at(-1)!;

test("level order on the page's tree", () => {
  expect(end(T, "levels").levels.map((l) => vals(T, l))).toEqual([[8], [3, 10], [1, 6, 14], [4, 7]]);
  expect(vals(T, end(T, "right").right)).toEqual([8, 10, 14, 7]);
});

test("BFS levels and right view match a brute force by depth, on many random trees", () => {
  for (let seed = 1; seed < 60; seed++) {
    const t = randomTree(seed, 20);
    const fr = bfsFrames(t, "levels");
    expect(fr.at(-1)!.levels).toEqual(levelsByDepth(t));
    expect(end(t, "right").right).toEqual(rightView(t));
    expect(fr.at(-1)!.dequeued).toBe(nodesOf(t).length); // each node once: O(n)
  }
});

test("invariant: when a level starts, the queue holds exactly that level", () => {
  for (let seed = 1; seed < 40; seed++) {
    const t = randomTree(seed);
    const byDepth = levelsByDepth(t);
    for (const f of bfsFrames(t, "levels").filter((f) => f.kind === "level")) {
      expect(f.queue).toEqual(byDepth[f.level]);
      expect(f.left).toBe(byDepth[f.level].length);
    }
  }
});

test("min depth stops at the first leaf, matches a brute force, and dequeues no more than needed", () => {
  for (let seed = 1; seed < 60; seed++) {
    const t = randomTree(seed);
    const f = end(t, "min");
    expect(f.kind).toBe("stop");
    expect(f.level + 1).toBe(minDepth(t));
    // everything dequeued is no deeper than the answer
    expect(f.levels.flat().length).toBe(f.dequeued);
    expect(f.dequeued).toBeLessThanOrEqual(nodesOf(t).length);
  }
  const f = end(T, "min");
  expect(vals(T, [f.cur!])).toEqual([1]);
  expect(f.dequeued).toBe(4); // 8, 3, 10, 1: half the tree never touched
});

test("the live-length bug merges every level into one and miscounts min depth", () => {
  const f = end(T, "levels", false);
  expect(f.levels).toHaveLength(1);
  expect(vals(T, f.levels[0])).toEqual([8, 3, 10, 1, 6, 14, 4, 7]);
  expect(vals(T, end(T, "right", false).right)).toEqual([7]);
  expect(end(T, "min", false).level + 1).toBe(1);
  expect(minDepth(T)).toBe(3);
});

test("prune removes a whole subtree; grow only attaches under an existing parent", () => {
  const p = prune(T, 1); // the 3 subtree
  expect(vals(p, nodesOf(p))).toEqual([8, 10, 14]);
  expect(grow(p, 3, 5)).toBe(p); // parent slot 1 is empty now
  const g = grow(p, 1, 5);
  expect(g[1]).toBe(5);
  expect(grow(g, 1, 9)).toBe(g); // occupied
  expect(has(prune(T, 0), 0)).toBe(false);
});

test("edge cases: empty tree and a single node", () => {
  const empty = parseTree("").slots;
  expect(bfsFrames(empty, "levels").map((f) => f.kind)).toEqual(["start", "done"]);
  expect(minDepth(empty)).toBe(0);
  const one = parseTree("4").slots;
  expect(end(one, "levels").levels).toEqual([[0]]);
  expect(end(one, "min").level + 1).toBe(1);
});

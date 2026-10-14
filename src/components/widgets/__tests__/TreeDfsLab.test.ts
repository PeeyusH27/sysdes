import { test, expect } from "vitest";
import { allPaths, depthOf, describeFrame, dfsFrames, has, height, isLeaf, left, nodesOf, parseTree, randomTree, right, serializeTree, traverse, type Order, type Slots } from "../TreeDfsLab";

const vals = (t: Slots, ids: number[]) => ids.map((i) => t[i]);
const T = parseTree("8 3 10 1 6 null 14 null null 4 7").slots;
const ORDERS: Order[] = ["pre", "in", "post"];

test("parseTree reads LeetCode level order, including gaps", () => {
  expect(vals(T, nodesOf(T))).toEqual([8, 3, 10, 1, 6, 14, 4, 7]);
  expect(T[left(4)]).toBe(4); // 6's children are 4 and 7
  expect(T[right(4)]).toBe(7);
  expect(T[right(2)]).toBe(14);
  // a null's children are not listed: 2's left is null, so 3 and 4 belong to 3 (slot 2)
  const u = parseTree("1 null 2 3 4").slots;
  expect([u[2], u[5], u[6]]).toEqual([2, 3, 4]);
});

test("parseTree trims trees deeper than four levels and flags odd tokens", () => {
  const deep = parseTree("1 2 null 3 null 4 null 5");
  expect(deep.trimmed).toBe(true);
  expect(height(deep.slots)).toBe(4);
  expect(parseTree("1 two 3").bad).toEqual(["two"]);
  expect(parseTree("").slots.every((v) => v === null)).toBe(true);
});

test("serializeTree round-trips random trees", () => {
  for (let seed = 1; seed < 40; seed++) {
    const t = randomTree(seed);
    expect(parseTree(serializeTree(t)).slots).toEqual(t);
    expect(nodesOf(t).length).toBeGreaterThanOrEqual(5);
    for (const i of nodesOf(t)) if (i > 0) expect(has(t, (i - 1) >> 1)).toBe(true); // no orphans
  }
});

test("the textbook orders on the page's tree", () => {
  expect(vals(T, traverse(T, "pre"))).toEqual([8, 3, 1, 6, 4, 7, 10, 14]);
  expect(vals(T, traverse(T, "in"))).toEqual([1, 3, 4, 6, 7, 8, 10, 14]);
  expect(vals(T, traverse(T, "post"))).toEqual([1, 4, 7, 6, 3, 14, 10, 8]);
});

test("the walk visits nodes in the reference order, and the stack never exceeds the height", () => {
  for (let seed = 1; seed < 30; seed++) {
    const t = randomTree(seed);
    for (const o of ORDERS) {
      const fr = dfsFrames(t, o);
      expect(fr.at(-1)!.visited).toEqual(traverse(t, o));
      expect(Math.max(...fr.map((f) => f.stack.length))).toBe(height(t));
      // every push is matched by a pop: each node is entered once and left once
      expect(fr.filter((f) => f.kind === "leave").length).toBe(nodesOf(t).length);
      // the stack is always a root-down path: each frame is the parent of the next
      for (const f of fr) f.stack.forEach((i, k) => k && expect((i - 1) >> 1).toBe(f.stack[k - 1]));
    }
  }
});

test("path sum finds exactly the root-to-leaf paths a brute force finds", () => {
  for (let seed = 1; seed < 30; seed++) {
    const t = randomTree(seed);
    for (let target = 0; target <= 40; target += 3) {
      const want = allPaths(t).filter((p) => p.reduce((s, i) => s + t[i]!, 0) === target);
      const fr = dfsFrames(t, "sum", target);
      expect(fr.at(-1)!.found).toEqual(want);
      expect(fr.at(-1)!.checked.map((c) => c.node)).toEqual(allPaths(t).map((p) => p.at(-1)));
    }
  }
  const fr = dfsFrames(T, "sum", 21);
  expect(fr.at(-1)!.found.map((p) => vals(T, p))).toEqual([[8, 3, 6, 4]]);
  // carried down: each frame's need = the parent's need minus the node's value
  for (const f of fr) f.needs.forEach((n, k) => expect(n).toBe((k ? f.needs[k - 1] : 21) - T[f.stack[k]]!));
});

test("edge cases: empty tree and a single node", () => {
  const empty = parseTree("").slots;
  expect(dfsFrames(empty, "pre").map((f) => f.kind)).toEqual(["start", "done"]);
  expect(describeFrame(empty, "pre", 0, dfsFrames(empty, "pre")[0])).toMatch(/empty/);
  const one = parseTree("5").slots;
  expect(isLeaf(one, 0)).toBe(true);
  expect(dfsFrames(one, "in").map((f) => f.kind)).toEqual(["start", "enter", "visit", "leave", "done"]);
  expect(dfsFrames(one, "sum", 5).at(-1)!.found).toEqual([[0]]);
  expect(depthOf(14)).toBe(3);
});

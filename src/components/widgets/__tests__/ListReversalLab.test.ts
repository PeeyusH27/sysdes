import { test, expect } from "vitest";
import { applyOp, autoOps, describe as say, expectedOrder, initMachine, isDone, lostCars, nextMove, parseCars, readFrom, result, type Machine, type Op } from "../ListReversalLab";

const play = (mc: Machine, ops: Op[]) => ops.reduce((s, op) => applyOp(s, op).m, mc);
const values = (mc: Machine) => result(mc).ids.map((i) => mc.labels[i]);
/** Brute force: copy into an array, reverse the slice, read it back. */
const brute = (a: string[], l = 0, r = a.length - 1) => [...a.slice(0, l), ...a.slice(l, r + 1).reverse(), ...a.slice(r + 1)];

test("parseCars: splits on spaces or commas, caps the count and the label length", () => {
  expect(parseCars("1, 2  3")).toEqual(["1", "2", "3"]);
  expect(parseCars("a b c d e f g h")).toHaveLength(6);
  expect(parseCars("long")).toEqual(["lon"]);
  expect(parseCars("   ")).toEqual([]);
});

test("the textbook moves reverse whole lists of every length, matching a brute-force reverse", () => {
  for (let n = 0; n <= 6; n++) {
    const labels = Array.from({ length: n }, (_, i) => String(i + 1));
    const mc = play(initMachine(labels), autoOps(n, null));
    expect(isDone(mc), `n = ${n}`).toBe(true);
    expect(values(mc)).toEqual(brute(labels));
    expect(mc.moves).toBe(4 * n);
    expect(lostCars(mc)).toEqual([]);
  }
});

test("reversing positions m..n splices the segment back, for every m ≤ n", () => {
  const labels = ["a", "b", "c", "d", "e", "f"];
  for (let l = 0; l < 6; l++)
    for (let r = l; r < 6; r++) {
      const mc0 = initMachine(labels, [l, r]);
      const mc = play(mc0, autoOps(6, mc0.range));
      expect(values(mc), `${l}..${r}`).toEqual(brute(labels, l, r));
      expect(isDone(mc)).toBe(true);
    }
});

test("invariant on the textbook path: nothing is lost, and after each full step prev heads the reversed part, curr the rest", () => {
  const labels = ["1", "2", "3", "4", "5"];
  let mc = initMachine(labels);
  autoOps(5, null).forEach((op, i) => {
    mc = applyOp(mc, op).m;
    expect(lostCars(mc)).toEqual([]);
    if (op !== "curr") return;
    const k = (i + 1) / 4; // cars flipped so far
    expect(readFrom(mc, mc.vars.prev).ids).toEqual(Array.from({ length: k }, (_, j) => k - 1 - j));
    expect(mc.vars.curr === null ? [] : readFrom(mc, mc.vars.curr).ids).toEqual(Array.from({ length: 5 - k }, (_, j) => k + j));
  });
  expect(isDone(mc)).toBe(true);
});

test("flipping before saving loses the rest of the train", () => {
  const mc = applyOp(initMachine(["1", "2", "3", "4"]), "flip").m;
  expect(lostCars(mc)).toEqual([1, 2, 3]);
  expect(nextMove(mc).onPath).toBe(false);
  expect(say(initMachine(["1", "2", "3", "4"]), "flip", mc)).toMatch(/lost/);
});

test("moving prev before the flip makes a car point at itself", () => {
  const mc = play(initMachine(["1", "2", "3"]), ["save", "prev", "flip"]);
  expect(mc.next[0]).toBe(0);
  expect(readFrom(mc, 0).cycle).toBe(true);
  expect(isDone(mc)).toBe(false);
});

test("illegal moves are refused with a reason and change nothing", () => {
  const mc = initMachine(["1", "2"]);
  const r = applyOp(mc, "curr");
  expect(r.error).toMatch(/next hasn't been saved/);
  expect(r.m).toBe(mc);
  expect(applyOp(mc, "linkBefore").error).toMatch(/doesn't exist/);
  const end = play(mc, autoOps(2, null));
  expect(applyOp(end, "save").error).toMatch(/curr is null/);
});

test("nextMove follows the reader along the textbook path and spots when they leave it", () => {
  let mc = initMachine(["x", "y", "z"]);
  const ops = autoOps(3, null);
  for (const op of ops) {
    expect(nextMove(mc)).toEqual({ op, onPath: true });
    mc = applyOp(mc, op).m;
  }
  expect(nextMove(mc)).toEqual({ op: null, onPath: true });
  expect(nextMove(applyOp(initMachine(["x", "y"]), "prev").m).onPath).toBe(false);
});

test("edge cases: empty and one-car trains", () => {
  const empty = initMachine([]);
  expect(isDone(empty)).toBe(true);
  expect(nextMove(empty)).toEqual({ op: null, onPath: true });
  expect(initMachine([], [0, 0]).range).toBeNull();
  const one = play(initMachine(["7"]), autoOps(1, null));
  expect(values(one)).toEqual(["7"]);
  expect(expectedOrder(3, [1, 1])).toEqual([0, 1, 2]);
});

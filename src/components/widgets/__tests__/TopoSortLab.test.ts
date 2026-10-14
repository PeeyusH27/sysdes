import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { CYCLE_EDGE, DEFAULT_EDGES, N, findCycle, initTopo, isDone, isStuck, runAll, stepOne, stepRound, take, toggleEdge, type Edge } from "../TopoSortLab";

const pos = (order: number[]) => new Map(order.map((v, i) => [v, i]));
const forward = (order: number[], edges: Edge[]) => {
  const p = pos(order);
  return edges.every(([a, b]) => p.get(a)! < p.get(b)!);
};
/** Random graph on N nodes; `dag` keeps every edge pointing from a smaller to a larger id. */
function randomEdges(seed: number, dag: boolean): Edge[] {
  const r = mulberry32(seed);
  const out: Edge[] = [];
  for (let a = 0; a < N; a++)
    for (let b = 0; b < N; b++) {
      if (a === b || (dag && a > b)) continue;
      if (r() < (dag ? 0.25 : 0.12)) out.push([a, b]);
    }
  return out;
}
/** Brute force: nodes that can be reached from some node on a cycle (they can never be placed). */
function blocked(edges: Edge[]) {
  const reach = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => i === j));
  for (const [a, b] of edges) reach[a][b] = true;
  for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
  const onCycle = (v: number) => edges.some(([a, b]) => a === v && reach[b][v]);
  return new Set(Array.from({ length: N }, (_, v) => v).filter((v) => Array.from({ length: N }, (_, u) => u).some((u) => onCycle(u) && reach[u][v])));
}
/** Longest chain, counted in nodes. */
function longestChain(edges: Edge[]) {
  const memo = new Map<number, number>();
  const f = (v: number): number => memo.get(v) ?? (memo.set(v, 1 + Math.max(0, ...edges.filter(([a]) => a === v).map(([, b]) => f(b)))), memo.get(v)!);
  return Math.max(...Array.from({ length: N }, (_, v) => f(v)));
}

test("the default course graph: Intro and Math start the queue, and the full order is valid", () => {
  const s0 = initTopo(DEFAULT_EDGES);
  expect(s0.queue).toEqual([0, 1]);
  const s = runAll(s0, "one");
  expect(s.order).toHaveLength(N);
  expect(forward(s.order, DEFAULT_EDGES)).toBe(true);
  expect(s.rounds).toBe(4); // Intro → Data str → Database → Capstone
  expect(findCycle(DEFAULT_EDGES)).toBeNull();
});

test("on random DAGs both modes give a valid order, and semesters = the longest chain", () => {
  for (let seed = 1; seed <= 80; seed++) {
    const edges = randomEdges(seed, true);
    const one = runAll(initTopo(edges), "one");
    const lvl = runAll(initTopo(edges), "level");
    for (const s of [one, lvl]) {
      expect(s.order).toHaveLength(N);
      expect(forward(s.order, edges)).toBe(true);
      expect(isStuck(s)).toBe(false);
      expect(s.indeg.every((d) => d === 0)).toBe(true);
    }
    expect(lvl.rounds).toBe(longestChain(edges));
    expect(one.rounds).toBe(longestChain(edges));
    for (const [a, b] of edges) expect(lvl.sem[a]).toBeLessThan(lvl.sem[b]);
  }
});

test("with a cycle Kahn's gets stuck, leaving exactly the nodes on or behind a cycle", () => {
  let cyclic = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const edges = randomEdges(seed, false);
    const s = runAll(initTopo(edges), "one");
    const left = new Set(Array.from({ length: N }, (_, v) => v).filter((v) => !s.order.includes(v)));
    expect(left).toEqual(blocked(edges));
    const cycle = findCycle(edges);
    expect(cycle !== null).toBe(left.size > 0);
    if (cycle) {
      cyclic++;
      expect(cycle[0]).toBe(cycle.at(-1));
      for (let i = 1; i < cycle.length; i++) expect(edges.some(([a, b]) => a === cycle[i - 1] && b === cycle[i])).toBe(true);
      expect(isStuck(s)).toBe(true);
    }
  }
  expect(cyclic).toBeGreaterThan(10);
});

test("Make a cycle: Capstone → Data str closes Data str → … → Capstone; removing it restores the order", () => {
  const edges = toggleEdge(DEFAULT_EDGES, ...CYCLE_EDGE);
  const cycle = findCycle(edges)!;
  expect(cycle).toContain(7);
  expect(cycle).toContain(2);
  const s = runAll(initTopo(edges), "level");
  expect(s.order.sort()).toEqual([0, 1, 3, 4]); // Intro, Math, Systems, Discrete
  expect(toggleEdge(edges, ...CYCLE_EDGE)).toEqual(DEFAULT_EDGES);
  expect(toggleEdge(DEFAULT_EDGES, 3, 3)).toBe(DEFAULT_EDGES);
});

test("taking a course yourself: only ready courses can be taken, and the readout names what is missing", () => {
  let s = initTopo(DEFAULT_EDGES);
  const tooEarly = take(s, 6); // Algo needs Data str and Discrete
  expect(tooEarly.order).toEqual([]);
  expect(tooEarly.last).toEqual({ kind: "blocked", node: 6, waits: [2, 4] });
  s = take(s, 1); // Math first is fine: any ready course is a valid choice
  expect(s.order).toEqual([1]);
  expect(s.last).toMatchObject({ kind: "take", node: 1, released: [4], lowered: [4] });
  expect(take(s, 1)).toBe(s); // already placed: nothing happens
  expect(take(take(s, 4), 6).last).toEqual({ kind: "blocked", node: 6, waits: [2] }); // Discrete done, Data str still missing
});

test("one step of each mode, finished runs, and an empty graph", () => {
  const s = initTopo(DEFAULT_EDGES);
  expect(stepOne(s).order).toEqual([0]);
  const r1 = stepRound(s);
  expect(r1.order).toEqual([0, 1]);
  expect(r1.last).toEqual({ kind: "round", nodes: [0, 1], released: [2, 3, 4] });
  const done = runAll(s, "one");
  expect(isDone(done)).toBe(true);
  expect(stepOne(done)).toBe(done);
  expect(stepRound(done)).toBe(done);
  const empty = runAll(initTopo([]), "level");
  expect(empty.rounds).toBe(1);
  expect(empty.order).toHaveLength(N);
});

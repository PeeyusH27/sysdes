import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import {
  NAMES,
  ROADS,
  allRoutes,
  complete,
  frontier,
  initState,
  isStale,
  neighbours,
  pickNode,
  roadBetween,
  routeTo,
  runAll,
  shuffleWeights,
  sortedHeap,
  stepDijkstra,
  type DState,
  type Road,
} from "../ShortestPathLab";

const N = NAMES.length;

/** Reference: Bellman-Ford on the undirected roads. */
function bellman(roads: Road[], n: number, src: number) {
  const d = Array<number>(n).fill(Infinity);
  d[src] = 0;
  for (let r = 0; r < n; r++)
    for (const { a, b, w } of roads) {
      if (d[a] + w < d[b]) d[b] = d[a] + w;
      if (d[b] + w < d[a]) d[a] = d[b] + w;
    }
  return d;
}

function randomRoads(seed: number, n: number, m: number): Road[] {
  const rnd = mulberry32(seed);
  const out: Road[] = [];
  for (let i = 0; i < m; i++) {
    const a = Math.floor(rnd() * n);
    let b = Math.floor(rnd() * n);
    if (b === a) b = (a + 1) % n;
    out.push({ a, b, w: 1 + Math.floor(rnd() * 12) });
  }
  return out;
}

test("the default map: A → C → B → D → E → F costs 12, with stale entries for B, D, E and F", () => {
  const s = runAll(ROADS, N, 0);
  expect(s.dist).toEqual([0, 3, 2, 8, 11, 12]);
  expect(routeTo(s, 5)).toEqual([0, 2, 1, 3, 4, 5]);
  expect(s.order).toEqual([0, 2, 1, 3, 4, 5]);
  expect(s.stale).toBe(4);
  expect(s.pops).toBe(10);
  expect(s.checks).toBe(2 * ROADS.length); // every road is read once from each end
});

test("the first steps relax A's roads, then C improves B from 4 to 3", () => {
  let s = initState(N, 0);
  s = stepDijkstra(ROADS, s);
  expect(s.last).toMatchObject({ kind: "settle", u: 0 });
  expect(s.dist.slice(0, 3)).toEqual([0, 4, 2]);
  s = stepDijkstra(ROADS, s);
  expect(s.last.kind === "settle" && s.last.u).toBe(2);
  expect(s.last.kind === "settle" && s.last.relax.find((r) => r.v === 1)).toMatchObject({ from: 4, to: 3, better: true });
  // the old [4, B] entry stays in the heap (lazy deletion), already stale
  const old = s.heap.find((e) => e.v === 1 && e.d === 4)!;
  expect(isStale(s, old)).toBe(true);
  expect(isStale(s, s.heap.find((e) => e.v === 1 && e.d === 3)!)).toBe(false);
});

test("Dijkstra matches Bellman-Ford on random graphs, and every route cost matches", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const n = 3 + (seed % 6);
    const roads = randomRoads(seed, n, n + (seed % 7));
    const s = runAll(roads, n, 0);
    expect(s.dist).toEqual(bellman(roads, n, 0));
    for (let t = 0; t < n; t++) {
      const p = routeTo(s, t);
      if (s.dist[t] === Infinity) expect(p).toBeNull();
      else {
        const cost = p!.slice(1).reduce((sum, v, i) => sum + Math.min(...roads.filter((r) => (r.a === p![i] && r.b === v) || (r.b === p![i] && r.a === v)).map((r) => r.w)), 0);
        expect(cost).toBe(s.dist[t]);
      }
    }
  }
});

test("brute force agrees: the cheapest of all simple routes equals Dijkstra's answer", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const roads = shuffleWeights(ROADS, seed);
    const s = runAll(roads, N, 0);
    for (let t = 1; t < N; t++) expect(Math.min(...allRoutes(roads, N, 0, t).map((r) => r.cost))).toBe(s.dist[t]);
  }
  expect(allRoutes(ROADS, N, 0, 5).length).toBeGreaterThan(5);
});

test("invariants after every step: settled in non-decreasing order, settled distances never change, heap sorted", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const roads = shuffleWeights(ROADS, seed);
    let s: DState = initState(N, 0);
    const final: (number | undefined)[] = [];
    let lastSettled = -Infinity;
    while (!complete(s)) {
      s = stepDijkstra(roads, s);
      if (s.last.kind === "settle") {
        expect(s.dist[s.last.u]).toBeGreaterThanOrEqual(lastSettled);
        lastSettled = s.dist[s.last.u];
        final[s.last.u] = s.dist[s.last.u];
      }
      s.settled.forEach((ok, v) => ok && expect(s.dist[v]).toBe(final[v]));
      const h = sortedHeap(s);
      for (let i = 1; i < h.length; i++) expect(h[i].d).toBeGreaterThanOrEqual(h[i - 1].d);
    }
    expect(stepDijkstra(roads, s)).toBe(s); // finished: no-op
  }
});

test("pick mode: only a closest unsettled town is accepted, and any tie order gives the same distances", () => {
  let s = initState(N, 0);
  expect(pickNode(ROADS, s, 1)).toBeNull(); // B isn't reachable yet
  s = pickNode(ROADS, s, 0)!;
  expect(pickNode(ROADS, s, 1)).toBeNull(); // B is 4, C is 2
  s = pickNode(ROADS, s, 2)!;
  expect(s.dist[1]).toBe(3);

  // ties: two roads of equal length out of A
  const tie: Road[] = [
    { a: 0, b: 1, w: 2 },
    { a: 0, b: 2, w: 2 },
    { a: 1, b: 3, w: 5 },
    { a: 2, b: 3, w: 1 },
  ];
  const play = (prefer: (f: number[], st: DState) => number) => {
    let st = initState(4, 0);
    while (frontier(st).length) {
      const f = frontier(st);
      const min = Math.min(...f.map((v) => st.dist[v]));
      st = pickNode(tie, st, prefer(f.filter((v) => st.dist[v] === min), st))!;
    }
    return st;
  };
  const first = play((f) => f[0]);
  const lastTie = play((f) => f[f.length - 1]);
  expect(first.dist).toEqual([0, 2, 2, 3]);
  expect(lastTie.dist).toEqual(first.dist);
  expect(first.heap).toEqual([]); // stale entries are cleared in pick mode
});

test("edge cases: one town, an unreachable town, helpers", () => {
  const one = runAll([], 1, 0);
  expect(one.dist).toEqual([0]);
  expect(routeTo(one, 0)).toEqual([0]);
  const cut = runAll([{ a: 0, b: 1, w: 3 }], 3, 0);
  expect(cut.dist).toEqual([0, 3, Infinity]);
  expect(routeTo(cut, 2)).toBeNull();
  expect(allRoutes([{ a: 0, b: 1, w: 3 }], 3, 0, 2)).toEqual([]);
  expect(neighbours(ROADS, 0).map((x) => x.v)).toEqual([1, 2]);
  expect(roadBetween(ROADS, 2, 1)).toBe(2);
  const sh = shuffleWeights(ROADS, 7);
  expect(sh.every((r) => r.w >= 1 && r.w <= 12)).toBe(true);
  expect(shuffleWeights(ROADS, 7)).toEqual(sh); // deterministic
});

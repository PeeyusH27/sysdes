import { test, expect } from "vitest";
import { N, chain, climb, depth, find, initUF, randomPair, stepUF, tallest, union, type Opts, type UFState } from "../UnionFindLab";

const ALL: Opts[] = [
  { byRank: true, compress: true },
  { byRank: true, compress: false },
  { byRank: false, compress: true },
  { byRank: false, compress: false },
];
const rootOf = (s: UFState, x: number) => climb(s.parent, x).at(-1)!;
/** Brute force: connected components of the friendship edges, by flood fill. */
function components(edges: [number, number][]) {
  const comp = new Array<number>(N).fill(-1);
  let c = 0;
  for (let v = 0; v < N; v++) {
    if (comp[v] !== -1) continue;
    const stack = [v];
    comp[v] = c;
    while (stack.length) {
      const u = stack.pop()!;
      for (const [a, b] of edges) {
        for (const [x, y] of [[a, b], [b, a]]) {
          if (x !== u || comp[y] !== -1) continue;
          comp[y] = c;
          stack.push(y);
        }
      }
    }
    c++;
  }
  return { comp, count: c };
}
const size = (s: UFState, root: number) => s.parent.filter((_, v) => rootOf(s, v) === root).length;

test("same root exactly when connected, and count = number of components, for every combination of tricks", () => {
  for (const opts of ALL) {
    let s = initUF();
    const edges: [number, number][] = [];
    for (let i = 0; i < 30; i++) {
      const [a, b] = randomPair(i);
      s = union(s, a, b, opts);
      edges.push([a, b]);
      const ref = components(edges);
      expect(s.count).toBe(ref.count);
      expect(new Set(s.parent.map((_, v) => rootOf(s, v))).size).toBe(ref.count);
      for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) expect(rootOf(s, x) === rootOf(s, y)).toBe(ref.comp[x] === ref.comp[y]);
    }
  }
});

test("rank is always an upper bound on height; with union by rank, height ≤ log2(size)", () => {
  for (const opts of ALL) {
    let s = initUF();
    for (let i = 0; i < 40; i++) {
      s = stepUF(s, opts);
      for (let v = 0; v < N; v++) {
        if (s.parent[v] !== v) continue;
        const h = Math.max(...s.parent.map((_, x) => (rootOf(s, x) === v ? depth(s.parent, x) : 0)));
        expect(h).toBeLessThanOrEqual(s.rank[v]);
        if (opts.byRank && !opts.compress) expect(2 ** s.rank[v]).toBeLessThanOrEqual(size(s, v));
        if (opts.byRank) expect(2 ** h).toBeLessThanOrEqual(size(s, v));
      }
    }
  }
});

test("union returns 'same' for a pair that is already connected: no merge, count unchanged (a cycle edge)", () => {
  const opts = ALL[0];
  let s = union(union(initUF(), 0, 1, opts), 1, 2, opts);
  const before = s.count;
  s = union(s, 2, 0, opts);
  expect(s.count).toBe(before);
  expect(s.last).toMatchObject({ kind: "same", a: 2, b: 0 });
});

test("the worst case chain: 9 links tall; one find with compression flattens it, the next costs 1 hop", () => {
  const s = chain();
  expect(tallest(s.parent)).toBe(9);
  expect(depth(s.parent, 0)).toBe(9);
  expect(s.count).toBe(1);
  const slow = find(find(s, 0, { byRank: false, compress: false }), 0, { byRank: false, compress: false });
  expect(slow.hops).toBe(18); // no compression: the same 9 hops twice
  const once = find(s, 0, { byRank: false, compress: true });
  expect(once.hops).toBe(9);
  expect(tallest(once.parent)).toBe(1);
  for (const v of climb(s.parent, 0)) expect(once.parent[v]).toBe(9);
  const twice = find(once, 0, { byRank: false, compress: true });
  expect(twice.hops - once.hops).toBe(1);
});

test("union by rank keeps the chain from forming: linking in a line stays 1 link tall", () => {
  let s = initUF();
  for (let i = 0; i + 1 < N; i++) s = union(s, i, i + 1, { byRank: true, compress: false });
  expect(tallest(s.parent)).toBe(1);
  expect(s.count).toBe(1);
});

test("without rank, a's root goes under b's root; with rank, the taller root stays on top", () => {
  const naive = union(initUF(), 3, 5, { byRank: false, compress: false });
  expect(naive.parent[3]).toBe(5);
  let s = union(initUF(), 0, 1, ALL[1]); // tie: 1 goes under 0, rank[0] = 1
  expect(s.parent[1]).toBe(0);
  s = union(s, 7, 0, ALL[1]); // 7 (rank 0) goes under 0 (rank 1) even though 7 came first
  expect(s.parent[7]).toBe(0);
  expect(s.last).toMatchObject({ kind: "union", child: 7, root: 0, tie: false });
});

test("singletons, a finished forest, and the seeded random pairs", () => {
  const s = initUF();
  expect(tallest(s.parent)).toBe(0);
  expect(find(s, 4, ALL[0]).hops).toBe(0);
  let all = s;
  for (let i = 0; i < 200 && all.count > 1; i++) all = stepUF(all, ALL[0]);
  expect(all.count).toBe(1);
  expect(stepUF(all, ALL[0])).toBe(all);
  for (let i = 0; i < 100; i++) {
    const [a, b] = randomPair(i);
    expect(a).not.toBe(b);
    expect(Math.min(a, b)).toBeGreaterThanOrEqual(0);
    expect(Math.max(a, b)).toBeLessThan(N);
  }
});

import { test, expect } from "vitest";
import { attacker, clashes, initQueens, nextSolution, reachable, solveAll, stepQueens, toggleQueen, type QState } from "../BacktrackingLab";

/** Brute force: every permutation of columns (one queen per row and column), keep the ones with no shared diagonal. */
function brute(n: number) {
  const out: number[][] = [];
  const perm = (p: number[], left: number[]) => {
    if (!left.length) {
      const ok = p.every((c, r) => p.every((d, s) => s === r || Math.abs(c - d) !== Math.abs(r - s)));
      if (ok) out.push(p);
      return;
    }
    left.forEach((x, i) => perm([...p, x], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  perm([], [...Array(n).keys()]);
  return out;
}

const safe = (cols: number[]) => cols.every((c, r) => attacker(cols, r, c) === -1);

test("solution counts match the known sequence and a brute force over permutations", () => {
  const known = [1, 0, 0, 2, 10, 4, 40, 92];
  for (let n = 1; n <= 8; n++) expect(solveAll(n).solutions.length, `n=${n}`).toBe(known[n - 1]);
  for (let n = 1; n <= 7; n++) {
    const key = (s: number[][]) => s.map((x) => x.join(",")).sort();
    expect(key(solveAll(n).solutions)).toEqual(key(brute(n)));
  }
});

test("solutions come out in lexicographic order, all distinct and valid", () => {
  const sols = solveAll(6).solutions;
  expect(sols).toEqual([
    [1, 3, 5, 0, 2, 4],
    [2, 5, 1, 4, 0, 3],
    [3, 0, 4, 1, 5, 2],
    [4, 2, 0, 5, 3, 1],
  ]);
  for (const s of solveAll(8).solutions) expect(safe(s)).toBe(true);
  expect(new Set(solveAll(8).solutions.map((s) => s.join())).size).toBe(92);
});

test("invariant after every step: the placed queens never attack each other, depth stays within n", () => {
  for (const n of [4, 5, 6]) {
    let s: QState = initQueens(n);
    let steps = 0;
    while (!s.done) {
      s = stepQueens(s);
      steps++;
      expect(safe(s.cols)).toBe(true);
      expect(s.cols.length).toBeLessThanOrEqual(n);
      expect(s.tryCol).toBeLessThanOrEqual(n);
    }
    expect(stepQueens(s)).toBe(s); // finished: no-op
    expect(steps).toBe(s.tried + s.backtracks + s.solutions.length + 1);
  }
});

test("4 × 4 walk-through: conflicts, a dead end, then the first solution [1, 3, 0, 2]", () => {
  let s = initQueens(4);
  s = stepQueens(s);
  expect(s.last).toEqual({ kind: "place", row: 0, col: 0 });
  s = stepQueens(s);
  expect(s.last).toEqual({ kind: "conflict", row: 1, col: 0, by: 0 }); // same column
  s = stepQueens(s);
  expect(s.last).toEqual({ kind: "conflict", row: 1, col: 1, by: 0 }); // diagonal
  const first = nextSolution(initQueens(4));
  expect(first.last.kind).toBe("solution");
  expect(first.solutions).toEqual([[1, 3, 0, 2]]);
  expect(first.backtracks).toBeGreaterThan(0);
  const dead = (() => {
    let x = initQueens(4);
    while (!(x.last.kind === "backtrack" && x.last.dead)) x = stepQueens(x);
    return x.last;
  })();
  expect(dead).toMatchObject({ kind: "backtrack", dead: true });
  const second = nextSolution(first);
  expect(second.solutions).toEqual([
    [1, 3, 0, 2],
    [2, 0, 3, 1],
  ]);
  expect(nextSolution(second).done).toBe(true);
});

test("pruning beats brute force by a wide margin", () => {
  const s = solveAll(8);
  expect(s.tried).toBeLessThan(8 ** 8 / 100);
  expect(s.tried).toBeGreaterThan(92 * 8);
});

test("edge cases: n = 1, n = 2 and n = 3", () => {
  expect(solveAll(1).solutions).toEqual([[0]]);
  expect(solveAll(2).solutions).toEqual([]);
  expect(solveAll(3).solutions).toEqual([]);
  expect(solveAll(2).done).toBe(true);
});

test("your-turn helpers: toggling, clashes and how many solutions stay reachable", () => {
  let b: (number | null)[] = Array(4).fill(null);
  b = toggleQueen(b, 0, 1);
  expect(b).toEqual([1, null, null, null]);
  b = toggleQueen(b, 0, 1);
  expect(b).toEqual([null, null, null, null]);
  b = toggleQueen(toggleQueen(b, 0, 0), 1, 1);
  expect(clashes(b)).toEqual([0, 1]); // diagonal
  const sols = solveAll(4).solutions;
  expect(reachable([1, null, null, null], sols)).toEqual([[1, 3, 0, 2]]);
  expect(reachable([0, null, null, null], sols)).toEqual([]); // a dead end with no clash yet
  expect(reachable([null, null, null, null], sols).length).toBe(2);
  expect(attacker([null, 2, null], 0, 0)).toBe(-1);
  expect(attacker([null, 2, null], 0, 1)).toBe(1);
});

import { test, expect } from "vitest";
import { PRESETS, bestChange, failures, firstTrap, greedyChange, parseCoins, verdict } from "../GreedyLab";

/** Brute force: fewest coins by trying every multiset (small amounts only). */
function brute(coins: number[], amount: number): number {
  let best = Infinity;
  const go = (i: number, left: number, used: number) => {
    if (left === 0) return void (best = Math.min(best, used));
    if (i === coins.length || used >= best) return;
    for (let k = Math.floor(left / coins[i]); k >= 0; k--) go(i + 1, left - k * coins[i], used + k);
  };
  go(0, amount, 0);
  return best;
}
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test("the page's example: coins 4, 3, 1 and amount 6", () => {
  expect(greedyChange([4, 3, 1], 6)).toEqual({ picks: [4, 1, 1], left: 0 });
  expect(bestChange([4, 3, 1], 6)).toEqual([3, 3]);
  expect(verdict([4, 3, 1], 6)).toBe("worse");
  expect(firstTrap([4, 3, 1])).toBe(6);
});

test("10, 7, 1 fails at 14: greedy 10 + 1 + 1 + 1 + 1, best 7 + 7", () => {
  expect(greedyChange([10, 7, 1], 14).picks).toEqual([10, 1, 1, 1, 1]);
  expect(bestChange([10, 7, 1], 14)).toEqual([7, 7]);
  expect(firstTrap([10, 7, 1])).toBe(14);
});

test("US coins are canonical: greedy is optimal for every amount up to 40", () => {
  expect(failures([...PRESETS.us]).every((v) => v === "same")).toBe(true);
  expect(firstTrap([...PRESETS.us])).toBeNull();
  expect(greedyChange([25, 10, 5, 1], 40).picks).toEqual([25, 10, 5]);
});

test("DP matches a brute force, and greedy is never better than DP", () => {
  const systems = [[4, 3, 1], [10, 7, 1], [25, 10, 5, 1], [9, 6, 5, 1], [7, 5], [12, 5, 2], [1], [6, 4]];
  for (const coins of systems)
    for (let a = 1; a <= 40; a++) {
      const best = bestChange(coins, a);
      const b = brute(coins, a);
      if (b === Infinity) expect(best, `${coins} @ ${a}`).toBeNull();
      else {
        expect(best!.length, `${coins} @ ${a}`).toBe(b);
        expect(total(best!)).toBe(a);
        expect(best!.every((c) => coins.includes(c))).toBe(true);
      }
      const g = greedyChange(coins, a);
      expect(total(g.picks) + g.left).toBe(a);
      if (!g.left) expect(g.picks.length).toBeGreaterThanOrEqual(b);
    }
});

test("greedy can get stuck when DP still finds change, and some amounts are impossible", () => {
  expect(greedyChange([5, 3], 9)).toEqual({ picks: [5, 3], left: 1 });
  expect(bestChange([5, 3], 9)).toEqual([3, 3, 3]);
  expect(verdict([5, 3], 9)).toBe("stuck");
  expect(verdict([5, 3], 7)).toBe("none");
  expect(bestChange([5, 3], 0)).toEqual([]);
});

test("parseCoins: numbers 1..50, unique, largest first, at most six", () => {
  expect(parseCoins("4, 3, 1")).toEqual([4, 3, 1]);
  expect(parseCoins("1 1 3 4")).toEqual([4, 3, 1]);
  expect(parseCoins("0, 99, 7, abc")).toEqual([7]);
  expect(parseCoins("")).toEqual([]);
  expect(parseCoins("1 2 3 4 5 6 7 8")).toEqual([8, 7, 6, 5, 4, 3]);
});

test("failure map lines up with verdicts", () => {
  const map = failures([4, 3, 1], 12);
  expect(map.length).toBe(12);
  map.forEach((v, i) => expect(v).toBe(verdict([4, 3, 1], i + 1)));
  expect(map.filter((v) => v === "worse").length).toBeGreaterThan(0);
});

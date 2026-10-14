import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { DEFAULT_LOOT, clash, describe as say, haul, initLab, naiveCalls, parseLoot, randomLoot, robBrute, robPath, robTable, stepLab, tickLab, type Lab } from "../Dp1dLab";

const run = (loot: number[]) => {
  let s: Lab = initLab(loot);
  for (let k = 0; k < 100 && s.phase !== "done"; k++) s = stepLab(s);
  return s;
};

describe("House Robber DP", () => {
  it("solves the default street: 23 from houses 0, 2, 5, 7 (every other house gives 17 or 22)", () => {
    expect(robTable(DEFAULT_LOOT)).toEqual([2, 7, 11, 11, 12, 19, 19, 23]);
    expect(robPath(DEFAULT_LOOT)).toEqual([0, 2, 5, 7]);
    expect(haul(DEFAULT_LOOT, [0, 2, 4, 6])).toBe(17);
    expect(haul(DEFAULT_LOOT, [1, 3, 5, 7])).toBe(22);
  });

  it("matches brute force on 300 random streets, and the walk back is a legal set worth the best", () => {
    const r = mulberry32(42);
    for (let t = 0; t < 300; t++) {
      const loot = Array.from({ length: Math.floor(r() * 9) }, () => Math.floor(r() * 20));
      const dp = robTable(loot);
      const best = loot.length ? dp[loot.length - 1] : 0;
      expect(best).toBe(robBrute(loot));
      const path = robPath(loot);
      expect(clash(path)).toBeNull();
      expect(haul(loot, path)).toBe(best);
      // invariant: the row never decreases, and each cell is at least its own loot
      dp.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(loot[i]);
        if (i) expect(v).toBeGreaterThanOrEqual(dp[i - 1]);
      });
    }
  });

  it("handles the edges: empty street, one house, all zeros", () => {
    expect(robTable([])).toEqual([]);
    expect(robPath([])).toEqual([]);
    expect(robBrute([])).toBe(0);
    expect(robTable([5])).toEqual([5]);
    expect(robPath([5])).toEqual([0]);
    expect(robPath([0, 0, 0])).toEqual([]);
    expect(initLab([]).phase).toBe("done");
  });

  it("counts plain-recursion calls exactly like an instrumented recursion", () => {
    for (let n = 0; n <= 10; n++) {
      let calls = 0;
      const loot = Array.from({ length: n }, (_, i) => i + 1);
      const rob = (i: number): number => {
        calls++;
        if (i < 0) return 0;
        return Math.max(rob(i - 1), loot[i] + rob(i - 2));
      };
      rob(n - 1);
      expect(naiveCalls(n)).toBe(calls);
    }
    expect(naiveCalls(8)).toBe(109);
  });
});

describe("lab steps", () => {
  it("fills one cell per step, then walks back to the same houses as robPath", () => {
    let s = initLab(DEFAULT_LOOT);
    for (let i = 0; i < DEFAULT_LOOT.length; i++) {
      s = stepLab(s);
      expect(s.last).toBe(i);
      expect(s.dp.slice(0, i + 1)).toEqual(robTable(DEFAULT_LOOT).slice(0, i + 1));
    }
    expect(s.phase).toBe("trace");
    const done = run(DEFAULT_LOOT);
    expect(done.robbed).toEqual(robPath(DEFAULT_LOOT));
    expect(stepLab(done)).toBe(done);
    expect(say(done)).toContain("Best haul: 23 from houses 0, 2, 5 and 7");
  });

  it("explains each choice and each hop", () => {
    let s = stepLab(stepLab(stepLab(stepLab(initLab(DEFAULT_LOOT)))));
    expect(say(s)).toBe("dp[3]: rob house 3 (3 + dp[1] = 10) or skip it (dp[2] = 11)? Skip wins: dp[3] = 11.");
    for (let k = 0; k < 4; k++) s = stepLab(s);
    s = stepLab(s);
    expect(say(s)).toContain("house 7 was robbed: hop to dp[5]");
  });

  it("ticks on a timer and stops (same object) when done", () => {
    let s = initLab([3, 1]);
    s = tickLab(s, 500);
    expect(s.next).toBe(0);
    s = tickLab(s, 500);
    expect(s.next).toBe(1);
    const done = run([3, 1]);
    expect(tickLab(done, 5000)).toBe(done);
  });
});

describe("input and picks", () => {
  it("parses loot lists and rejects bad ones", () => {
    expect(parseLoot("2 7, 9")).toEqual([2, 7, 9]);
    expect(parseLoot("")).toBeNull();
    expect(parseLoot("1 2 3 4 5 6 7 8 9")).toBeNull();
    expect(parseLoot("1 -2")).toBeNull();
    expect(parseLoot("1.5")).toBeNull();
    expect(parseLoot("100")).toBeNull();
  });

  it("flags neighbouring picks", () => {
    expect(clash([4, 1, 3])).toEqual([3, 4]);
    expect(clash([0, 2, 4])).toBeNull();
    expect(clash([])).toBeNull();
  });

  it("shuffles deterministically", () => {
    expect(randomLoot(7, 6)).toEqual(randomLoot(7, 6));
    expect(randomLoot(7, 6)).toHaveLength(6);
    expect(randomLoot(7, 6).every((v) => v >= 1 && v <= 12)).toBe(true);
  });
});

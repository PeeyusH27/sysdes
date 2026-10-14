import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { PRESETS, cellAt, cleanWord, describe as say, fillTable, guess, initLab, naiveCalls, stepLab, tickLab, walkBack, type Lab, type Mode } from "../Dp2dLab";

const isSubsequence = (sub: string, s: string) => {
  let k = 0;
  for (const ch of s) if (ch === sub[k]) k++;
  return k === sub.length;
};
/** Brute force: try every subsequence of a. */
const lcsBrute = (a: string, b: string) => {
  let best = 0;
  for (let mask = 0; mask < 1 << a.length; mask++) {
    const sub = [...a].filter((_, i) => mask & (1 << i)).join("");
    if (sub.length > best && isSubsequence(sub, b)) best = sub.length;
  }
  return best;
};
/** Plain recursion, no memo (fine for short words). */
const editBrute = (a: string, b: string): number => {
  if (!a.length || !b.length) return a.length + b.length;
  if (a[0] === b[0]) return editBrute(a.slice(1), b.slice(1));
  return 1 + Math.min(editBrute(a.slice(1), b.slice(1)), editBrute(a.slice(1), b), editBrute(a, b.slice(1)));
};
/** Apply an alignment ("keep K", "K→S", "−E", "+G") to a. */
const apply = (ops: string[]) =>
  ops
    .map((o) => (o.startsWith("keep ") ? o[5] : o.includes("→") ? o[2] : o[0] === "+" ? o[1] : ""))
    .join("");
const randomWord = (r: () => number, max: number) => Array.from({ length: Math.floor(r() * (max + 1)) }, () => "ABC"[Math.floor(r() * 3)]).join("");
const run = (s: Lab) => {
  for (let k = 0; k < 500 && s.phase !== "done"; k++) s = stepLab(s);
  return s;
};

describe("table fill", () => {
  it("gets the presets right", () => {
    const lcs = fillTable("CLOUD", "COLD", "lcs");
    expect(lcs[5][4]).toBe(3);
    expect(walkBack("CLOUD", "COLD", "lcs", lcs).ops.join("")).toBe("CLD");
    const ed = fillTable("KITTEN", "SITTING", "edit");
    expect(ed[6][7]).toBe(3);
    expect(walkBack("KITTEN", "SITTING", "edit", ed).ops).toEqual(["K→S", "keep I", "keep T", "keep T", "E→I", "keep N", "+G"]);
    // row 0 and column 0 are the empty prefix
    expect(ed[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ed.map((r) => r[0])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("matches brute force on 200 random pairs, and the walk back proves the answer", () => {
    const r = mulberry32(9);
    for (let t = 0; t < 200; t++) {
      const a = randomWord(r, 7);
      const b = randomWord(r, 7);
      const lcs = fillTable(a, b, "lcs");
      expect(lcs[a.length][b.length]).toBe(lcsBrute(a, b));
      const common = walkBack(a, b, "lcs", lcs).ops.join("");
      expect(common.length).toBe(lcs[a.length][b.length]);
      expect(isSubsequence(common, a) && isSubsequence(common, b)).toBe(true);

      const ed = fillTable(a, b, "edit");
      expect(ed[a.length][b.length]).toBe(editBrute(a, b));
      const w = walkBack(a, b, "edit", ed);
      expect(apply(w.ops)).toBe(b);
      expect(w.ops.filter((o) => !o.startsWith("keep")).length).toBe(ed[a.length][b.length]);
      // invariant: neighbouring LCS cells differ by at most 1, and the walk path only moves up, left or diagonally
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) expect(lcs[i][j] - lcs[i - 1][j]).toBeLessThanOrEqual(1);
      w.cells.slice(1).forEach(([i, j], n) => {
        const [pi, pj] = w.cells[n];
        expect(pi - i + pj - j).toBeGreaterThanOrEqual(1);
        expect(pi - i).toBeLessThanOrEqual(1);
        expect(pj - j).toBeLessThanOrEqual(1);
      });
    }
  });

  it("handles empty and one-letter words", () => {
    expect(fillTable("", "ABC", "edit")[0][3]).toBe(3);
    expect(walkBack("", "AB", "edit", fillTable("", "AB", "edit")).ops).toEqual(["+A", "+B"]);
    expect(fillTable("A", "A", "lcs")[1][1]).toBe(1);
    expect(fillTable("A", "B", "edit")[1][1]).toBe(1);
    expect(initLab("", "AB", "lcs").phase).toBe("done");
  });

  it("counts plain-recursion calls like an instrumented recursion", () => {
    const count = (a: string, b: string, mode: Mode) => {
      let calls = 0;
      const f = (i: number, j: number): void => {
        calls++;
        if (i === 0 || j === 0) return;
        if (a[i - 1] === b[j - 1]) return f(i - 1, j - 1);
        f(i - 1, j);
        f(i, j - 1);
        if (mode === "edit") f(i - 1, j - 1);
      };
      f(a.length, b.length);
      return calls;
    };
    for (const [a, b] of [["CLOUD", "COLD"], ["KITTEN", "SITTING"], ["ABC", "XY"], ["", "AB"]])
      for (const mode of ["lcs", "edit"] as Mode[]) expect(naiveCalls(a, b, mode)).toBe(count(a, b, mode));
    expect(naiveCalls("KITTEN", "SITTING", "edit")).toBe(3032);
  });
});

describe("lab moves", () => {
  it("fills row by row, then walks back to the corner's answer", () => {
    let s = initLab(...PRESETS.lcs, "lcs");
    expect(cellAt(s)).toEqual([1, 1]);
    s = stepLab(s);
    expect(cellAt(s)).toEqual([1, 2]);
    s = run(s);
    expect(s.k).toBe(20);
    expect(s.dp).toEqual(fillTable(...PRESETS.lcs, "lcs"));
    expect(s.w).toBe(s.walk!.cells.length);
    expect(say(s)).toBe("Longest common subsequence of CLOUD and COLD: CLD, length 3.");
    expect(stepLab(s)).toBe(s);
    expect(tickLab(s, 5000)).toBe(s);
  });

  it("scores the reader's moves and explains a wrong one", () => {
    let s = initLab("CLOUD", "COLD", "lcs");
    s = guess(s, "up"); // C = C: the diagonal + 1 wins
    expect(s.miss).toBe(1);
    expect(s.k).toBe(0);
    expect(say(s)).toContain("Not quite");
    s = guess(s, "diag");
    expect(s.right).toBe(1);
    expect(s.dp[1][1]).toBe(1);
    s = guess(s, "diag"); // C vs O: no diagonal + 1
    expect(say(s)).toBe("Not quite: C and O differ, so there is no diagonal + 1.");
    s = guess(s, "left");
    expect(s.dp[1][2]).toBe(1);
    expect(s.right).toBe(2);

    let e = initLab("KITTEN", "SITTING", "edit");
    e = guess(e, "diag"); // replace K with S: 1
    expect(e.dp[1][1]).toBe(1);
    e = guess(e, "up"); // delete costs 3, the cheapest is 2
    expect(e.oops).toContain("take the cheapest");
  });

  it("ticks on a timer", () => {
    let s = initLab("AB", "AB", "lcs");
    s = tickLab(s, 300);
    expect(s.k).toBe(0);
    s = tickLab(s, 300);
    expect(s.k).toBe(1);
  });

  it("cleans typed words", () => {
    expect(cleanWord("kit-ten 2")).toBe("KITTEN");
    expect(cleanWord("abcdefghij")).toBe("ABCDEFGH");
  });
});

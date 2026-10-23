import { describe, expect, test } from "vitest";
import { makeGrid, rotateBrute, rotateFrames, spiralBrute, spiralFrames } from "../MatrixLab";

describe("rotate in place", () => {
  test("the last frame is the grid turned 90 degrees clockwise, for every size", () => {
    for (let n = 1; n <= 7; n++) {
      const frames = rotateFrames(n);
      expect(frames.at(-1)!.grid).toEqual(rotateBrute(makeGrid(n, n)));
    }
  });
  test("3 by 3 matches the worked example", () => {
    expect(rotateFrames(3).at(-1)!.grid).toEqual([[7, 4, 1], [8, 5, 2], [9, 6, 3]]);
  });
  test("transposing swaps each pair once: n(n-1)/2 swaps, then n row reversals", () => {
    for (const n of [2, 3, 4, 5]) {
      const f = rotateFrames(n);
      expect(f.filter((x) => x.phase === "transpose")).toHaveLength((n * (n - 1)) / 2);
      expect(f.filter((x) => x.phase === "reverse")).toHaveLength(n);
    }
  });
  test("every frame still holds each value exactly once", () => {
    for (const fr of rotateFrames(5)) expect(fr.grid.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});

describe("spiral order", () => {
  test("matches the turn-when-blocked walk on every shape up to 7 by 7", () => {
    for (let rows = 1; rows <= 7; rows++) {
      for (let cols = 1; cols <= 7; cols++) {
        const walls = spiralFrames(rows, cols).map((f) => [f.r, f.c]);
        expect(walls, `${rows}x${cols}`).toEqual(spiralBrute(rows, cols));
      }
    }
  });
  test("reads every cell exactly once, in numbered order", () => {
    const f = spiralFrames(3, 4);
    expect(f).toHaveLength(12);
    expect(new Set(f.map((x) => `${x.r},${x.c}`)).size).toBe(12);
    expect(f.map((x) => x.k)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });
  test("the 3 by 3 spiral and its walls", () => {
    const f = spiralFrames(3, 3);
    expect(f.map((x) => makeGrid(3, 3)[x.r][x.c])).toEqual([1, 2, 3, 6, 9, 8, 7, 4, 5]);
    expect(f[0]).toMatchObject({ top: 0, bottom: 2, left: 0, right: 2, side: "top" });
    expect(f.at(-1)).toMatchObject({ side: "top", top: 1, bottom: 1, left: 1, right: 1 });
  });
});

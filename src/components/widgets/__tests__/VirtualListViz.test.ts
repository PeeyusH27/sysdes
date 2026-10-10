import { describe, expect, test } from "vitest";
import { maxWindow, mountedRows, NON_VIRTUAL_CAP, windowRange } from "../VirtualListViz";

describe("windowRange", () => {
  test("at the top: visible rows plus overscan below only", () => {
    // 320 px viewport / 44 px rows → rows 0..7 visible (8th partially), +3 overscan
    expect(windowRange(0, 320, 44, 10_000, 3)).toEqual({ start: 0, end: 11 });
  });

  test("in the middle: overscan on both sides", () => {
    const r = windowRange(44 * 5_000, 320, 44, 10_000, 3);
    expect(r.start).toBe(4_997);
    expect(r.end).toBe(5_000 + 8 + 3);
  });

  test("at the bottom: clamped to the list length", () => {
    const r = windowRange(44 * 10_000 - 320, 320, 44, 10_000, 3);
    expect(r.end).toBe(10_000);
    expect(r.end - r.start).toBeLessThanOrEqual(maxWindow(320, 44, 10_000, 3));
  });

  test("short lists and empty lists", () => {
    expect(windowRange(0, 320, 44, 4, 3)).toEqual({ start: 0, end: 4 });
    expect(windowRange(0, 320, 44, 0, 3)).toEqual({ start: 0, end: 0 });
  });

  test("the window size never exceeds maxWindow anywhere in the list", () => {
    for (let top = 0; top < 44 * 300; top += 7) {
      const r = windowRange(top, 320, 44, 300, 3);
      expect(r.end - r.start).toBeLessThanOrEqual(maxWindow(320, 44, 300, 3));
    }
  });
});

describe("mountedRows", () => {
  test("virtual mounts only the window; non-virtual mounts everything up to the cap", () => {
    const r = windowRange(0, 320, 44, 10_000);
    expect(mountedRows(true, 10_000, r)).toBe(11);
    expect(mountedRows(false, 10_000, r)).toBe(NON_VIRTUAL_CAP);
    expect(mountedRows(false, 500, r)).toBe(500);
  });
});

import { test, expect } from "vitest";
import { btreeHeight, btreeWriteAmp, lsmLevels, lsmPointReads, lsmWriteAmp, model } from "../IndexCostLab";

test("B-tree height grows with the log of the rows: a few levels reach billions", () => {
  expect(btreeHeight(300)).toBe(1);
  expect(btreeHeight(301)).toBe(2);
  expect(btreeHeight(1e6)).toBe(3);
  expect(btreeHeight(27_000_000)).toBe(3);
  expect(btreeHeight(1e9)).toBe(4);
  expect(btreeHeight(1e10)).toBe(5);
});

test("an LSM-tree adds a level every time the data grows by the size ratio", () => {
  const GiB = 2 ** 30;
  expect(lsmLevels(1 * GiB, 10)).toBe(2); // 64 MiB x 10 = 640 MiB < 1 GiB <= 6.4 GiB
  expect(lsmLevels(100 * GiB, 10)).toBe(4);
  expect(lsmLevels(100 * GiB, 4)).toBeGreaterThan(lsmLevels(100 * GiB, 10));
});

test("Bloom filters turn one read per level into about one read in total", () => {
  expect(lsmPointReads(4, false)).toBe(4);
  expect(lsmPointReads(4, true)).toBeCloseTo(1.03, 5);
  expect(lsmPointReads(1, true)).toBe(1);
});

test("write amplification: a B-tree rewrites a page for a small row, an LSM-tree rewrites data in compaction", () => {
  expect(btreeWriteAmp(100)).toBeCloseTo(82.92, 2);
  expect(btreeWriteAmp(8192)).toBe(2);
  expect(lsmWriteAmp(4, 10)).toBe(22);
  expect(lsmWriteAmp(4, 20)).toBeGreaterThan(lsmWriteAmp(4, 10)); // a bigger ratio means fewer levels but more rewriting per level
});

test("the model for a billion 100-byte rows", () => {
  const m = model(1e9, 100, 10);
  expect(m.height).toBe(4);
  expect(m.levels).toBe(4);
  expect(m.readLsmNoBloom).toBe(4);
  expect(m.readLsmBloom).toBeLessThan(m.readLsmNoBloom);
});

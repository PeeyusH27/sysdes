import { describe, expect, test } from "vitest";
import { initRL, pinnedToPrimary, readRL, RYW_WINDOW_MS, stepRL, writeRL, type RLState } from "../ReplicationLag";

const run = (s: RLState, ms: number) => {
  let out = s;
  for (let t = 0; t < ms; t += 50) out = stepRL(out, 50);
  return out;
};

describe("ReplicationLag model", () => {
  test("a write reaches the replicas only after the lag (with ±20% jitter)", () => {
    let s = writeRL(initRL(), 1000);
    expect(s.primary).toBe(2);
    expect(s.replicas).toEqual([1, 1]);
    s = run(s, 750); // below the 800 ms minimum
    expect(s.replicas).toEqual([1, 1]);
    s = run(s, 500); // past the 1200 ms maximum
    expect(s.replicas).toEqual([2, 2]);
    expect(s.ships).toHaveLength(0);
  });

  test("zero lag applies synchronously", () => {
    const s = writeRL(initRL(), 0);
    expect(s.replicas).toEqual([2, 2]);
    expect(s.ships).toHaveLength(0);
  });

  test("a replica read inside the lag is stale; after it, fresh", () => {
    let s = writeRL(initRL(), 2000);
    s = readRL(s, false);
    expect(s.reads[0].source).toBeGreaterThanOrEqual(0);
    expect(s.reads[0].stale).toBe(true);
    expect(s.staleCount).toBe(1);
    s = readRL(run(s, 2500), false);
    expect(s.reads[0].stale).toBe(false);
    expect(s.readCount).toBe(2);
  });

  test("read-your-writes pins reads to the primary for 5 s after a write", () => {
    let s = writeRL(initRL(), 3000);
    expect(pinnedToPrimary(s, true)).toBe(true);
    s = readRL(s, true);
    expect(s.reads[0]).toMatchObject({ source: -1, version: 2, stale: false, pinned: true });
    s = run(s, RYW_WINDOW_MS);
    expect(pinnedToPrimary(s, true)).toBe(false);
    s = readRL(s, true);
    expect(s.reads[0].source).toBeGreaterThanOrEqual(0);
  });

  test("the same seed replays the same replica choices", () => {
    const pick = () => {
      let s = initRL(5);
      const out: number[] = [];
      for (let i = 0; i < 8; i++) {
        s = readRL(s, false);
        out.push(s.reads[0].source);
      }
      return out;
    };
    expect(pick()).toEqual(pick());
    expect(new Set(pick()).size).toBe(2);
  });
});

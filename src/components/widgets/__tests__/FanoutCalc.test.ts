import { describe, expect, test } from "vitest";
import { CELEBRITY_THRESHOLD, ENTRY_BYTES, fanout, followerAxis, humanTime } from "../FanoutCalc";

describe("fanout", () => {
  test("push: writes per post equals followers; delivery = followers ÷ throughput", () => {
    const r = fanout({ followers: 2_000, postsPerDay: 3, throughput: 50_000 });
    expect(r.writesPerPost).toBe(2_000);
    expect(r.deliverSeconds).toBeCloseTo(0.04);
    expect(r.writesPerDay).toBe(6_000);
    expect(r.memoryPerDay).toBe(6_000 * ENTRY_BYTES);
    expect(r.strategy).toBe("push");
  });

  test("a celebrity: 50M followers at 100K writes/s takes over 8 minutes → pull", () => {
    const r = fanout({ followers: 50_000_000, postsPerDay: 5, throughput: 100_000 });
    expect(r.deliverSeconds).toBe(500);
    expect(humanTime(r.deliverSeconds)).toBe("8.33 min");
    expect(r.memoryPerDay).toBe(250_000_000 * ENTRY_BYTES); // 16 GB a day of feed entries
    expect(r.strategy).toBe("pull");
  });

  test("threshold and freshness rules", () => {
    expect(fanout({ followers: CELEBRITY_THRESHOLD, postsPerDay: 1, throughput: 1e6 }).strategy).toBe("pull");
    expect(fanout({ followers: 50_000, postsPerDay: 1, throughput: 5_000 }).strategy).toBe("push-queued"); // 10 s
    expect(fanout({ followers: 50_000, postsPerDay: 1, throughput: 500 }).strategy).toBe("pull"); // 100 s
  });

  test("pull read cost: followers × 10 feed opens a day", () => {
    expect(fanout({ followers: 8_640_000, postsPerDay: 1, throughput: 1e5 }).pullReadsPerSec).toBe(1_000);
  });
});

describe("helpers", () => {
  test("humanTime picks a readable unit", () => {
    expect(humanTime(0.0004)).toBe("0.4 ms");
    expect(humanTime(0.04)).toBe("40 ms");
    expect(humanTime(3.2)).toBe("3.2 s");
    expect(humanTime(7_200)).toBe("2 h");
  });

  test("followerAxis: 6 round points covering the current value", () => {
    expect(followerAxis(2_000)).toEqual([0, 500, 1_000, 1_500, 2_000, 2_500]);
    const ax = followerAxis(50_000_000);
    expect(ax.at(-1)).toBe(100_000_000);
    expect(ax).toHaveLength(6);
  });
});

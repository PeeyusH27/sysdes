import { describe, expect, test } from "vitest";
import { BUDGET_MS, buildTrace } from "../TraceWaterfall";

const base = { cdnHit: false, cacheHit: true, slowDb: false, depTimeout: false };

describe("buildTrace", () => {
  test("default read path (CDN miss, cache hit) fits the budget", () => {
    const t = buildTrace(base);
    expect(t.total).toBe(118);
    expect(t.over).toBe(false);
    expect(t.spans.some((s) => s.row === "db")).toBe(false);
  });

  test("a CDN hit never reaches the origin", () => {
    const t = buildTrace({ ...base, cdnHit: true, slowDb: true, depTimeout: true });
    expect(t.total).toBe(60);
    expect(t.spans.map((s) => s.row)).toEqual(["dns", "tls", "cdn"]);
  });

  test("cache miss adds the DB query and the cache fill", () => {
    const t = buildTrace({ ...base, cacheHit: false });
    expect(t.total).toBe(126);
    expect(t.spans.filter((s) => s.row === "redis").map((s) => s.label)).toEqual(["GET product:42", "SET (fill)"]);
  });

  test("slow DB on a cache miss blows the budget; on a cache hit it doesn't matter", () => {
    const miss = buildTrace({ ...base, cacheHit: false, slowDb: true });
    expect(miss.total).toBeGreaterThan(BUDGET_MS);
    expect(miss.biggest.row).toBe("db");
    expect(buildTrace({ ...base, slowDb: true }).total).toBe(118);
  });

  test("dependency timeout: bounded by the timeout, served with a fallback, still inside the budget", () => {
    const t = buildTrace({ ...base, depTimeout: true });
    expect(t.spans.find((s) => s.status === "timeout")).toBeTruthy();
    expect(t.spans.find((s) => s.status === "fallback")).toBeTruthy();
    expect(t.total).toBe(189);
    expect(t.over).toBe(false);
  });

  test("the async queue publish never extends the response", () => {
    const t = buildTrace(base);
    const q = t.spans.find((s) => s.row === "queue")!;
    const api = t.spans.find((s) => s.row === "api")!;
    expect(q.async).toBe(true);
    expect(q.end).toBeLessThanOrEqual(api.end);
  });
});

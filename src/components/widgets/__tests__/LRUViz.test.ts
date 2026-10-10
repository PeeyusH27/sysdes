import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { KEYS, LRUCache, lruAccess, pickKey } from "../LRUViz";

test("LRUCache evicts the least recently used key", () => {
  const c = new LRUCache<string, number>(2);
  expect(c.set("a", 1)).toBeUndefined();
  expect(c.set("b", 2)).toBeUndefined();
  expect(c.get("a")).toBe(1); // a is now most recent
  expect(c.set("c", 3)).toBe("b");
  expect(c.keysByRecency()).toEqual(["c", "a"]);
  expect(c.get("b")).toBeUndefined();
});

test("updating an existing key refreshes it without evicting", () => {
  const c = new LRUCache<string, number>(2, [
    ["a", 1],
    ["b", 2],
  ]);
  expect(c.set("a", 9)).toBeUndefined();
  expect(c.keysByRecency()).toEqual(["a", "b"]);
  expect(c.set("c", 3)).toBe("b");
});

test("shrinking capacity evicts from the least recent end", () => {
  const c = new LRUCache(2, [
    ["a", 1],
    ["b", 1],
    ["c", 1],
    ["d", 1],
  ]);
  expect(c.evictedOnCreate).toEqual(["a", "b"]);
  expect(c.keysByRecency()).toEqual(["d", "c"]);
});

test("lruAccess: read-through get, hit and miss accounting, eviction", () => {
  let r = lruAccess([], 2, "get", "A");
  expect(r).toMatchObject({ hit: false, evicted: null, value: 1 });
  r = lruAccess(r.entries, 2, "get", "B");
  r = lruAccess(r.entries, 2, "get", "A");
  expect(r.hit).toBe(true);
  r = lruAccess(r.entries, 2, "get", "C");
  expect(r.evicted).toBe("B");
  expect(r.entries.map(([k]) => k)).toEqual(["A", "C"]); // insertion order: least recent first
});

test("set writes a new version that a later miss reloads", () => {
  const r = lruAccess([["A", 1]], 2, "set", "A", { A: 1 });
  expect(r).toMatchObject({ hit: true, value: 2 });
  const miss = lruAccess([], 2, "get", "A", { A: 2 });
  expect(miss.value).toBe(2);
});

test("skewed random keys are deterministic and favour A", () => {
  const a = Array.from({ length: 50 }, ((rand) => () => pickKey(rand))(mulberry32(1)));
  const b = Array.from({ length: 50 }, ((rand) => () => pickKey(rand))(mulberry32(1)));
  expect(a).toEqual(b);
  const counts = KEYS.map((k) => a.filter((x) => x === k).length);
  expect(counts[0]).toBeGreaterThan(counts[7]);
});

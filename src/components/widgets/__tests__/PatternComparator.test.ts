import { describe, expect, test } from "vitest";
import { PATTERN_IDS, readsGot, stateAt, STORIES } from "../PatternComparator";

describe("caching pattern stories", () => {
  test("six patterns, same story: write 12, then two reads; everything ends at 12", () => {
    expect(PATTERN_IDS).toHaveLength(6);
    for (const id of PATTERN_IDS) {
      const story = STORIES[id];
      const end = stateAt(story, story.steps.length - 1);
      expect(end.db, id).toBe(12);
      expect(end.cache, id).toBe(12);
      expect(end.stale, id).toBe(false);
      expect(readsGot(story), id).toHaveLength(2);
      expect(story.steps.some((s) => s.phase === "read 1") && story.steps.some((s) => s.phase === "read 2"), id).toBe(true);
    }
  });

  test("every step travels between two different lanes", () => {
    for (const id of PATTERN_IDS) for (const s of STORIES[id].steps) expect(s.from, `${id}: ${s.label}`).not.toBe(s.to);
  });

  test("only write-behind can lose the write in a cache crash, and only before the flush", () => {
    for (const id of PATTERN_IDS) expect(STORIES[id].loses, id).toBe(id === "write-behind");
    const wb = STORIES["write-behind"];
    const flush = wb.steps.findIndex((s) => s.label.startsWith("flush"));
    expect(stateAt(wb, 0)).toMatchObject({ cache: 12, db: 10, risk: true });
    expect(stateAt(wb, flush - 1).risk).toBe(true);
    expect(stateAt(wb, flush)).toMatchObject({ db: 12, risk: false });
  });

  test("write-through is never stale; refresh-ahead serves one old read", () => {
    expect(STORIES["write-through"].steps.every((s) => !s.stale)).toBe(true);
    expect(readsGot(STORIES["refresh-ahead"])).toEqual([10, 12]);
  });

  test("first read after the write misses for cache-aside, read-through and write-around", () => {
    const misses = PATTERN_IDS.filter((id) => STORIES[id].firstReadMisses);
    expect(misses).toEqual(["cache-aside", "read-through", "write-around"]);
    for (const id of misses) {
      const firstReadReply = STORIES[id].steps.find((s) => s.phase === "read 1" && s.reply)!;
      expect(firstReadReply.label, id).toMatch(/miss|loader|^12$/);
    }
  });

  test("stateAt(-1) is the starting point", () => {
    expect(stateAt(STORIES["cache-aside"], -1)).toEqual({ cache: 10, db: 10, stale: false, risk: false });
    expect(stateAt(STORIES["write-around"], -1).cache).toBeNull();
  });
});

// @vitest-environment jsdom
// Practice-editor drafts: one per problem and language, and saves from before Python still load.
import { beforeEach, describe, expect, it } from "vitest";
import { useDrafts } from "@/lib/dsa/store";

const KEY = "sds-dsa-drafts";

describe("drafts", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a JavaScript draft saved before Python existed", async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { code: { "two-sum": "// old draft" } }, version: 1 }));
    await useDrafts.persist.rehydrate();
    const s = useDrafts.getState();
    expect(s.code["two-sum"]).toBe("// old draft");
    expect(s.python).toEqual({});
    expect(s.javaFallback).toBe("js");
  });

  it("saves and clears each language separately", async () => {
    await useDrafts.persist.rehydrate();
    const { save, clear } = useDrafts.getState();
    save("two-sum", "function twoSum() {}");
    save("two-sum", "def two_sum(nums, target):\n    pass\n", "python");
    expect(useDrafts.getState().code["two-sum"]).toBe("function twoSum() {}");
    expect(useDrafts.getState().python["two-sum"]).toContain("def two_sum");
    clear("two-sum", "python");
    expect(useDrafts.getState().python["two-sum"]).toBeUndefined();
    expect(useDrafts.getState().code["two-sum"]).toBe("function twoSum() {}");
    expect(JSON.parse(localStorage.getItem(KEY)!).state.code["two-sum"]).toBe("function twoSum() {}");
  });

  it("ignores a broken stored fallback language", async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { code: {}, python: {}, javaFallback: "java" }, version: 1 }));
    await useDrafts.persist.rehydrate();
    expect(useDrafts.getState().javaFallback).toBe("js");
  });
});

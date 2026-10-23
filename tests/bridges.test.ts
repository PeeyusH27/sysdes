import { describe, expect, it } from "vitest";
import { allPages } from "@content/registry";
import { getPattern } from "@content/dsa/registry";
import { bridges, patternsFor, systemsFor } from "@content/bridges";

describe("cross-track bridges", () => {
  const hrefs = new Set(allPages().map((p) => p.href));

  for (const b of bridges) {
    it(`${b.pattern} ↔ ${b.to}`, () => {
      expect(getPattern(b.pattern), "unknown pattern slug").toBeTruthy();
      expect(hrefs.has(b.to), "unknown page").toBe(true);
      expect(b.why.length).toBeGreaterThan(30);
    });
  }

  it("has no duplicate pattern/page pairs", () => {
    const keys = bridges.map((b) => `${b.pattern}|${b.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("looks up both directions", () => {
    expect(systemsFor("trie").map((b) => b.to)).toContain("/questions/typeahead");
    expect(patternsFor("/questions/typeahead").map((b) => b.pattern)).toContain("trie");
    expect(systemsFor("topological-sort")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { patterns } from "@content/dsa/registry";
import { buildDeck, isGiveaway, type DrillRow } from "@/lib/dsa/drill";
import { problemRows } from "@/lib/dsa/load";

const rows: DrillRow[] = problemRows().map((r) => ({ slug: r.slug, title: r.title, summary: r.summary, difficulty: r.difficulty, patterns: r.patterns }));
const pats = patterns.map((p) => ({ slug: p.slug, group: p.group }));

describe("pattern drill deck", () => {
  it("is deterministic for a seed and differs between seeds", () => {
    expect(buildDeck(rows, pats, 1)).toEqual(buildDeck(rows, pats, 1));
    expect(buildDeck(rows, pats, 1).map((q) => q.slug)).not.toEqual(buildDeck(rows, pats, 2).map((q) => q.slug));
  });

  it("asks 10 distinct problems with the answer among four distinct options", () => {
    for (const seed of [1, 7, 42, 1234]) {
      const deck = buildDeck(rows, pats, seed);
      expect(deck).toHaveLength(10);
      expect(new Set(deck.map((q) => q.slug)).size).toBe(10);
      for (const q of deck) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answer);
        expect(rows.find((r) => r.slug === q.slug)?.patterns[0]).toBe(q.answer);
      }
    }
  });

  it("spreads a round across patterns", () => {
    const answers = buildDeck(rows, pats, 5).map((q) => q.answer);
    expect(new Set(answers).size).toBe(10);
  });

  it("never uses a summary that names the technique", () => {
    for (const seed of [1, 2, 3]) for (const q of buildDeck(rows, pats, seed)) expect(isGiveaway(q.summary)).toBe(false);
    expect(isGiveaway("Implement a trie with insert and search.")).toBe(true);
    expect(isGiveaway("Find the two positions whose values add up to a target.")).toBe(false);
  });

  it("keeps a usable pool of problems", () => {
    expect(rows.filter((r) => !isGiveaway(r.summary)).length).toBeGreaterThan(60);
  });
});

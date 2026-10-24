import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deepDives, learnSteps, questions } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { lldLessons } from "@content/lld/registry";
import { csLessons } from "@content/cs/registry";
import { allBasics, type BasicsSection } from "@content/basics";

// The "Start here" card (content/basics): four short pieces per page. Every detail page has one (the last test).
const pages: Record<BasicsSection, string[]> = {
  learn: learnSteps.map((s) => s.slug),
  "deep-dives": deepDives.map((d) => d.slug),
  questions: questions.map((q) => q.slug),
  patterns: patterns.map((p) => p.slug),
  lld: lldLessons.map((l) => l.slug),
  cs: csLessons.map((l) => l.slug),
};
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const LIMIT = { what: 45, why: 45, example: 45, when: 40 } as const;

for (const section of Object.keys(pages) as BasicsSection[]) {
  describe(`basics: ${section}`, () => {
    it("has no entries for pages that do not exist", () => {
      const real = new Set(pages[section]);
      expect(Object.keys(allBasics[section]).filter((k) => !real.has(k))).toEqual([]);
    });

    for (const slug of pages[section]) {
      it(`${slug}: four short pieces`, () => {
        const b = allBasics[section][slug];
        expect(b, `content/basics/${section}.ts needs an entry for "${slug}"`).toBeTruthy();
        if (!b) return;
        for (const key of ["what", "why", "example", "when"] as const) {
          const t = b[key];
          expect(words(t), `${key} is too short`).toBeGreaterThan(5);
          expect(words(t), `${key} has ${words(t)} words`).toBeLessThanOrEqual(LIMIT[key]);
          expect(t, `${key} must be one line of plain text`).not.toMatch(/\n|[{}<>]/);
        }
        // Say it in your own words: the four pieces must not repeat each other.
        expect(new Set([b.what, b.why, b.example, b.when]).size).toBe(4);
      });
    }
  });
}

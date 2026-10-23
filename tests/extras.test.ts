import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deepDives, learnSteps, questions } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { lldLessons } from "@content/lld/registry";
import { allExtras, EXPLAIN_STEPS, type ExtrasSection } from "@content/extras";
import { DOODLE_NAMES } from "@/components/doodle/names";
import { getHeadings } from "@/lib/content";

const pages: Record<ExtrasSection, { slug: string; file: string }[]> = {
  learn: learnSteps.map((s) => ({ slug: s.slug, file: `learn/${s.dir}/page.mdx` })),
  "deep-dives": deepDives.map((d) => ({ slug: d.slug, file: `deep-dives/${d.dir}/page.mdx` })),
  questions: questions.map((q) => ({ slug: q.slug, file: `questions/${q.slug}/page.mdx` })),
  patterns: patterns.map((p) => ({ slug: p.slug, file: `dsa/patterns/${p.dir}/page.mdx` })),
  lld: lldLessons.map((l) => ({ slug: l.slug, file: `lld/foundations/${l.dir}/page.mdx` })),
};
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

for (const section of Object.keys(pages) as ExtrasSection[]) {
  describe(`extras: ${section}`, () => {
    it("has no entries for pages that do not exist", () => {
      const real = new Set(pages[section].map((p) => p.slug));
      expect(Object.keys(allExtras[section]).filter((k) => !real.has(k))).toEqual([]);
    });

    for (const page of pages[section]) {
      describe(page.slug, () => {
        const x = allExtras[section][page.slug];
        it("has extras", () => expect(x, `content/extras/${section}.ts needs an entry for "${page.slug}"`).toBeTruthy());
        if (!x) return;

        it("folds away real sections and leaves a short core", async () => {
          const ids = (await getHeadings(page.file)).filter((h) => h.depth === 2).map((h) => h.id);
          for (const d of x.detail) expect(ids, `detail section "${d}" is not a ## heading on the page`).toContain(d);
          expect(new Set(x.detail).size).toBe(x.detail.length);
          const core = ids.filter((id) => !x.detail.includes(id));
          expect(core.length, `core has ${core.length} sections: ${core.join(", ")}`).toBeGreaterThanOrEqual(3);
          expect(core.length, `core has ${core.length} sections: ${core.join(", ")}`).toBeLessThanOrEqual(7);
          expect(x.detail.length).toBeGreaterThanOrEqual(2);
        });

        it("has a say-it card that fits on a card", () => {
          expect(words(x.sayIt.answer)).toBeGreaterThanOrEqual(20);
          expect(words(x.sayIt.answer)).toBeLessThanOrEqual(70);
          expect(x.sayIt.numbers).toHaveLength(3);
          for (const n of x.sayIt.numbers) {
            expect(n.value.length).toBeGreaterThan(0);
            expect(n.value.length).toBeLessThanOrEqual(18);
            expect(words(n.label)).toBeLessThanOrEqual(9);
          }
          expect(x.sayIt.tradeoffs).toHaveLength(3);
          for (const t of x.sayIt.tradeoffs) expect(words(t)).toBeLessThanOrEqual(25);
          expect(x.sayIt.mention.length).toBeGreaterThan(20);
          expect(x.sayIt.mention).not.toMatch(/\n/);
        });

        it("names a real primer", async () => {
          if (x.primer) expect((await import("@content/primers")).PRIMER_IDS as readonly string[]).toContain(x.primer);
        });

        it("names a real doodle", () => {
          if (x.doodle) expect(DOODLE_NAMES as readonly string[]).toContain(x.doodle);
        });

        if (section === "questions") {
          it("has a five-step explain-it-back", () => {
            expect(x.explain, "questions need `explain`").toBeTruthy();
            expect(x.explain!.steps.map((s) => s.id)).toEqual(EXPLAIN_STEPS);
            for (const s of x.explain!.steps) {
              expect(words(s.prompt)).toBeLessThanOrEqual(25);
              expect(s.hint.length).toBeGreaterThan(15);
            }
            expect(x.explain!.checklist.length).toBeGreaterThanOrEqual(6);
            expect(x.explain!.checklist.length).toBeLessThanOrEqual(8);
            for (const c of x.explain!.checklist) expect(words(c)).toBeLessThanOrEqual(14);
          });
        }
      });
    }
  });
}

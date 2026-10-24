import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deepDives, learnSteps, questions } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { lldLessons } from "@content/lld/registry";
import { csLessons } from "@content/cs/registry";
import { allChecks, type ChecksSection } from "@content/checks";
import { getHeadings } from "@/lib/content";

// One tap-to-answer question per section card (content/checks): limits, and that every id is a real `##` heading.
const pages: Record<ChecksSection, { slug: string; file: string }[]> = {
  learn: learnSteps.map((s) => ({ slug: s.slug, file: `learn/${s.dir}/page.mdx` })),
  "deep-dives": deepDives.map((d) => ({ slug: d.slug, file: `deep-dives/${d.dir}/page.mdx` })),
  questions: questions.map((q) => ({ slug: q.slug, file: `questions/${q.slug}/page.mdx` })),
  patterns: patterns.map((p) => ({ slug: p.slug, file: `dsa/patterns/${p.dir}/page.mdx` })),
  lld: lldLessons.map((l) => ({ slug: l.slug, file: `lld/foundations/${l.dir}/page.mdx` })),
  cs: csLessons.map((l) => ({ slug: l.slug, file: `cs/lessons/${l.dir}/page.mdx` })),
};
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

for (const section of Object.keys(pages) as ChecksSection[]) {
  describe(`checks: ${section}`, () => {
    it("has no entries for pages that do not exist", () => {
      const real = new Set(pages[section].map((p) => p.slug));
      expect(Object.keys(allChecks[section]).filter((k) => !real.has(k))).toEqual([]);
    });

    for (const page of pages[section]) {
      const c = allChecks[section][page.slug];
      if (!c) continue;
      it(`${page.slug}: every check is on a real section, short, and has a real answer`, async () => {
        const ids = (await getHeadings(page.file)).filter((h) => h.depth === 2).map((h) => h.id);
        const rights: number[] = [];
        for (const [id, k] of Object.entries(c)) {
          expect(ids, `"${id}" is not a ## heading on the page`).toContain(id);
          expect(words(k.q), `${id}: question`).toBeLessThanOrEqual(14);
          expect(k.options.length, `${id}: options`).toBeGreaterThanOrEqual(2);
          expect(k.options.length, `${id}: options`).toBeLessThanOrEqual(3);
          for (const o of k.options) expect(words(o), `${id}: option "${o}"`).toBeLessThanOrEqual(8);
          expect(new Set(k.options).size, `${id}: duplicate options`).toBe(k.options.length);
          expect(Number.isInteger(k.answer) && k.answer >= 0 && k.answer < k.options.length, `${id}: answer index`).toBe(true);
          expect(words(k.why), `${id}: why`).toBeLessThanOrEqual(22);
          expect(k.why.length, `${id}: why`).toBeGreaterThan(15);
          rights.push(k.answer);
        }
        // The right answer must not always sit in the same place, or the page teaches a trick instead of the topic.
        if (rights.length >= 4) expect(new Set(rights).size, "vary the position of the right answer").toBeGreaterThan(1);
      });
    }
  });
}

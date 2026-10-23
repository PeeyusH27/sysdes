// Less to read: the Core view of every detail page stays short. See docs/AUTHORING-PLAIN.md.
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { measure, prose } from "../scripts/readability.mjs";

vi.mock("server-only", () => ({}));

import { allExtras, type ExtrasSection } from "@content/extras";
import { deepDives, learnSteps, questions } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { lldLessons } from "@content/lld/registry";
import { csLessons } from "@content/cs/registry";

const pages: { section: ExtrasSection; slug: string; file: string }[] = [
  ...learnSteps.map((s) => ({ section: "learn" as const, slug: s.slug, file: `learn/${s.dir}/page.mdx` })),
  ...deepDives.map((s) => ({ section: "deep-dives" as const, slug: s.slug, file: `deep-dives/${s.dir}/page.mdx` })),
  ...questions.map((s) => ({ section: "questions" as const, slug: s.slug, file: `questions/${s.slug}/page.mdx` })),
  ...patterns.map((s) => ({ section: "patterns" as const, slug: s.slug, file: `dsa/patterns/${s.dir}/page.mdx` })),
  ...lldLessons.map((s) => ({ section: "lld" as const, slug: s.slug, file: `lld/foundations/${s.dir}/page.mdx` })),
  ...csLessons.map((s) => ({ section: "cs" as const, slug: s.slug, file: `cs/lessons/${s.dir}/page.mdx` })),
];

/** Words of prose in the sections a reader sees by default (everything not folded into "detail"), and on the whole page. */
function words(p: (typeof pages)[number]) {
  const src = readFileSync(path.resolve(__dirname, "../content", p.file), "utf8");
  const slugger = new GithubSlugger();
  const detail = new Set(allExtras[p.section][p.slug]?.detail ?? []);
  let core = 0;
  let all = 0;
  let longest = 0;
  for (const part of src.split(/^(?=## )/m)) {
    const head = /^## (.+)$/m.exec(part);
    const w = measure(prose(part)).words as number;
    all += w;
    const id = head ? slugger.slug(head[1].replace(/[`*_]/g, "")) : "";
    if (!head || !detail.has(id)) {
      core += w;
      longest = Math.max(longest, w);
    }
  }
  return { core, all, longest };
}

describe("plain language: less to read", () => {
  const rows = pages.map((p) => ({ ...p, ...words(p) }));

  for (const r of rows) {
    it(`${r.section}/${r.slug}: the core is at most 600 words of prose (now ${r.core})`, () => {
      expect(r.core).toBeLessThanOrEqual(600);
    });
  }

  it("the median core is about 350 words or fewer", () => {
    const sorted = rows.map((r) => r.core).sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(400);
  });

  it("no single section in the core is a wall of text (over 260 words)", () => {
    const walls = rows.filter((r) => r.longest > 260).map((r) => `${r.section}/${r.slug} (${r.longest})`);
    expect(walls, walls.join(", ")).toEqual([]);
  });
});

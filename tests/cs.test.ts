// The CS fundamentals track (content/cs): registry matches the folders, every lesson ends the same way
// (follow-ups, then a quiz of 5 to 8 questions with explanations), links resolve, and snippets have tests.
// JavaScript only: the Python-twin rule belongs to the LLD foundations (tests/lld-lessons.test.ts).
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { CS_GROUPS, csLessons } from "@content/cs/registry";
import { allPages, deepDives, learnSteps, questions } from "@content/registry";
import { lldLessons } from "@content/lld/registry";

const root = path.resolve(__dirname, "../content/cs/lessons");
const quizModules = import.meta.glob("../content/cs/lessons/*/quiz.ts", { eager: true }) as Record<string, { quiz: { q: string; options: string[]; answer: number; explain?: string }[] }>;

describe("cs registry", () => {
  it("has its lessons in order, in the three known groups", () => {
    expect(csLessons.length).toBeGreaterThanOrEqual(12);
    for (const g of CS_GROUPS) expect(csLessons.filter((l) => l.group === g).length, g).toBeGreaterThanOrEqual(3);
    expect(csLessons.map((l) => l.order)).toEqual(csLessons.map((_, i) => i + 1));
    for (const l of csLessons) expect(CS_GROUPS, l.slug).toContain(l.group);
    expect(new Set(csLessons.map((l) => l.slug)).size).toBe(csLessons.length);
    // lessons of one group are contiguous, so the hub and the prev/next links read as a path
    const groups = csLessons.map((l) => l.group);
    expect(groups).toEqual([...groups].sort((a, b) => CS_GROUPS.indexOf(a) - CS_GROUPS.indexOf(b)));
  });

  it("every lesson folder is registered and every registered lesson has its files", () => {
    const dirs = readdirSync(root).filter((d) => /^\d\d-/.test(d));
    expect(dirs.sort()).toEqual(csLessons.map((l) => l.dir).sort());
    for (const l of csLessons) {
      expect(l.dir.slice(0, 2), l.slug).toBe(String(l.order).padStart(2, "0"));
      for (const f of ["page.mdx", "quiz.ts"]) expect(existsSync(path.join(root, l.dir, f)), `${l.slug}/${f}`).toBe(true);
      expect(l.outcomes.length, l.slug).toBeGreaterThanOrEqual(3);
      expect(l.minutes, l.slug).toBeGreaterThanOrEqual(15);
      expect(l.minutes, l.slug).toBeLessThanOrEqual(30);
    }
  });

  it("is searchable and in the sitemap source (allPages)", () => {
    const hrefs = new Set(allPages().map((p) => p.href));
    expect(hrefs.has("/cs")).toBe(true);
    for (const l of csLessons) expect(hrefs.has(`/cs/${l.slug}`), l.slug).toBe(true);
  });
});

describe.each(csLessons)("cs/$slug", ({ slug, dir }) => {
  const src = readFileSync(path.join(root, dir, "page.mdx"), "utf8");

  it("ends with follow-up questions and then a quiz", () => {
    const fu = src.indexOf("<FollowUps>");
    const qz = src.indexOf("<Quiz items={quiz} />");
    expect(fu, "<FollowUps>").toBeGreaterThan(0);
    expect(qz, "<Quiz>").toBeGreaterThan(fu);
    expect(src.slice(qz).trim()).toBe("<Quiz items={quiz} />");
    const n = (src.match(/<FollowUp q=/g) ?? []).length;
    expect(n, "3 to 5 follow-ups").toBeGreaterThanOrEqual(3);
    expect(n, "3 to 5 follow-ups").toBeLessThanOrEqual(5);
  });

  it("has a TLDR of at most two sentences, an interview callout and a warning callout", () => {
    const tldr = /<TLDR>([\s\S]*?)<\/TLDR>/.exec(src)?.[1] ?? "";
    expect((tldr.match(/[.!?](\s|$)/g) ?? []).length, "TLDR sentences").toBeLessThanOrEqual(2);
    expect(src).toContain('<Callout kind="interview"');
    expect(src).toContain('<Callout kind="warning"');
  });

  it("has a quiz of 5 to 8 questions, each with an explanation", () => {
    const quiz = quizModules[`../content/cs/lessons/${dir}/quiz.ts`].quiz;
    expect(quiz.length).toBeGreaterThanOrEqual(5);
    expect(quiz.length).toBeLessThanOrEqual(8);
    for (const q of quiz) {
      expect(q.explain?.length ?? 0, q.q).toBeGreaterThan(30);
      expect(q.options.length, q.q).toBeGreaterThanOrEqual(2);
      expect(q.options.length, q.q).toBeLessThanOrEqual(4);
    }
    // the right answer should not always be in the same slot
    expect(new Set(quiz.map((q) => q.answer)).size, "answer positions vary").toBeGreaterThan(1);
  });

  it("links only to pages that exist", () => {
    const known = new Set(["/cs", ...allPages().map((p) => p.href.split("#")[0]), ...lldLessons.map((l) => `/lld/foundations/${l.slug}`), ...csLessons.map((l) => `/cs/${l.slug}`), "/basics", "/shorts", "/glossary", "/playground", "/architecture"]);
    const noFences = src.replace(/```[\s\S]*?```/g, "");
    for (const m of noFences.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)/g)) {
      const href = m[1];
      const ok = known.has(href) || href.startsWith("/basics/") || [...learnSteps, ...deepDives].some((s) => href.endsWith(`/${s.slug}`)) || questions.some((q) => href === `/questions/${q.slug}`);
      expect(ok, `broken link ${href}`).toBe(true);
    }
  });

  it("every JavaScript snippet that is not display-only has a sibling test", () => {
    const dirSnip = path.join(root, dir, "snippets");
    if (!existsSync(dirSnip)) return;
    for (const f of readdirSync(dirSnip).filter((x) => x.endsWith(".js") && !x.endsWith(".test.js") && x !== "try-it.js")) {
      const body = readFileSync(path.join(dirSnip, f), "utf8");
      if (body.startsWith("// @display-only")) continue;
      expect(existsSync(path.join(dirSnip, f.replace(/\.js$/, ".test.js"))), `${slug}/snippets/${f} needs ${f.replace(/\.js$/, ".test.js")}`).toBe(true);
      expect(src, `${f} is shown on the page`).toContain(`snippets/${f}`);
    }
  });
});

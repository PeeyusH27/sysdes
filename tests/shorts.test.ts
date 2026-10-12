import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { allPages } from "@content/registry";
import { jsTopics } from "@content/dsa/registry";
import type { Short } from "@content/shorts/types";

// Each file is imported inside its own test, so a broken file fails alone instead of taking the suite down.
const files = import.meta.glob(["../content/shorts/*.ts", "!../content/shorts/index.ts", "!../content/shorts/types.ts"]) as Record<
  string,
  () => Promise<{ shorts?: Short[] }>
>;

const TRACKS = ["System design", "DSA", "JavaScript", "Building blocks"];
const LIMITS = { title: 70, hook: 150, point: 150, say: 220, moreTitle: 30, codeLines: 10, codeCols: 70 };

/** Same slugging as rehype-slug, so anchors in `source` match the ids on the rendered page. */
function anchorsOf(file: string) {
  const src = readFileSync(path.join(__dirname, "../content", file), "utf8");
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  let fenced = false;
  for (const line of src.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^#{2,3}\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1]
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
      .trim();
    ids.add(slugger.slug(text));
  }
  return ids;
}

/** Valid `source` values: every page, plus #anchors for its ## and ### headings. */
function validSources() {
  const ok = new Set<string>();
  for (const p of allPages()) {
    const [page] = p.href.split("#");
    ok.add(page);
    if (p.href.includes("#")) ok.add(p.href);
    if (!p.file || page === "/dsa/js") continue;
    for (const id of anchorsOf(p.file)) ok.add(`${page}#${id}`);
    if (page.startsWith("/dsa/patterns/")) ok.add(`${page}#practice-problems`);
  }
  for (const t of jsTopics) ok.add(`/dsa/js#${t.id}`);
  return ok;
}
const sources = validSources();

/** Bullets may use **bold** and `code` only, and both must be balanced. */
function checkInline(label: string, text: string) {
  expect(text.trim(), `${label}: empty`).not.toBe("");
  const noCode = text.replace(/`[^`]*`/g, "");
  expect((text.match(/`/g) ?? []).length % 2, `${label}: unbalanced backticks`).toBe(0);
  expect((noCode.match(/\*\*/g) ?? []).length % 2, `${label}: unbalanced **`).toBe(0);
  expect(noCode, `${label}: links, HTML and headings aren't rendered`).not.toMatch(/\]\(|<[a-z/]|^#/i);
}

function checkShort(s: Short) {
  const at = (field: string) => `${s.id}.${field}`;
  expect(s.id, "id must be kebab-case").toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(TRACKS, at("track")).toContain(s.track);
  expect(s.topic.split(/\s+/).length, at("topic: 1–3 words")).toBeLessThanOrEqual(3);
  expect(s.title.length, at("title")).toBeLessThanOrEqual(LIMITS.title);
  expect(s.hook.length, at("hook")).toBeLessThanOrEqual(LIMITS.hook);
  checkInline(at("title"), s.title);
  checkInline(at("hook"), s.hook);
  expect(s.points.length, at("points: 3–5 bullets")).toBeGreaterThanOrEqual(3);
  expect(s.points.length, at("points: 3–5 bullets")).toBeLessThanOrEqual(5);
  s.points.forEach((p, i) => {
    expect(p.length, at(`points[${i}] length`)).toBeLessThanOrEqual(LIMITS.point);
    checkInline(at(`points[${i}]`), p);
  });
  expect(s.more.length, at("more: 1–3 groups")).toBeGreaterThanOrEqual(1);
  expect(s.more.length, at("more: 1–3 groups")).toBeLessThanOrEqual(3);
  s.more.forEach((g, gi) => {
    expect(g.title.length, at(`more[${gi}].title`)).toBeLessThanOrEqual(LIMITS.moreTitle);
    expect(g.points.length, at(`more[${gi}]: 1–5 bullets`)).toBeGreaterThanOrEqual(1);
    expect(g.points.length, at(`more[${gi}]: 1–5 bullets`)).toBeLessThanOrEqual(5);
    g.points.forEach((p, i) => {
      expect(p.length, at(`more[${gi}].points[${i}] length`)).toBeLessThanOrEqual(LIMITS.point);
      checkInline(at(`more[${gi}].points[${i}]`), p);
    });
  });
  if (s.code !== undefined) {
    const lines = s.code.split("\n");
    expect(lines.length, at("code lines")).toBeLessThanOrEqual(LIMITS.codeLines);
    lines.forEach((l, i) => expect(l.length, at(`code line ${i + 1} width`)).toBeLessThanOrEqual(LIMITS.codeCols));
    expect(s.code, at("code: no tabs")).not.toMatch(/\t/);
  }
  if (s.say !== undefined) {
    expect(s.say.length, at("say")).toBeLessThanOrEqual(LIMITS.say);
    checkInline(at("say"), s.say);
  }
  // Lesson summaries must link to their section; standalone building blocks link only when a related section exists.
  if (s.track !== "Building blocks") expect(s.source, at("source is required")).toBeTruthy();
  if (s.source !== undefined) expect(sources.has(s.source), `${at("source")}: "${s.source}" is not a page or a ## / ### heading on it`).toBe(true);
}

for (const [file, load] of Object.entries(files)) {
  const name = file.replace("../content/shorts/", "");
  describe(`shorts › ${name}`, () => {
    it("exports a shorts array whose items follow the format", async () => {
      const mod = await load();
      expect(Array.isArray(mod.shorts), "export const shorts: Short[]").toBe(true);
      for (const s of mod.shorts!) checkShort(s);
    });
  });
}

describe("shorts › glossary links", () => {
  it("every glossary `short` id exists", async () => {
    const { shorts } = await import("@content/shorts");
    const { glossary } = await import("@content/glossary");
    const ids = new Set(shorts.map((s) => s.id));
    const missing = glossary.filter((g) => g.short && !ids.has(g.short)).map((g) => `${g.term} → ${g.short}`);
    expect(missing).toEqual([]);
  });
});

describe("shorts › feed", () => {
  it("ids are unique across files and the feed contains every short", async () => {
    const { shorts } = await import("@content/shorts");
    const loaded = (await Promise.all(Object.values(files).map((l) => l()))).flatMap((m) => m.shorts ?? []);
    const ids = shorts.map((s) => s.id);
    expect(new Set(ids).size, `duplicate ids: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(", ")}`).toBe(ids.length);
    expect(shorts.length).toBe(loaded.length);
  });
});

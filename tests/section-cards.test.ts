import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeSectionCards from "../src/lib/mdx/rehype-section-cards.mjs";

const run = async (src: string) =>
  String(await compile(src, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, rehypeSectionCards], outputFormat: "function-body" }));

/** Pull the props of every <LessonSection> out of the compiled JSX. */
const sections = (js: string) =>
  [...js.matchAll(/_jsxs?\(LessonSection, \{\s*index: "(\d+)",\s*id: "([^"]+)",\s*title: "([^"]*)",\s*minutes: "(\d+)",\s*kind: "(\w+)"/g)].map((m) => ({
    index: Number(m[1]),
    id: m[2],
    title: m[3],
    minutes: Number(m[4]),
    kind: m[5],
  }));

describe("rehype-section-cards", () => {
  it("wraps each ## section, leaves the intro alone and keeps the h2 inside its card", async () => {
    const js = await run(`<TLDR>Short answer.</TLDR>\n\n## First idea\n\nSome words.\n\n### A detail\n\nMore.\n\n## Second idea\n\n\`\`\`js\nconst a = 1;\n\`\`\`\n`);
    const found = sections(js);
    expect(found.map((s) => [s.index, s.id, s.title])).toEqual([
      [1, "first-idea", "First idea"],
      [2, "second-idea", "Second idea"],
    ]);
    expect(js.search(/_jsxs?\(TLDR,/)).toBeLessThan(js.search(/_jsxs?\(LessonSection,/));
    expect(js.search(/_jsxs?\(TLDR,/)).toBeGreaterThan(-1);
    expect(found[1].kind).toBe("code");
  });

  it("classifies sections and estimates reading time on a real lesson", async () => {
    const src = readFileSync(path.join(__dirname, "../content/learn/04-caching/page.mdx"), "utf8");
    const found = sections(await run(src));
    const h2s = src.split("\n").filter((l) => /^## /.test(l));
    expect(found).toHaveLength(h2s.length);
    expect(found[0]).toMatchObject({ id: "why-it-matters", kind: "visual" });
    expect(found.find((s) => s.id === "code")?.kind).toBe("code");
    expect(found.at(-1)).toMatchObject({ id: "interview-questions", kind: "practice" });
    for (const s of found) expect(s.minutes).toBeGreaterThanOrEqual(1);
  });

  it("does nothing to a page without ## headings", async () => {
    expect(sections(await run("### Only a small heading\n\nText."))).toEqual([]);
  });
});

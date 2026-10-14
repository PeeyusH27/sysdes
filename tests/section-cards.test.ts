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
  [...js.matchAll(/_jsxs?\(LessonSection, \{\s*index: "(\d+)",\s*id: "([^"]+)",\s*title: "([^"]*)",\s*minutes: "(\d+)",\s*kind: "(\w+)",\s*layout: "(\w+)"/g)].map((m) => ({
    index: Number(m[1]),
    id: m[2],
    title: m[3],
    minutes: Number(m[4]),
    kind: m[5],
    layout: m[6],
  }));

// A tiny view of the hast tree after the plugin ran: each card as its wrappers and what is inside them.
interface Node {
  type: string;
  tagName?: string;
  name?: string;
  value?: string;
  properties?: { className?: string[] };
  attributes?: { name: string; value: string }[];
  children?: Node[];
}
const label = (n: Node) => (n.type === "element" ? n.tagName! : n.type === "mdxJsxFlowElement" ? n.name! : n.type);
const kids = (n: Node) => (n.children ?? []).filter((c) => !(c.type === "text" && !c.value?.trim()));
const shape = (n: Node): unknown => {
  const cls = n.properties?.className?.[0];
  // A stage always holds exactly one `.sec-fit` (the box the desktop pane scales): show what is inside it.
  if (n.type === "element" && cls === "sec-stage") {
    const [fit, ...rest] = kids(n);
    expect(rest).toEqual([]);
    expect(fit.properties?.className).toEqual(["sec-fit"]);
    return { "sec-stage": kids(fit).map(shape) };
  }
  if (n.type === "element" && cls?.startsWith("sec-")) return { [cls]: kids(n).map(shape) };
  return label(n);
};
const cards = async (src: string) => {
  let tree: Node = { type: "root" };
  await compile(src, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeSectionCards, () => (t: Node) => void (tree = structuredClone(t))],
    outputFormat: "function-body",
  });
  return (tree.children ?? [])
    .filter((n) => n.type === "mdxJsxFlowElement" && n.name === "LessonSection")
    .map((n) => ({ layout: n.attributes?.find((a) => a.name === "layout")?.value, children: (n.children ?? []).map(shape) }));
};

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
    expect(found[0]).toMatchObject({ id: "why-it-matters", kind: "visual", layout: "split" });
    expect(found.find((s) => s.id === "code")?.kind).toBe("code");
    expect(found.at(-1)).toMatchObject({ id: "interview-questions", kind: "practice", layout: "split" });
    for (const s of found) expect(s.minutes).toBeGreaterThanOrEqual(1);
  });

  it("does nothing to a page without ## headings", async () => {
    expect(sections(await run("### Only a small heading\n\nText."))).toEqual([]);
  });

  it("puts the words in the body and the visuals on the stage, each in their original order", async () => {
    const [card] = await cards(
      [
        "## Architecture",
        "First words.",
        "<FlowDiagram />",
        "- a list",
        '<Callout kind="tip">A tip.</Callout>',
        "```js\nconst a = 1;\n```",
        "| a | b |\n|---|---|\n| 1 | 2 |",
        "<ParkingLotSim />",
        "<Steps><Step title='One'>Do it.</Step></Steps>",
        "<Quiz />",
      ].join("\n\n"),
    );
    expect(card).toEqual({
      layout: "split",
      children: [{ "sec-row": [{ "sec-body": ["h2", "p", "ul", "Callout", "table", "Steps"] }, { "sec-stage": ["FlowDiagram", "pre", "ParkingLotSim", "Quiz"] }] }],
    });
  });

  it("keeps sections without visuals in one column", async () => {
    const [card] = await cards("## Failure modes\n\nWords.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<FollowUps><FollowUp q='Why?'>Because.</FollowUp></FollowUps>");
    expect(card).toEqual({ layout: "single", children: [{ "sec-body": ["h2", "p", "table", "FollowUps"] }] });
  });

  it("gives a section that is only a visual one column, heading first", async () => {
    const [card] = await cards("## Try it\n\n<RunCode />");
    expect(card).toEqual({ layout: "single", children: [{ "sec-body": ["h2"] }, { "sec-stage": ["RunCode"] }] });
  });

  it("gives each ### its own row when the subsections bring their own visuals", async () => {
    const [card] = await cards(
      ["## Code", "### Read path", "Explain the read.", "<CodeBlock />", "### Write path", "Explain the write.", "<CodeBlock />", "### Notes", "No code here.", '<Callout kind="note">Done.</Callout>'].join("\n\n"),
    );
    expect(card).toEqual({
      layout: "split",
      children: [
        { "sec-row": [{ "sec-body": ["h2", "h3", "p"] }, { "sec-stage": ["CodeBlock"] }] },
        { "sec-row": [{ "sec-body": ["h3", "p", "h3", "p", "Callout"] }, { "sec-stage": ["CodeBlock"] }] },
      ],
    });
  });

  it("keeps one row when only one subsection has visuals", async () => {
    const [card] = await cards(["## WebSockets", "Intro.", "### Handshake", "<FlowDiagram />", "- step", "### Scaling", "Words."].join("\n\n"));
    expect(card).toEqual({ layout: "split", children: [{ "sec-row": [{ "sec-body": ["h2", "p", "h3", "ul", "h3", "p"] }, { "sec-stage": ["FlowDiagram"] }] }] });
  });

  it("arranges every section of a real deep dive", async () => {
    const src = readFileSync(path.join(__dirname, "../content/deep-dives/01-caching-techniques/page.mdx"), "utf8");
    const all = await cards(src);
    for (const card of all) {
      // Nothing is lost: every row has words, and split rows always have something on the stage.
      if (card.layout === "split") for (const row of card.children as { "sec-row": [{ "sec-body": string[] }, { "sec-stage": string[] }] }[]) {
        expect(row["sec-row"][0]["sec-body"].length).toBeGreaterThan(0);
        expect(row["sec-row"][1]["sec-stage"].length).toBeGreaterThan(0);
      }
    }
    const code = all.find((c) => JSON.stringify(c).includes('"CodeBlock"') && (c.children as unknown[]).length > 2);
    expect(code?.layout).toBe("split");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any -- the tree is untyped hast/mdast */
import { describe, expect, it } from "vitest";
import rehypeGlossary, { loadGlossary, variantsOf } from "@/lib/mdx/rehype-glossary.mjs";

const text = (value: string) => ({ type: "text", value });
const el = (tagName: string, ...children: unknown[]) => ({ type: "element", tagName, properties: {}, children });
const g = [
  { entry: { term: "Cache", def: "A fast copy.", primer: "cache" }, variants: variantsOf({ term: "Cache" }).map((t) => ({ text: t, re: new RegExp(`(?<![\\w-])(${t})(?:s|es)?(?![\\w-])`, "i") })) },
  { entry: { term: "Dead letter queue (DLQ)", def: "Where failed messages wait." }, variants: variantsOf({ term: "Dead letter queue (DLQ)" }).map((t) => ({ text: t, re: new RegExp(`(?<![\\w-])(${t})(?:s|es)?(?![\\w-])`, /^[A-Z]+$/.test(t) ? "" : "i") })) },
];
const run = (children: unknown[]) => {
  const tree = { type: "root", children };
  rehypeGlossary({ glossary: g })(tree);
  return tree;
};
const terms = (node: any): any[] => (node.children ?? []).flatMap((c: any) => (c.name === "Term" ? [c] : terms(c)));

describe("glossary plugin", () => {
  it("wraps only the first mention in a section", () => {
    const t = run([el("p", text("A cache is fast. Every cache helps."))]);
    expect(terms(t)).toHaveLength(1);
    expect(terms(t)[0].children[0].value).toBe("cache");
    expect(terms(t)[0].attributes.find((a: any) => a.name === "primer").value).toBe("cache");
  });

  it("starts again at the next ## section", () => {
    const t = run([el("p", text("A cache.")), el("h2", text("Next")), el("p", text("The cache again."))]);
    expect(terms(t)).toHaveLength(2);
  });

  it("matches plurals and a bracketed acronym", () => {
    expect(terms(run([el("p", text("Many caches."))]))).toHaveLength(1);
    const t = run([el("p", text("Failed messages go to the DLQ."))]);
    expect(terms(t)[0].attributes.find((a: any) => a.name === "term").value).toBe("Dead letter queue (DLQ)");
  });

  it("leaves code, links, headings, tables and words inside other words alone", () => {
    const t = run([el("p", el("code", text("cache")), el("a", text("cache")), text(" cacheable precache")), el("h3", text("cache")), el("table", el("tr", el("td", text("cache"))))]);
    expect(terms(t)).toHaveLength(0);
  });

  it("keeps the text around the term in order", () => {
    const t: any = run([el("p", text("Use a cache here."))]);
    const kids = t.children[0].children;
    expect(kids[0].value).toBe("Use a ");
    expect(kids[1].name).toBe("Term");
    expect(kids[2].value).toBe(" here.");
  });

  it("the real glossary loads and every term has a plain definition", () => {
    const real = loadGlossary();
    expect(real.length).toBeGreaterThan(50);
    for (const { entry } of real) {
      expect(entry.def.length, entry.term).toBeGreaterThan(10);
      expect(entry.def.split(/\s+/).length, entry.term).toBeLessThanOrEqual(30);
    }
  });
});

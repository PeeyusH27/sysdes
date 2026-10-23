// How much of each detail page shows before "Read more"? Compiles pages through the same MDX pipeline as the site
// (remark-gfm, rehype-slug, rehype-section-cards) and counts the words outside and inside the folds.
//   node scripts/fold-report.mjs                      every detail page, as a table
//   node scripts/fold-report.mjs content/learn/04     only paths containing this
//   node scripts/fold-report.mjs --sections <path>    one row per section
import { readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeSectionCards from "../src/lib/mdx/rehype-section-cards.mjs";
import { pages } from "./readability.mjs";

const root = path.resolve(import.meta.dirname, "..", "content");
const words = (s) => s.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;

/**
 * Words showing and folded under a node. The "Read more" summary itself is not counted. Interview answers
 * (`<FollowUp>` bodies) open on a tap too, so they count as folded; their questions are attributes, not text.
 */
function count(node, folded = false, acc = { shown: 0, folded: 0 }, inCompactSteps = false) {
  // Prose only: the visuals pane (diagrams, widgets, code) and code blocks are not reading.
  if (node.type === "element" && (node.tagName === "pre" || node.properties?.className?.includes("sec-stage"))) return acc;
  const isStep = node.type === "mdxJsxFlowElement" && node.name === "Step";
  // A step's title is an attribute: it shows unless the whole list is folded.
  if (isStep) acc[folded ? "folded" : "shown"] += words(String(node.attributes?.find((a) => a.name === "title")?.value ?? ""));
  const inFold =
    folded ||
    (node.type === "element" && node.tagName === "details" && node.properties?.className?.includes("sec-more")) ||
    (node.type === "mdxJsxFlowElement" && node.name === "FollowUp") ||
    // <Steps compact>: each step's words open on a tap
    (isStep && inCompactSteps);
  if (node.type === "text") acc[inFold ? "folded" : "shown"] += words(node.value);
  if (node.type === "element" && node.tagName === "summary" && !folded) return acc;
  const compact = node.type === "mdxJsxFlowElement" && node.name === "Steps" && !!node.attributes?.some((a) => a.name === "compact");
  for (const c of node.children ?? []) count(c, inFold, acc, compact);
  return acc;
}

export async function foldStats(file) {
  let tree;
  await compile(readFileSync(file, "utf8"), {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeSectionCards, () => (t) => void (tree = t)],
    outputFormat: "function-body",
  });
  const sections = tree.children
    .filter((n) => n.type === "mdxJsxFlowElement" && n.name === "LessonSection")
    .map((n) => ({ title: n.attributes.find((a) => a.name === "title")?.value ?? "", ...count(n) }));
  const total = count(tree);
  return { sections, ...total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const bySection = args[0] === "--sections";
  const filter = (bySection ? args[1] : args[0]) ?? "";
  const files = pages(filter.replace(/^content\//, "")).filter((p) => p.file.endsWith("page.mdx"));
  let shown = 0;
  let all = 0;
  for (const p of files) {
    const s = await foldStats(path.join(root, p.file));
    shown += s.shown;
    all += s.shown + s.folded;
    const pct = Math.round((s.shown / Math.max(1, s.shown + s.folded)) * 100);
    console.log(`${p.file.padEnd(58)} ${String(s.shown).padStart(5)} showing ${String(s.folded).padStart(5)} folded  ${String(pct).padStart(3)}%`);
    if (bySection) for (const sec of s.sections) console.log(`    ${sec.title.padEnd(50)} ${String(sec.shown).padStart(5)} ${String(sec.folded).padStart(5)}`);
  }
  console.log(`\n${files.length} pages · ${shown} of ${all} words showing (${Math.round((shown / Math.max(1, all)) * 100)}%)`);
}

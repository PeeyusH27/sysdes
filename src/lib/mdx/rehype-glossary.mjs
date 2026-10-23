// Plain words for jargon, without rewriting every sentence: the first time a glossary term appears in a section of a
// page, it becomes a <Term> that underlines it and shows its plain-words definition on hover, focus or tap.
//
// - "First time in a section": the count resets at every `##`, so someone who jumps straight to a section still gets
//   the definition where they land.
// - Never inside code, links, headings, table cells, buttons or the Doodle's caption: only in running prose.
// - Terms and `aliases` come from content/glossary.json. A term written as "Dead letter queue (DLQ)" is matched as both
//   "Dead letter queue" and "DLQ". Acronyms match case-sensitively, everything else ignores case; a plural "s" is allowed.
//
// Registered by absolute path in next.config.ts (Turbopack only accepts plugins it can import by name).
import { readFileSync } from "node:fs";
import path from "node:path";

const SKIP = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "button", "kbd", "table", "summary", "figcaption", "svg"]);
const SKIP_JSX = new Set(["Doodle", "Term", "CodeBlock", "CodeTabs", "RunCode", "Quiz", "AlgoViz", "FlowDiagram", "SequenceDiagram", "ClassDiagram"]);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every way a glossary entry can appear in text, longest first. */
export function variantsOf(entry) {
  const out = new Set();
  const base = entry.term.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  out.add(base);
  const paren = /\(([^)]+)\)/.exec(entry.term);
  if (paren && !/\s/.test(paren[1])) out.add(paren[1]);
  for (const a of entry.aliases ?? []) out.add(a);
  return [...out].filter((v) => v.length >= 3);
}

const isAcronym = (v) => /^[A-Z0-9/]{2,6}$/.test(v) || /^[A-Z]{2,}[0-9]*$/.test(v);

export function loadGlossary(file = path.join(process.cwd(), "content", "glossary.json")) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  return data.map((entry) => ({
    entry,
    variants: variantsOf(entry).map((v) => ({
      text: v,
      re: new RegExp(`(?<![\\w-])(${escape(v)})(?:s|es)?(?![\\w-])`, isAcronym(v) ? "" : "i"),
    })),
  }));
}

const attr = (name, value) => ({ type: "mdxJsxAttribute", name, value });

function termNode(entry, text) {
  const attributes = [attr("term", entry.term), attr("def", entry.def)];
  if (entry.primer) attributes.push(attr("primer", entry.primer));
  if (entry.href) attributes.push(attr("href", entry.href));
  return { type: "mdxJsxTextElement", name: "Term", attributes, children: [{ type: "text", value: text }] };
}

/** Split one text node around the earliest unseen term. Returns null when nothing matches. */
function split(value, glossary, seen) {
  let best = null;
  for (const g of glossary) {
    if (seen.has(g.entry.term)) continue;
    for (const v of g.variants) {
      const m = v.re.exec(value);
      if (m && (best === null || m.index < best.index || (m.index === best.index && m[0].length > best.text.length))) {
        best = { index: m.index, text: m[0], entry: g.entry };
      }
    }
  }
  if (!best) return null;
  seen.add(best.entry.term);
  const after = value.slice(best.index + best.text.length);
  const rest = after ? split(after, glossary, seen) ?? [{ type: "text", value: after }] : [];
  return [...(best.index ? [{ type: "text", value: value.slice(0, best.index) }] : []), termNode(best.entry, best.text), ...rest];
}

function walk(node, glossary, seen) {
  if (!node.children) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === "text") {
      const parts = child.value.trim() ? split(child.value, glossary, seen) : null;
      if (parts) next.push(...parts);
      else next.push(child);
      continue;
    }
    const skip = (child.type === "element" && SKIP.has(child.tagName)) || ((child.type === "mdxJsxFlowElement" || child.type === "mdxJsxTextElement") && SKIP_JSX.has(child.name));
    if (!skip) walk(child, glossary, seen);
    next.push(child);
  }
  node.children = next;
}

export default function rehypeGlossary(options = {}) {
  const glossary = options.glossary ?? loadGlossary();
  return (tree) => {
    let seen = new Set();
    for (const top of tree.children) {
      if (top.type === "element" && top.tagName === "h2") seen = new Set();
      else walk({ children: [top] }, glossary, seen);
    }
  };
}

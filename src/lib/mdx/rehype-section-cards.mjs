// Wraps every `##` section of an MDX page in <LessonSection>, so long pages read as a stack of cards, and splits each
// section into the words you read and the things you watch or play with.
// Runs after rehype-slug (the h2 already has its id). Content before the first `##` (the TL;DR) is left alone.
//
// Each card gets: index (1-based), id (the h2's id), title, minutes (reading time), kind and layout:
//   kind    practice: has a quiz or interview Q&A   code: mostly code   visual: has a diagram/widget   read: prose
//   layout  split: there is something to watch beside the text   single: one column (nothing to watch, or nothing to read)
//
// Inside a card the top-level children are partitioned, each group keeping its original order:
//   text  (the h2, paragraphs, lists, tables, h3s, TLDR, Callout, Requirements, Steps, FollowUps, JsRef, ProblemLink…)
//   stage (every other capitalised MDX component: diagrams, widgets, labs, AlgoViz, charts, CodeTabs, Quiz…, plus
//          top-level fenced code)
// A split card holds one `div.sec-row` per row, each with a `div.sec-body` (text) and a `div.sec-stage` (visuals,
// wrapped in a `div.sec-fit` that the desktop pane scales). Usually that is one row. When `###` subsections bring their
// own visuals (a "Code" section with one snippet per `###`), each subsection gets its own row, so each snippet is
// shown while the words that explain it are being read.
// A single card holds a `div.sec-body` (and a `div.sec-stage` after it when the section is all visuals).
// Below ~1080 px a stage follows its text. From ~1080 px the stages leave the text column and the one that belongs to
// the text being read is shown in the pinned pane on the left (src/components/layout/StagePane.tsx, src/app/reader.css).
//
// Registered by absolute path in next.config.ts, because Turbopack only accepts plugins it can import by name.

/** Components that are just styled prose: they count as words, not as something to watch or play with. */
const TEXT_COMPONENTS = new Set(["TLDR", "Callout", "Requirements", "Steps", "Step", "FollowUps", "FollowUp", "JsRef", "ProblemLink"]);
const CODE_COMPONENTS = new Set(["CodeTabs", "CodeBlock", "RunCode"]);
const PRACTICE_COMPONENTS = new Set(["Quiz", "FollowUps", "DiagramQuiz", "InterviewTimer"]);

const isH2 = (node) => node.type === "element" && node.tagName === "h2";
const isH3 = (node) => node.type === "element" && node.tagName === "h3";
const isBlank = (node) => node.type === "text" && !node.value.trim();

/** Something to watch or play with: a capitalised non-text MDX component, or a top-level fenced code block. */
export function isStageNode(node) {
  if (node.type === "element") return node.tagName === "pre";
  return node.type === "mdxJsxFlowElement" && !!node.name && /^[A-Z]/.test(node.name) && !TEXT_COMPONENTS.has(node.name);
}

function textOf(node) {
  if (node.type === "text") return node.value;
  let out = "";
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    for (const a of node.attributes ?? []) if (a.type === "mdxJsxAttribute" && typeof a.value === "string") out += ` ${a.value}`;
  }
  for (const c of node.children ?? []) out += ` ${textOf(c)}`;
  return out;
}

/** Walk a section and count what's in it. */
function survey(nodes) {
  const found = { words: 0, visuals: 0, code: 0, practice: false };
  const walk = (node) => {
    if (node.type === "element" && node.tagName === "pre") {
      found.code++;
      return;
    }
    if (node.type === "mdxJsxFlowElement" && node.name) {
      if (PRACTICE_COMPONENTS.has(node.name)) found.practice = true;
      if (CODE_COMPONENTS.has(node.name)) found.code++;
      else if (!TEXT_COMPONENTS.has(node.name) && /^[A-Z]/.test(node.name)) found.visuals++;
    }
    if (node.type === "text") found.words += node.value.split(/\s+/).filter(Boolean).length;
    if (node.type === "mdxJsxFlowElement") {
      for (const a of node.attributes ?? []) {
        if (a.type === "mdxJsxAttribute" && typeof a.value === "string") found.words += a.value.split(/\s+/).filter(Boolean).length;
      }
    }
    for (const c of node.children ?? []) walk(c);
  };
  nodes.forEach(walk);
  return found;
}

function kindOf(title, f) {
  if (f.practice) return "practice";
  if (f.code > 0 && (f.code >= f.visuals || /\b(code|implementation|template)\b/i.test(title))) return "code";
  if (f.visuals > 0) return "visual";
  return "read";
}

const attr = (name, value) => ({ type: "mdxJsxAttribute", name, value: String(value) });
const div = (className, children) => ({ type: "element", tagName: "div", properties: { className: [className] }, children });
const stage = (children) => div("sec-stage", [div("sec-fit", children)]);

/**
 * Split a section's nodes (h2 first) into rows of { text, stage }. A new row starts at a `###` only when both the
 * row so far and the new subsection have visuals; otherwise the subsection joins the current row.
 */
export function partition(nodes) {
  const chunks = [{ text: [], stage: [] }];
  for (const node of nodes) {
    if (isH3(node)) chunks.push({ text: [], stage: [] });
    const chunk = chunks[chunks.length - 1];
    if (isStageNode(node)) chunk.stage.push(node);
    else if (!isBlank(node)) chunk.text.push(node);
  }
  const rows = [];
  for (const chunk of chunks) {
    const row = rows[rows.length - 1];
    if (row && (!chunk.stage.length || !row.stage.length)) {
      row.text.push(...chunk.text);
      row.stage.push(...chunk.stage);
    } else rows.push(chunk);
  }
  return rows;
}

/** The children of a <LessonSection> for one section, and its layout. */
function arrange(nodes) {
  const rows = partition(nodes);
  const hasStage = rows.some((r) => r.stage.length);
  // Nothing to read beside the visuals (just the heading): one column, heading first.
  const onlyHeading = rows.length === 1 && rows[0].text.length <= 1;
  if (!hasStage) return { layout: "single", children: [div("sec-body", rows[0].text)] };
  if (onlyHeading) return { layout: "single", children: [div("sec-body", rows[0].text), stage(rows[0].stage)] };
  return { layout: "split", children: rows.map((r) => div("sec-row", [div("sec-body", r.text), stage(r.stage)])) };
}

export default function rehypeSectionCards() {
  return (tree) => {
    const out = [];
    let current = null;
    let index = 0;
    const close = () => {
      if (!current) return;
      const f = survey(current.children);
      // ~200 words a minute, plus half a minute for each diagram or widget to play with.
      const minutes = Math.max(1, Math.round(f.words / 200 + f.visuals * 0.5 + f.code * 0.5));
      const { layout, children } = arrange(current.children);
      current.attributes.push(attr("minutes", minutes), attr("kind", kindOf(current.title, f)), attr("layout", layout));
      current.children = children;
      delete current.title;
      out.push(current);
      current = null;
    };
    for (const node of tree.children) {
      if (isH2(node)) {
        close();
        index++;
        const title = textOf(node).replace(/\s+/g, " ").trim();
        current = {
          type: "mdxJsxFlowElement",
          name: "LessonSection",
          title,
          attributes: [attr("index", index), attr("id", node.properties?.id ?? `section-${index}`), attr("title", title)],
          children: [node],
        };
      } else if (current && node.type !== "mdxjsEsm") {
        current.children.push(node);
      } else {
        out.push(node);
      }
    }
    close();
    tree.children = out;
  };
}

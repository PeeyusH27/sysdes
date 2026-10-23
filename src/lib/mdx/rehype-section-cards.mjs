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
// A stage always follows its text in the DOM (src/app/reader.css shows it right under the heading).
// Picture first, few words: in each row only the heading(s) and the first block of words stay out; the rest of the
// words fold into `details.sec-more` ("Read more · N words"), see `fold` below.
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

/** Text blocks that are something to do rather than something to read: they never fold away. */
const ALWAYS_SHOWN = new Set(["FollowUps", "ProblemLink"]);
const isHeading = (node) => node.type === "element" && /^h[2-6]$/.test(node.tagName);
const countWords = (nodes) => nodes.reduce((n, node) => n + (textOf(node).match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)?.length ?? 0), 0);

/** A first paragraph longer than this many words shows only its first sentence. */
const LEAD_MAX = 30;
/** Words before a sentence end for it to count as the lead sentence (so "Two ways." is not the whole lead). */
const LEAD_MIN = 6;
const ABBREVIATION = /\b(?:e\.g|i\.e|vs|etc|approx|ca|cf)\.$/i;

/**
 * Split a paragraph after its first full sentence: `[lead, rest]`, or null when there is no clean split (one long
 * sentence). Inline elements (bold, code, links) are never cut; the split is always inside a plain text node.
 */
export function splitFirstSentence(p) {
  const kids = p.children ?? [];
  let before = 0;
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i];
    if (node.type !== "text") {
      before += countWords([node]);
      continue;
    }
    const end = /[.!?]["')\u201d]?(?=\s)/g;
    let m;
    while ((m = end.exec(node.value))) {
      const cut = m.index + m[0].length;
      const head = node.value.slice(0, cut);
      if (ABBREVIATION.test(head.trimEnd())) continue;
      if (before + countWords([{ type: "text", value: head }]) < LEAD_MIN) continue;
      const rest = node.value.slice(cut).replace(/^\s+/, "");
      const tail = [...(rest ? [{ type: "text", value: rest }] : []), ...kids.slice(i + 1)];
      if (!countWords(tail)) return null;
      return [
        { ...p, children: [...kids.slice(0, i), { type: "text", value: head }] },
        { ...p, properties: { ...(p.properties ?? {}) }, children: tail },
      ];
    }
    before += countWords([node]);
  }
  return null;
}

/**
 * Picture first, few words: a row shows its heading(s), its visuals and its first block of words (the key line).
 * Everything else folds into a native <details class="sec-more"> ("Read more · 84 words"), so the page is mostly
 * pictures until the reader asks for more. Blocks the reader acts on (interview Q&A, problem links) stay visible.
 * Returns the row's text with the fold applied, and how many words are left showing.
 */
export function fold(text) {
  const head = []; // headings, then the lead block
  const more = []; // folded away
  const tail = []; // things to do that come after the lead (they follow the fold)
  let lead = false;
  for (const node of text) {
    const always = node.type === "mdxJsxFlowElement" && ALWAYS_SHOWN.has(node.name);
    if (!lead && (always || isHeading(node))) head.push(node);
    else if (!lead) {
      lead = true;
      if (isSteps(node)) {
        // A step-by-step list leads as its outline: the step titles show, each step's words open on a tap.
        head.push(compactSteps(node));
      } else if (node.type === "element" && node.tagName === "p") {
        // A long first paragraph keeps only its first sentence out; the rest of it opens the fold.
        const split = countWords([node]) > LEAD_MAX ? splitFirstSentence(node) : null;
        head.push(split ? split[0] : node);
        if (split) more.push(split[1]);
      } else if (countWords([node]) > LEAD_MAX) {
        // A big table, list or callout up front is reference material: it folds, the picture and heading lead.
        more.push(node);
      } else head.push(node);
    } else if (always) tail.push(node);
    else more.push(node);
  }
  const visible = (nodes) => nodes.reduce((n, node) => n + (isSteps(node) && hasAttr(node, "compact") ? stepTitleWords(node) : countWords([node])), 0);
  // A fold that hides only a sentence or two costs more clicks than it saves: keep the row as written.
  const hidden = countWords(more);
  if (hidden < 25) {
    const all = text.map((n) => (isSteps(n) ? compactSteps(n) : n));
    return { text: all, visible: visible(all) };
  }
  const summary = { type: "element", tagName: "summary", properties: {}, children: [{ type: "text", value: `Read more · ${hidden} words` }] };
  const details = { type: "element", tagName: "details", properties: { className: ["sec-more"] }, children: [summary, div("sec-more-body", more)] };
  return { text: [...head, details, ...tail], visible: visible(head) + visible(tail) };
}

const isSteps = (node) => node.type === "mdxJsxFlowElement" && node.name === "Steps";
const hasAttr = (node, name) => (node.attributes ?? []).some((a) => a.name === name);
/** Steps with `compact`: <Steps> passes it on to each <Step>, which shows its title and folds its words. */
const compactSteps = (node) => (hasAttr(node, "compact") ? node : { ...node, attributes: [...(node.attributes ?? []), { type: "mdxJsxAttribute", name: "compact", value: "true" }] });
const stepTitleWords = (node) =>
  (node.children ?? [])
    .filter((c) => c.type === "mdxJsxFlowElement" && c.name === "Step")
    .reduce((n, c) => n + countWords([{ type: "text", value: String(c.attributes?.find((a) => a.name === "title")?.value ?? "") }]), 0);

/** The children of a <LessonSection> for one section, its layout, and the words left showing after folding. */
function arrange(nodes) {
  const rows = partition(nodes);
  let visible = 0;
  for (const r of rows) {
    const f = fold(r.text);
    r.text = f.text;
    visible += f.visible;
  }
  const hasStage = rows.some((r) => r.stage.length);
  // Nothing to read beside the visuals (just the heading): one column, heading first.
  const onlyHeading = rows.length === 1 && rows[0].text.length <= 1;
  if (!hasStage) return { layout: "single", visible, children: [div("sec-body", rows[0].text)] };
  if (onlyHeading) return { layout: "single", visible, children: [div("sec-body", rows[0].text), stage(rows[0].stage)] };
  return { layout: "split", visible, children: rows.map((r) => div("sec-row", [div("sec-body", r.text), stage(r.stage)])) };
}

export default function rehypeSectionCards() {
  return (tree) => {
    const out = [];
    let current = null;
    let index = 0;
    const close = () => {
      if (!current) return;
      const f = survey(current.children);
      const { layout, children, visible } = arrange(current.children);
      // ~200 words a minute for the words left showing, plus half a minute for each diagram or widget to play with.
      const minutes = Math.max(1, Math.round(visible / 200 + f.visuals * 0.5 + f.code * 0.5));
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

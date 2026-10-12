// Wraps every `##` section of an MDX page in <LessonSection>, so long pages read as a stack of cards.
// Runs after rehype-slug (the h2 already has its id). Content before the first `##` (the TL;DR) is left alone.
//
// Each card gets: index (1-based), id (the h2's id), title, minutes (reading time) and kind:
//   practice: has a quiz or interview Q&A   code: mostly code   visual: has a diagram/widget   read: prose
// Registered by absolute path in next.config.ts, because Turbopack only accepts plugins it can import by name.

/** Components that are just styled prose: they count as words, not as something to watch or play with. */
const TEXT_COMPONENTS = new Set(["TLDR", "Callout", "Requirements", "Steps", "Step", "FollowUps", "FollowUp", "JsRef", "ProblemLink"]);
const CODE_COMPONENTS = new Set(["CodeTabs", "CodeBlock", "RunCode"]);
const PRACTICE_COMPONENTS = new Set(["Quiz", "FollowUps", "DiagramQuiz", "InterviewTimer"]);

const isH2 = (node) => node.type === "element" && node.tagName === "h2";

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
      current.attributes.push(attr("minutes", minutes), attr("kind", kindOf(current.title, f)));
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

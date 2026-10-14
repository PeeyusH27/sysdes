// Fast content validation without a full Next build:
//   node scripts/check-content.mjs [path-filter]
// - compiles every MDX file (syntax errors, unescaped < or { in prose…)
// - every <Component> used must be registered in src/mdx-components.tsx
// - every CodeTabs (files, java, python)/CodeBlock/RunCode (src, python, java) file and every relative import must exist
// - DSA: <JsRef to> ids and <ProblemLink slug> values must exist
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

const root = path.resolve(import.meta.dirname, "..");
const filter = process.argv[2] ?? "";

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const widgetExports = [...readFileSync(path.join(root, "src/components/widgets/index.ts"), "utf8").matchAll(/export \{ (\w+) \}/g)].map((m) => m[1]);
const allowed = new Set([
  "TLDR", "Callout", "Requirements", "Steps", "Step", "FollowUps", "FollowUp", "Quiz", "CodeBlock", "CodeTabs",
  "StatTiles", "BarChart", "LineChart", "FlowDiagram", "SequenceDiagram", "ClassDiagram", "DecisionTree", "Timeline",
  "AlgoViz", "JsRef", "ProblemLink", "RunCode",
  ...widgetExports,
]);
const dsaRegistry = readFileSync(path.join(root, "content/dsa/registry.ts"), "utf8");
const jsBlock = dsaRegistry.slice(dsaRegistry.indexOf("export const jsTopics"), dsaRegistry.indexOf("export const patterns"));
const jsIds = new Set([...jsBlock.matchAll(/\bid: "([a-z0-9-]+)"/g)].map((m) => m[1]));
const problemsDir = path.join(root, "content/dsa/problems");

const files = walk(path.join(root, "content")).filter((f) => f.endsWith(".mdx") && f.includes(filter));
let errors = 0;
const fail = (file, msg) => {
  errors++;
  console.error(`✗ ${path.relative(root, file)}: ${msg}`);
};

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const dir = path.dirname(file);
  try {
    await compile(src, { remarkPlugins: [remarkGfm] });
  } catch (e) {
    fail(file, `MDX compile error: ${e.message}${e.line ? ` (line ${e.line}:${e.column})` : ""}`);
    continue;
  }
  const noFences = src.replace(/```[\s\S]*?```/g, "");
  for (const m of noFences.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    if (!allowed.has(m[1])) fail(file, `unknown component <${m[1]}> (not registered in src/mdx-components.tsx)`);
  }
  // <CodeTabs files={[…]} java={[…]} python={[…]} />: every listed file must exist, and a language list must
  // contain at least one file of that language (shared files such as a .sql may ride along).
  for (const m of noFences.matchAll(/\b(files|java|python)=\{\[([^\]]*)\]\}/g)) {
    const [, prop, list] = m;
    const rels = (list.match(/['"]([^'"]+)['"]/g) ?? []).map((f) => f.slice(1, -1));
    for (const rel of rels) {
      if (!existsSync(path.join(dir, rel))) fail(file, `CodeTabs ${prop === "files" ? "file" : `${prop} file`} not found: ${rel}`);
    }
    const ext = { java: ".java", python: ".py" }[prop];
    if (ext && !rels.some((r) => r.endsWith(ext))) fail(file, `CodeTabs ${prop}={[…]} lists no ${ext} file`);
  }
  for (const m of noFences.matchAll(/<(CodeBlock|RunCode)[^>]*\ssrc=["']([^"']+)["']/g)) {
    if (!existsSync(path.join(dir, m[2]))) fail(file, `${m[1]} src not found: ${m[2]}`);
  }
  // <RunCode src="….js" python="….py" java="….java" />: the other languages are plain path strings that must exist.
  for (const tag of noFences.matchAll(/<RunCode\b[^>]*>/g)) {
    for (const [, prop, rel] of tag[0].matchAll(/\s(python|java)=["']([^"']+)["']/g)) {
      const ext = prop === "java" ? ".java" : ".py";
      if (!rel.endsWith(ext)) fail(file, `RunCode ${prop}="${rel}" must be a ${ext} file`);
      else if (!existsSync(path.join(dir, rel))) fail(file, `RunCode ${prop} file not found: ${rel}`);
    }
    if (/\s(python|java)=\{/.test(tag[0])) fail(file, `RunCode python/java take a path string, e.g. python="snippets/python/try_it.py"`);
  }
  for (const m of noFences.matchAll(/<JsRef\s+to=(?:"([^"]+)"|\{\[([^\]]*)\]\})/g)) {
    const ids = m[1] ? [m[1]] : (m[2].match(/['"]([^'"]+)['"]/g) ?? []).map((x) => x.slice(1, -1));
    for (const id of ids) if (!jsIds.has(id)) fail(file, `<JsRef>: unknown cheat sheet topic "${id}" (see content/dsa/registry.ts)`);
  }
  for (const m of noFences.matchAll(/<ProblemLink\s+slug=["']([^"']+)["']/g)) {
    if (!existsSync(path.join(problemsDir, m[1], "problem.json"))) fail(file, `<ProblemLink>: no problem folder content/dsa/problems/${m[1]}`);
  }
  for (const m of noFences.matchAll(/\]\((\/dsa\/(?:patterns|problems)\/([a-z0-9-]+))\)/g)) {
    const [, href, slug] = m;
    const ok = href.startsWith("/dsa/problems/") ? existsSync(path.join(problemsDir, slug, "problem.json")) : dsaRegistry.includes(`slug: "${slug}"`);
    if (!ok) fail(file, `broken link ${href}`);
  }
  for (const m of noFences.matchAll(/\]\(\/dsa\/js#([a-z0-9-]+)\)/g)) {
    if (!jsIds.has(m[1])) fail(file, `broken link /dsa/js#${m[1]}`);
  }
  for (const m of src.matchAll(/^import .* from ['"](\.\.?\/[^'"]+)['"]/gm)) {
    const base = path.join(dir, m[1]);
    if (![base, `${base}.ts`, `${base}.tsx`, `${base}.js`].some(existsSync)) fail(file, `import not found: ${m[1]}`);
  }
}

console.log(`${files.length} MDX file(s) checked, ${errors} problem(s).`);
process.exit(errors ? 1 : 0);

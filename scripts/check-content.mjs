// Fast content validation without a full Next build:
//   node scripts/check-content.mjs [path-filter]
// - compiles every MDX file (syntax errors, unescaped < or { in prose…)
// - every <Component> used must be registered in src/mdx-components.tsx
// - every CodeTabs/CodeBlock file and every relative import must exist
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
  ...widgetExports,
]);

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
  for (const m of noFences.matchAll(/files=\{\[([^\]]*)\]\}/g)) {
    for (const f of m[1].match(/['"]([^'"]+)['"]/g) ?? []) {
      const rel = f.slice(1, -1);
      if (!existsSync(path.join(dir, rel))) fail(file, `CodeTabs file not found: ${rel}`);
    }
  }
  for (const m of noFences.matchAll(/<CodeBlock[^>]*\ssrc=["']([^"']+)["']/g)) {
    if (!existsSync(path.join(dir, m[1]))) fail(file, `CodeBlock src not found: ${m[1]}`);
  }
  for (const m of src.matchAll(/^import .* from ['"](\.\.?\/[^'"]+)['"]/gm)) {
    const base = path.join(dir, m[1]);
    if (![base, `${base}.ts`, `${base}.tsx`, `${base}.js`].some(existsSync)) fail(file, `import not found: ${m[1]}`);
  }
}

console.log(`${files.length} MDX file(s) checked, ${errors} problem(s).`);
process.exit(errors ? 1 : 0);

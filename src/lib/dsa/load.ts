// Reads problems from content/dsa/problems/<slug>/. Used by server pages and by the tests (so no "server-only" here).
//   problem.json   metadata + test cases (validated with zod)
//   statement.md   the problem description (Markdown)
//   solution.md    step-by-step approach (Markdown)
//   solution.js    reference solution (checked against every test by tests/dsa.test.ts)
//   starter.js     optional; otherwise a starter is generated from fn/params/types
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { patterns } from "@content/dsa/registry";
import { ProblemMeta, type FunctionProblemMeta, type RunnableProblem } from "./schema";

export const PROBLEMS_DIR = path.join(process.cwd(), "content", "dsa", "problems");

export interface LoadedProblem {
  slug: string;
  meta: ProblemMeta;
  statement: string;
  approach: string;
  solution: string;
  starter: string;
}

const read = (slug: string, file: string) => {
  const p = path.join(PROBLEMS_DIR, slug, file);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
};

export function problemSlugs() {
  if (!existsSync(PROBLEMS_DIR)) return [];
  return readdirSync(PROBLEMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(PROBLEMS_DIR, d.name, "problem.json")))
    .map((d) => d.name);
}

const LIST_DOC = `/**
 * Linked list nodes are provided (you don't need to define them):
 * class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
 */`;
const TREE_DOC = `/**
 * Tree nodes are provided (you don't need to define them):
 * class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } }
 */`;

/** JSDoc + empty function, e.g. `function twoSum(nums, target) {}` with @param types. */
export function generateStarter(meta: FunctionProblemMeta) {
  const io = [...(meta.io?.args ?? []), meta.io?.returns];
  const docs = [];
  if (io.some((t) => t === "list" || t === "list-cycle" || t === "list[]")) docs.push(LIST_DOC);
  if (io.includes("tree")) docs.push(TREE_DOC);
  const params = meta.params.map((p, i) => ` * @param {${meta.types.params[i] ?? "*"}} ${p}`);
  const jsdoc = ["/**", ...params, ` * @return {${meta.types.returns}}`, " */"].join("\n");
  return [...docs, `${jsdoc}\nfunction ${meta.fn}(${meta.params.join(", ")}) {\n  \n}\n`].join("\n");
}

const patternOrder = new Map(patterns.map((p) => [p.slug, p.order]));
const DIFF = { Easy: 0, Medium: 1, Hard: 2 } as const;

let cache: LoadedProblem[] | undefined;

/** All problems, sorted by primary pattern, then `order`. Throws on invalid problem.json (fails the build loudly). */
export function loadProblems(): LoadedProblem[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const out = problemSlugs().map((slug) => {
    const raw = JSON.parse(read(slug, "problem.json"));
    const parsed = ProblemMeta.safeParse(raw);
    if (!parsed.success) throw new Error(`content/dsa/problems/${slug}/problem.json: ${parsed.error.message}`);
    const meta = parsed.data;
    const starter = read(slug, "starter.js") || (meta.kind === "design" ? `class ${meta.className} {\n  constructor() {\n    \n  }\n}\n` : generateStarter(meta));
    return { slug, meta, statement: read(slug, "statement.md"), approach: read(slug, "solution.md"), solution: read(slug, "solution.js"), starter };
  });
  out.sort(
    (a, b) =>
      (patternOrder.get(a.meta.patterns[0]) ?? 99) - (patternOrder.get(b.meta.patterns[0]) ?? 99) ||
      a.meta.order - b.meta.order ||
      DIFF[a.meta.difficulty] - DIFF[b.meta.difficulty] ||
      a.slug.localeCompare(b.slug),
  );
  cache = out;
  return out;
}

export const loadProblem = (slug: string) => loadProblems().find((p) => p.slug === slug);

/** The part of a problem the browser runner needs (no markdown, no solution). */
export function runnable(p: LoadedProblem): RunnableProblem {
  return { ...p.meta, slug: p.slug };
}

/** Light rows for lists and filters. */
export interface ProblemRow {
  slug: string;
  title: string;
  difficulty: ProblemMeta["difficulty"];
  patterns: string[];
  summary: string;
  js: string[];
}

export const problemRows = (): ProblemRow[] =>
  loadProblems().map((p) => ({ slug: p.slug, title: p.meta.title, difficulty: p.meta.difficulty, patterns: p.meta.patterns, summary: p.meta.summary, js: p.meta.js }));

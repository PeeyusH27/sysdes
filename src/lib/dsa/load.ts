// Reads problems from content/dsa/problems/<slug>/. Used by server pages and by the tests (so no "server-only" here).
//   problem.json   metadata + test cases (validated with zod)
//   statement.md   the problem description (Markdown)
//   solution.md    step-by-step approach (Markdown)
//   solution.js    reference solution (checked against every test by tests/dsa.test.ts)
//   starter.js     optional; otherwise a starter is generated from fn/params/types
// The Python starter is always generated (src/lib/dsa/python.ts), following starter.js for design problems.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { patterns } from "@content/dsa/registry";
import { ProblemMeta, type FunctionProblemMeta, type RunnableProblem } from "./schema";
import { generatePythonStarter } from "./python";

export const PROBLEMS_DIR = path.join(process.cwd(), "content", "dsa", "problems");
/** LLD exercises are design problems in the same format: content/lld/exercises/<slug>/. */
export const EXERCISES_DIR = path.join(process.cwd(), "content", "lld", "exercises");

export interface LoadedProblem {
  slug: string;
  meta: ProblemMeta;
  statement: string;
  approach: string;
  solution: string;
  starter: string;
  /** Python starter code (snake_case names, type hints). */
  starterPy: string;
}

const read = (slug: string, file: string, dir = PROBLEMS_DIR) => {
  const p = path.join(dir, slug, file);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
};

export function problemSlugs(dir = PROBLEMS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "problem.json")))
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

function readProblems(dir: string): LoadedProblem[] {
  return problemSlugs(dir).map((slug) => {
    const raw = JSON.parse(read(slug, "problem.json", dir));
    const parsed = ProblemMeta.safeParse(raw);
    if (!parsed.success) throw new Error(`${path.relative(process.cwd(), dir)}/${slug}/problem.json: ${parsed.error.message}`);
    const meta = parsed.data;
    const starterJs = read(slug, "starter.js", dir);
    const starter = starterJs || (meta.kind === "design" ? `class ${meta.className} {\n  constructor() {\n    \n  }\n}\n` : generateStarter(meta));
    const starterPy = generatePythonStarter(meta, starterJs || undefined);
    return { slug, meta, statement: read(slug, "statement.md", dir), approach: read(slug, "solution.md", dir), solution: read(slug, "solution.js", dir), starter, starterPy };
  });
}

let cache: LoadedProblem[] | undefined;

/** All problems, sorted by primary pattern, then `order`. Throws on invalid problem.json (fails the build loudly). */
export function loadProblems(): LoadedProblem[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const out = readProblems(PROBLEMS_DIR);
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

let exerciseCache: LoadedProblem[] | undefined;

/**
 * LLD exercises: design problems (`kind: "design"`) in content/lld/exercises/. `patterns` holds lesson slugs from
 * content/lld/registry.ts instead of DSA patterns. Sorted by `order`.
 */
export function loadExercises(): LoadedProblem[] {
  if (exerciseCache && process.env.NODE_ENV === "production") return exerciseCache;
  const out = readProblems(EXERCISES_DIR).sort((a, b) => a.meta.order - b.meta.order || a.slug.localeCompare(b.slug));
  exerciseCache = out;
  return out;
}

export const loadExercise = (slug: string) => loadExercises().find((p) => p.slug === slug);

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

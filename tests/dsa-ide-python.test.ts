// Python in the practice IDE and in <RunCode>: name mapping, generated starters, and the snippet loader. Where python3
// is installed, the starters and runnable snippets also go through the real harness (public/dsa-runner.py), the same
// code the browser runs in Pyodide.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProblems, PROBLEMS_DIR } from "@/lib/dsa/load";
import { functionPythonStarter, generatePythonStarter, parseJsClass, pyParam, pythonMethod, pythonTarget, pyType, snakeCase } from "@/lib/dsa/python";
import { loadRunnablePy, loadShownOnly } from "@/lib/dsa/snippet";
import type { DesignProblemMeta, FunctionProblemMeta } from "@/lib/dsa/schema";

const root = path.resolve(__dirname, "..");
// The JS runner's judging (the Python worker reuses it): compareValues for answers, validators as in dsa-runner.js.
new Function(readFileSync(path.join(root, "public", "dsa-runner.js"), "utf8"))();
const { compareValues } = (globalThis as unknown as { __dsaHarness: { compareValues: (a: unknown, b: unknown, mode: string) => boolean } }).__dsaHarness;
const HARNESS = path.join(root, "public", "dsa-runner.py");
const hasPython = (() => {
  try {
    return spawnSync("python3", ["--version"], { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
})();

/** Runs a Python program with JSON on stdin and parses the JSON it prints. */
function python(program: string, input: unknown) {
  const r = spawnSync("python3", ["-I", "-B", "-c", program, HARNESS], { input: JSON.stringify(input), encoding: "utf8", timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || `python3 exited with ${r.status}`);
  return JSON.parse(r.stdout);
}
// Imports the harness from the path in argv[1] (its file name has a dash, so not a plain import).
const IMPORT_HARNESS = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("dsa_runner", sys.argv[1])
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
`;

describe("names", () => {
  it("maps camelCase to snake_case the way LeetCode's Python does", () => {
    const cases: Record<string, string> = {
      accountsMerge: "accounts_merge",
      twoSum: "two_sum",
      evalRPN: "eval_rpn",
      lengthOfLIS: "length_of_lis",
      isValidBST: "is_valid_bst",
      solveNQueens: "solve_n_queens",
      kClosest: "k_closest",
      minSubArrayLen: "min_sub_array_len",
      getMin: "get_min",
      word1: "word1",
      list2: "list2",
      s1: "s1",
      trap: "trap",
      HTMLParser: "html_parser",
    };
    for (const [js, py] of Object.entries(cases)) expect(snakeCase(js), js).toBe(py);
  });

  it("keeps parameters legal Python and maps design ops to methods", () => {
    expect(pyParam("numCourses")).toBe("num_courses");
    expect(pyParam("lambda")).toBe("lambda_");
    expect(pythonMethod("MinStack", "MinStack")).toBe("__init__");
    expect(pythonMethod("getMin", "MinStack")).toBe("get_min");
  });

  it("maps problem.json types to type hints", () => {
    expect(pyType("number")).toBe("int");
    expect(pyType("number", true)).toBe("float");
    expect(pyType("number[][]")).toBe("List[List[int]]");
    expect(pyType("string[]")).toBe("List[str]");
    expect(pyType("boolean")).toBe("bool");
    expect(pyType("void")).toBe("None");
    expect(pyType("ListNode | null")).toBe("Optional[ListNode]");
    expect(pyType("TreeNode")).toBe("Optional[TreeNode]");
    expect(pyType("ListNode[]")).toBe("List[Optional[ListNode]]");
    expect(pyType("number | string")).toBe("Union[int, str]");
  });

  it.skipIf(!hasPython)("agrees with the harness's snake_case for every function, parameter and op", () => {
    const names = new Set<string>();
    for (const p of loadProblems()) {
      if (p.meta.kind === "design") p.meta.tests.forEach((t) => t.ops.forEach((o) => names.add(o)));
      else [p.meta.fn, ...p.meta.params].forEach((n) => names.add(n));
    }
    const theirs: Record<string, string> = python(`${IMPORT_HARNESS}\nprint(json.dumps({n: runner.snake_case(n) for n in json.load(sys.stdin)}))`, [...names]);
    for (const n of names) expect(snakeCase(n), n).toBe(theirs[n]);
  });
});

describe("starters", () => {
  const problems = loadProblems();
  const get = (slug: string) => problems.find((p) => p.slug === slug)!;

  it("writes a typed function with the node classes in a comment", () => {
    expect(functionPythonStarter(get("two-sum").meta as FunctionProblemMeta)).toBe("from typing import List\n\n\ndef two_sum(nums: List[int], target: int) -> List[int]:\n    pass\n");
    const merge = get("merge-k-sorted-lists").starterPy;
    expect(merge).toContain("from typing import List, Optional");
    expect(merge).toContain("# class ListNode:");
    expect(merge).toContain("def merge_k_lists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:");
    expect(get("average-of-levels").starterPy).toContain("def average_of_levels(root: Optional[TreeNode]) -> List[float]:");
    expect(get("move-zeroes").starterPy).toContain("def move_zeroes(nums: List[int]) -> None:");
  });

  it("follows starter.js for design problems", () => {
    const js = readFileSync(path.join(PROBLEMS_DIR, "kth-largest-element-in-a-stream", "starter.js"), "utf8");
    const cls = parseJsClass(js)!;
    expect(cls.className).toBe("KthLargest");
    expect(cls.methods.map((m) => m.name)).toEqual(["constructor", "add"]);
    expect(cls.methods[0].params).toEqual([
      { name: "k", type: "number", doc: undefined },
      { name: "nums", type: "number[]", doc: "the values seen before the first add" },
    ]);
    const kth = get("kth-largest-element-in-a-stream").starterPy;
    expect(kth).toContain("import heapq");
    expect(kth).toContain("class KthLargest:\n    def __init__(self, k: int, nums: List[int]) -> None:");
    expect(kth).toContain("    def add(self, val: int) -> int:");
    const minStack = get("min-stack").starterPy;
    for (const m of ["def push(self, val: int) -> None:", "def pop(self) -> None:", "def top(self) -> int:", "def get_min(self) -> int:"]) expect(minStack).toContain(m);
    expect(get("find-median-from-data-stream").starterPy).toContain("def find_median(self) -> float:");
  });

  it("falls back to the ops the tests call when there is no starter.js", () => {
    const meta = get("min-stack").meta as DesignProblemMeta;
    const py = generatePythonStarter(meta);
    expect(py).toContain("class MinStack:\n    def __init__(self) -> None:");
    expect(py).toContain("    def push(self, value):");
    expect(py).toContain("    def get_min(self):");
  });

  it("every problem has a Python starter that defines the right name", () => {
    for (const p of problems) {
      const target = pythonTarget(p.meta);
      const re = p.meta.kind === "design" ? new RegExp(`^class ${target}:`, "m") : new RegExp(`^def ${target}\\(`, "m");
      expect(re.test(p.starterPy), `${p.slug}: defines ${target}`).toBe(true);
      expect(p.starterPy.endsWith("\n"), p.slug).toBe(true);
    }
  });

  it.skipIf(!hasPython)("every Python starter compiles (Python 3.9) and doesn't already pass", () => {
    const program = `${IMPORT_HARNESS}
import ast
out = {}
for item in json.load(sys.stdin):
    try:
        ast.parse(item["code"])
    except SyntaxError as e:
        out[item["slug"]] = {"syntax": "%s (line %s)" % (e.msg, e.lineno)}
        continue
    run = runner.run_problem(item["problem"], item["code"], None, None, 2000)
    out[item["slug"]] = {"compileError": run["compileError"], "results": [{"actual": r["actual"], "error": r["error"] and r["error"]["name"]} for r in run["results"]]}
print(json.dumps(out, default=repr))
`;
    const out: Record<string, { syntax?: string; compileError: unknown; results: { actual: unknown; error: string | null }[] }> = python(
      program,
      problems.map((p) => ({ slug: p.slug, code: p.starterPy, problem: { ...p.meta, slug: p.slug } })),
    );
    for (const p of problems) {
      const r = out[p.slug];
      expect(r.syntax, `${p.slug}: ${r.syntax}`).toBeUndefined();
      expect(r.compileError, `${p.slug}: ${JSON.stringify(r.compileError)}`).toBeNull();
      // The same rule as the JS starter check in dsa.test.ts: at least one test must fail.
      const validate = p.meta.validate ? new Function(`"use strict"; return (${p.meta.validate});`)() : null;
      const passes = r.results.map((x, i) => {
        const t = p.meta.tests[i];
        if (x.error !== null) return false;
        const expected = t.expected as unknown[];
        if (p.meta.kind === "design") return (x.actual as unknown[]).every((v, k) => expected[k] === null || compareValues(v, expected[k], "exact"));
        return validate ? validate(x.actual, structuredClone(t.args), structuredClone(t.expected)) === true : compareValues(x.actual, t.expected, p.meta.compare);
      });
      expect(passes.every(Boolean), `${p.slug}: the Python starter passes every test`).toBe(false);
    }
  });
});

describe("runnable Python snippets", () => {
  const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : []);
  const blocks = walk(path.join(root, "content")).flatMap((mdx) =>
    mdx.endsWith(".mdx")
      ? [...readFileSync(mdx, "utf8").matchAll(/<RunCode\b[^>]*>/g)].flatMap((tag) => {
          const py = /\spython=["']([^"']+)["']/.exec(tag[0])?.[1];
          const java = /\sjava=["']([^"']+)["']/.exec(tag[0])?.[1];
          return py || java ? [{ mdx, py: py && path.join(path.dirname(mdx), py), java: java && path.join(path.dirname(mdx), java) }] : [];
        })
      : [],
  );

  it("loads the shown code, the hidden imports and the sibling modules", () => {
    for (const b of blocks.filter((x) => x.py)) {
      const r = loadRunnablePy(b.py!);
      const rel = path.relative(root, b.py!);
      expect(r.code, rel).not.toMatch(/@hide/);
      expect(r.prelude.split("\n").every((l) => !l || /#\s*@hide\s*$/.test(l)), rel).toBe(true);
      expect(Object.keys(r.modules).some((f) => f.startsWith("test_")), `${rel}: test files are not modules`).toBe(false);
      expect(Object.keys(r.modules).includes(path.basename(b.py!)), `${rel}: the snippet isn't its own module`).toBe(false);
    }
    for (const b of blocks.filter((x) => x.java)) expect(loadShownOnly(b.java!), path.relative(root, b.java!)).not.toMatch(/@hide|@display-only/);
  });

  it.skipIf(!hasPython || blocks.every((b) => !b.py))("runs like the browser runs it (prelude + shown code, siblings importable) and prints", () => {
    const items = blocks
      .filter((b) => b.py)
      .map((b) => {
        const r = loadRunnablePy(b.py!);
        const modules = Object.fromEntries(Object.entries(r.modules).map(([f, s]) => [f.replace(/\.py$/, ""), s]));
        return { file: path.relative(root, b.py!), code: r.prelude ? `${r.prelude}\n${r.code}` : r.code, modules };
      });
    const out: Record<string, { error: { name: string; message: string; traceback: string } | null; logs: unknown[] }> = python(
      `${IMPORT_HARNESS}\nprint(json.dumps({i["file"]: runner.run_script(i["code"], i["modules"], 5000) for i in json.load(sys.stdin)}, default=repr))`,
      items,
    );
    for (const i of items) {
      const r = out[i.file];
      expect(r.error, `${i.file}: ${r.error?.traceback ?? r.error?.message}`).toBeNull();
      expect(r.logs.length, `${i.file} prints nothing`).toBeGreaterThan(0);
    }
  });
});

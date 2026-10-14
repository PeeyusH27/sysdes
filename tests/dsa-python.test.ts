// The Python harness of the practice IDE (public/dsa-runner.py). In the browser it runs inside Pyodide; here the same
// file runs on CPython through scripts/dsa-lang-check.mjs, and every answer is judged by the JavaScript runner's
// own rules (compareValues, validators), as the browser does. Skipped when python3 is missing.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadProblems, runnable } from "@/lib/dsa/load";
import { snakeCase } from "@/lib/dsa/python";
import { checkPython, formatReport, loadProblem, PYTHON, revive, RUNNER_PY, runPython, runPythonScript } from "../scripts/dsa-lang-check.mjs";

const hasPython = (() => {
  try {
    return spawnSync(PYTHON, ["--version"], { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
})();

// Every test starts python3 at least once: leave room for a busy machine.
vi.setConfig({ testTimeout: 30_000 });

const FIXTURES = path.resolve(__dirname, "fixtures/python");
const fixtures = readdirSync(FIXTURES)
  .filter((f) => f.endsWith(".py"))
  .map((f) => ({ slug: f.slice(0, -3), code: readFileSync(path.join(FIXTURES, f), "utf8") }));

/** The problem exactly as the browser gets it (zod defaults applied). */
const problem = (slug: string) => {
  const p = loadProblems().find((x) => x.slug === slug);
  if (!p) throw new Error(`unknown problem ${slug}`);
  return runnable(p);
};

describe.skipIf(!hasPython)("Python harness: fixture solutions pass every test", () => {
  it("the fixtures cover every kind of problem", () => {
    const metas = fixtures.map((f) => loadProblem(f.slug));
    const io = (m: { io?: { args?: (string | null)[]; returns?: string } }) => [...(m.io?.args ?? []), m.io?.returns];
    const has = (what: string, pred: (m: ReturnType<typeof loadProblem>) => boolean) => expect(metas.some(pred), `a fixture with ${what}`).toBe(true);
    has("a design class", (m) => m.kind === "design");
    has("a design class compared as floats", (m) => m.kind === "design" && m.compare === "float");
    has("an in-place array", (m) => m.inPlace !== undefined && !io(m).includes("list"));
    has("an in-place linked list", (m) => m.inPlace !== undefined && io(m).includes("list"));
    has("a cycle list and a node result", (m) => io(m).includes("list-cycle") && io(m).includes("node-val"));
    has("ListNode[] in, ListNode out", (m) => io(m).includes("list[]") && m.io?.returns === "list");
    has("a tree in and out", (m) => m.io?.returns === "tree");
    has("a float result", (m) => m.kind !== "design" && m.compare === "float");
    has("a validator", (m) => !!m.validate);
    has("deep-unordered results", (m) => m.compare === "deep-unordered");
    has("a 2-D grid of strings", (m) => (m.types?.params ?? []).includes("string[][]"));
  });

  for (const f of fixtures) {
    it(f.slug, () => {
      const check = checkPython(problem(f.slug), f.code);
      expect(check.ok, formatReport(check)).toBe(true);
      expect(check.results).toHaveLength(check.total);
    });
  }
});

describe.skipIf(!hasPython)("Python harness: what learners see when it goes wrong", () => {
  const twoSum = problem("two-sum");

  it("a wrong answer: received vs expected, print() output kept per test", () => {
    const code = 'def two_sum(nums, target):\n    print("trying", nums)\n    return [0, 1]\n';
    const check = checkPython(twoSum, code, { indices: [0, 2] });
    const [first, third] = check.results;
    expect(first.pass).toBe(false);
    expect(first.received).toBe("[0,1]");
    expect(first.expected).toBe("[2,3]");
    expect(first.input).toBe("nums = [4,9,1,6]\ntarget = 7");
    expect(first.logs).toEqual([{ level: "log", text: "trying [4, 9, 1, 6]" }]);
    expect(third.pass).toBe(true); // [0, 1] is the answer to the third test
    expect(third.hidden).toBe(false);
  });

  it("an exception: its type, message and the learner's line, with a traceback of the learner's frames only", () => {
    const code = "def helper(nums):\n    return nums[10]\n\n\ndef two_sum(nums, target):\n    return helper(nums)\n";
    const [r] = checkPython(twoSum, code, { indices: [0] }).results;
    expect(r.error).toEqual({ name: "IndexError", message: "list index out of range", line: 2 });
    expect(r.traceback).toContain('File "solution.py", line 6, in two_sum');
    expect(r.traceback).toContain('File "solution.py", line 2, in helper');
    expect(r.traceback).not.toMatch(/dsa-runner|dsa_runner/);
  });

  it("a syntax error is a compile error with its line", () => {
    const out = runPython(twoSum, "def two_sum(nums, target):\n    x = [1, 2\n    return x\n");
    expect(out.results).toEqual([]);
    expect(out.compileError?.name).toBe("SyntaxError");
    expect(out.compileError?.line).toBeGreaterThanOrEqual(2);
  });

  it("an error at module level is a compile error too", () => {
    const out = runPython(twoSum, "import numpy_does_not_exist\n");
    expect(out.compileError).toMatchObject({ name: "ModuleNotFoundError", line: 1 });
  });

  it("a missing function names the snake_case function to define", () => {
    const out = runPython(twoSum, "def twosum(nums, target):\n    return []\n");
    expect(out.compileError).toMatchObject({ name: "NameError", message: "Define a function named two_sum.", line: null });
  });

  it("camelCase and LeetCode's class Solution are accepted too", () => {
    for (const code of [
      "def twoSum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n",
      "class Solution:\n    def two_sum(self, nums, target):\n        seen = {}\n        for i, x in enumerate(nums):\n            if target - x in seen:\n                return [seen[target - x], i]\n            seen[x] = i\n",
    ]) {
      const check = checkPython(twoSum, code);
      expect(check.ok, formatReport(check)).toBe(true);
    }
  });

  it("an infinite loop hits the per-test limit at its line, and the next test still runs", () => {
    const code = "def two_sum(nums, target):\n    while target == 7:\n        pass\n    return [1, 2]\n";
    const out = runPython(twoSum, code, { indices: [0, 1], timeLimitMs: 300 });
    expect(out.results).toHaveLength(2);
    expect(out.results[0].error).toMatchObject({ name: "TimeoutError", line: 2 });
    expect(out.results[1]).toMatchObject({ error: null, actual: [1, 2] });
  }, 20_000);

  it("print() output: module-level prints go with the first test, stderr is an error line, long output is capped", () => {
    const code = [
      "import sys",
      'print("loading")',
      "def two_sum(nums, target):",
      '    print("warn", file=sys.stderr)',
      "    for i in range(500):",
      "        print(i)",
      "    return [0, 1]",
    ].join("\n");
    const out = runPython(twoSum, code, { indices: [0, 1] });
    const [a, b] = out.results;
    expect(a.logs.slice(0, 3)).toEqual([
      { level: "log", text: "loading" },
      { level: "error", text: "warn" },
      { level: "log", text: "0" },
    ]);
    expect(a.logs).toHaveLength(201);
    expect(a.logs[200]).toEqual({ level: "warn", text: "… output truncated after 200 lines" });
    expect(b.logs[0]).toEqual({ level: "error", text: "warn" });
    expect(a.stdout.startsWith("loading\n0\n1\n")).toBe(true);
  });

  it("input() fails clearly instead of waiting", () => {
    const [r] = runPython(twoSum, "def two_sum(nums, target):\n    return input()\n", { indices: [0] }).results;
    expect(r.error).toMatchObject({ name: "EOFError", line: 2 });
    expect(r.error?.message).toContain("input() is not available");
  });

  it("a validator's verdict is the reason", () => {
    const [ok, bad] = checkPython(problem("course-schedule-ii"), "def find_order(n, pre):\n    return list(range(n))\n", { indices: [2, 1] }).results;
    expect(ok.pass).toBe(true);
    expect(bad.pass).toBe(false);
    expect(bad.reason).toBe("The prerequisites contain a cycle, so no valid order exists: return [].");
  });

  it("in place: the mutated argument is judged, so rebinding the name doesn't count", () => {
    const moveZeroes = problem("move-zeroes");
    const rebinding = "def move_zeroes(nums):\n    nums = [x for x in nums if x] + [0] * nums.count(0)\n";
    expect(checkPython(moveZeroes, rebinding).ok).toBe(false);
    const sliceAssign = "def move_zeroes(nums):\n    nums[:] = [x for x in nums if x] + [0] * nums.count(0)\n";
    expect(checkPython(moveZeroes, sliceAssign).ok).toBe(true);
  });

  it("returning a Python list where a ListNode is expected is a clear TypeError", () => {
    const code = "def reverse_list(head):\n    out = []\n    while head:\n        out.append(head.val)\n        head = head.next\n    return out[::-1]\n";
    const [r] = checkPython(problem("reverse-linked-list"), code, { indices: [0] }).results;
    expect(r.error).toEqual({ name: "TypeError", message: "return the head ListNode (or None), not a list", line: null });
  });

  it("learner-defined node classes work (nodes are recognised by shape)", () => {
    const code = [
      "class ListNode:",
      "    def __init__(self, x):",
      "        self.val = x",
      "        self.next = None",
      "def reverse_list(head):",
      "    out = None",
      "    while head:",
      "        node = ListNode(head.val)",
      "        node.next, out, head = out, node, head.next",
      "    return out",
    ].join("\n");
    const check = checkPython(problem("reverse-linked-list"), code);
    expect(check.ok, formatReport(check)).toBe(true);
  });

  it("a returned cycle is shown, not followed forever", () => {
    const code = "def reverse_list(head):\n    if head:\n        tail = head\n        while tail.next:\n            tail = tail.next\n        tail.next = head\n    return head\n";
    const [r] = checkPython(problem("reverse-linked-list"), code, { indices: [0] }).results;
    expect(r.received).toBe('[1,2,3,4,5,"…cycle"]');
  });

  it("tuples, sets and non-finite floats come back as JSON the judge understands", () => {
    const out = runPython(twoSum, "def two_sum(nums, target):\n    return (0, 1) if target == 7 else {float('inf'), 1}\n", { indices: [0, 1] });
    expect(out.results[0].actual).toEqual([0, 1]);
    expect(out.results[1].actual).toEqual([1, Infinity]);
    expect(JSON.parse('{"$num":"-Infinity"}', revive)).toBe(-Infinity);
  });

  it("design problems: per-call reasons, a clear message for a missing method, errors with lines", () => {
    const minStack = problem("min-stack");
    const wrongMin = "class MinStack:\n    def __init__(self):\n        self.s = []\n    def push(self, v):\n        self.s.append(v)\n    def pop(self):\n        self.s.pop()\n    def top(self):\n        return self.s[-1]\n    def get_min(self):\n        return self.s[0]\n";
    const [r] = checkPython(minStack, wrongMin, { indices: [0] }).results;
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/^Call \d+, getMin\(\): expected -?\d+, got -?\d+\.$/);

    const noMin = "class MinStack:\n    def __init__(self):\n        self.s = []\n    def push(self, v):\n        self.s.append(v)\n";
    const [m] = checkPython(minStack, noMin, { indices: [0] }).results;
    expect(m.error).toMatchObject({ name: "AttributeError", message: "MinStack has no method get_min (for the getMin call)" });

    const out = runPython(minStack, "class Nope:\n    pass\n");
    expect(out.compileError).toMatchObject({ name: "NameError", message: "Define a class named MinStack." });
  });
});

describe.skipIf(!hasPython)("Python harness: snippets (run_script)", () => {
  it("captures output and reports the script's line", () => {
    const run = runPythonScript('print("a", [1, 2])\nhead = ListNode(1, ListNode(2))\nprint(head)\nprint(TreeNode(1, None, TreeNode(3)))\nx = 1 / 0\n');
    expect(run.logs.map((l) => l.text)).toEqual(["a [1, 2]", "ListNode(1 -> 2)", "TreeNode([1, None, 3])"]);
    expect(run.error).toMatchObject({ name: "ZeroDivisionError", line: 5 });
    expect(run.error?.traceback).toContain('File "main.py", line 5, in <module>');
  });

  it("imports sibling modules given as source, fresh on every run", () => {
    const modules = { frequency: "from collections import Counter\n\ndef count_all(s):\n    return dict(Counter(s))\n" };
    const run = runPythonScript("from frequency import count_all  # @hide\nprint(count_all('aab'))\n", modules);
    expect(run.error).toBeNull();
    expect(run.logs).toEqual([{ level: "log", text: "{'a': 2, 'b': 1}" }]);
    const broken = runPythonScript("from frequency import count_all\ncount_all(5)\n", modules);
    expect(broken.error).toMatchObject({ name: "TypeError", line: 2 });
    expect(broken.error?.traceback).toContain('File "frequency.py", line 4, in count_all');
  });

  it("a snippet runs as __main__", () => {
    const run = runPythonScript('if __name__ == "__main__":\n    print("main")\n');
    expect(run.logs).toEqual([{ level: "log", text: "main" }]);
  });
});

describe.skipIf(!hasPython)("Python harness: works with the rest of the IDE", () => {
  it("loads like Pyodide loads it (imported as dsa_runner, JSON in and out, results streamed)", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "dsa-runner-py-"));
    try {
      copyFileSync(RUNNER_PY, path.join(dir, "dsa_runner.py"));
      const script = [
        "import json, sys",
        "sys.path.insert(0, sys.argv[1])",
        "import dsa_runner",
        "streamed = []",
        "problem = sys.stdin.read()",
        "out = dsa_runner.run_problem_json(problem, 'def max_profit(prices):\\n    return 0\\n', '[0, 1]', streamed.append)",
        "print(json.dumps({'out': json.loads(out), 'streamed': [json.loads(s) for s in streamed]}))",
      ].join("\n");
      const run = spawnSync(PYTHON, ["-I", "-B", "-c", script, dir], { input: JSON.stringify(problem("best-time-to-buy-and-sell-stock")), encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      const { out, streamed } = JSON.parse(run.stdout);
      expect(out.compileError).toBeNull();
      expect(out.results.map((r: { index: number }) => r.index)).toEqual([0, 1]);
      expect(streamed).toEqual(out.results);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs in one long-lived interpreter don't leak into each other (fresh namespace and node classes)", () => {
    const script = [
      "import json, runpy, sys",
      "r = runpy.run_path(sys.argv[1])",
      "problem = json.loads(sys.stdin.read())",
      "first = 'ListNode.__lt__ = lambda a, b: a.val < b.val\\nListNode.marker = 1\\nstate = [1]\\ndef reverse_list(head):\\n    return head\\n'",
      "second = 'def reverse_list(head):\\n    print(hasattr(ListNode, \"marker\"), \"state\" in globals(), isinstance(head, ListNode))\\n    return head\\n'",
      "r['run_problem'](problem, first, [0])",
      "print(r['run_problem'](problem, second, [0])['results'][0]['logs'][0]['text'])",
      "print(hasattr(r['ListNode'], 'marker'))",
    ].join("\n");
    const run = spawnSync(PYTHON, ["-I", "-B", "-c", script, RUNNER_PY], { input: JSON.stringify(problem("reverse-linked-list")), encoding: "utf8" });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout.trim().split("\n")).toEqual(["False False True", "False"]);
  });

  it("snake_case names match src/lib/dsa/python.ts (the generated starters)", () => {
    const names = new Set<string>();
    for (const p of loadProblems()) {
      if (p.meta.kind === "design") p.meta.tests.forEach((t) => t.ops.slice(1).forEach((op) => names.add(op)));
      else names.add(p.meta.fn);
    }
    const list = [...names, "evalRPN", "solveNQueens", "getHTTPResponse", "word1"];
    const run = spawnSync(PYTHON, ["-I", "-B", "-c", "import json, sys, runpy\nns = runpy.run_path(sys.argv[1])\nprint(json.dumps([ns['snake_case'](n) for n in json.loads(sys.stdin.read())]))", RUNNER_PY], {
      input: JSON.stringify(list),
      encoding: "utf8",
    });
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual(list.map(snakeCase));
  });

  it("every problem's generated Python starter loads and runs without errors", () => {
    const bad: string[] = [];
    for (const p of loadProblems()) {
      const out = runPython(runnable(p), p.starterPy, { indices: [0] });
      const err = out.compileError ?? out.results[0]?.error;
      if (err) bad.push(`${p.slug}: ${err.name}: ${err.message}${err.line ? ` (line ${err.line})` : ""}`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  }, 120_000);
});

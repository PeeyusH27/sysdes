// Java and Python versions of the trie, heaps, graph traversal, topological sort and union-find snippets.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

// JAVA_HOME wins; otherwise whatever is on PATH. macOS ships /usr/bin/java stubs that exit 1
// when no JDK is installed, so probe by running them, not by checking the file exists.
const bin = (tool: string) => (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", tool) : tool);
const runs = (cmd: string, args: string[]) => {
  try {
    return spawnSync(cmd, args, { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
};
const hasJava = runs(bin("javac"), ["-version"]) && runs(bin("java"), ["-version"]);
const hasPython = runs("python3", ["--version"]);

const PATTERNS = [
  { dir: "12-trie", javaMains: ["TrieTest"] },
  { dir: "13-heaps", javaMains: ["HeapsTest"] },
  { dir: "14-graph-traversal", javaMains: ["GraphTraversalTest"] },
  { dir: "15-topological-sort", javaMains: ["TopologicalSortTest"] },
  { dir: "16-union-find", javaMains: ["UnionFindTest"] },
];

/** How many tests the JavaScript suite has: the other languages must cover at least as many. */
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^test\(/gm)?.length ?? 0), 0);

/** The snippet files a page shows, per language, from its CodeTabs / RunCode props. */
const referenced = (dir: string) => {
  const mdx = readFileSync(path.join(root, "content/dsa/patterns", dir, "page.mdx"), "utf8");
  const js = [...mdx.matchAll(/<CodeTabs files=\{\['([^']+)'\]\}([^\n]*)/g)];
  const run = /<RunCode src="([^"]+)"([^\n]*)/.exec(mdx);
  return { tabs: js.map((m) => ({ js: m[1], rest: m[2] })), run: run ? { js: run[1], rest: run[2] } : null };
};

describe.each(PATTERNS)("$dir in Java and Python", ({ dir, javaMains }) => {
  const patternDir = path.join(root, "content/dsa/patterns", dir);
  const snippets = path.join(patternDir, "snippets");

  it("every CodeTabs and the RunCode name a Java and a Python file that exists", () => {
    const { tabs, run } = referenced(dir);
    expect(tabs.length).toBeGreaterThan(0);
    for (const t of [...tabs, ...(run ? [run] : [])]) {
      const java = /java=\{?\[?['"]([^'"]+)['"]/.exec(t.rest)?.[1];
      const python = /python=\{?\[?['"]([^'"]+)['"]/.exec(t.rest)?.[1];
      expect(java, `${t.js} java`).toBeTruthy();
      expect(python, `${t.js} python`).toBeTruthy();
      expect(existsSync(path.join(patternDir, java!)), java).toBe(true);
      expect(existsSync(path.join(patternDir, python!)), python).toBe(true);
    }
  });

  it.skipIf(!hasJava)("Java compiles (javac -Xlint) and its tests pass", () => {
    const javaDir = path.join(snippets, "java");
    const out = mkdtempSync(path.join(os.tmpdir(), `pat-${dir}-`));
    try {
      const sources = readdirSync(javaDir).filter((f) => f.endsWith(".java")).map((f) => path.join(javaDir, f));
      // auxiliaryclass: the snippets deliberately keep small package-private types together in one file.
      const compile = spawnSync(bin("javac"), ["-encoding", "UTF-8", "-Xlint:all,-auxiliaryclass", "-Werror", "-d", out, ...sources], { encoding: "utf8" });
      expect(compile.status, compile.stderr).toBe(0);
      let passes = 0;
      for (const main of javaMains) {
        const run = spawnSync(bin("java"), ["-cp", out, main], { encoding: "utf8", timeout: 60_000 });
        expect(run.status, run.stdout + run.stderr).toBe(0);
        expect(run.stdout).toContain("All tests passed.");
        passes += run.stdout.match(/^PASS /gm)?.length ?? 0;
      }
      expect(passes).toBeGreaterThanOrEqual(jsTestCount(snippets));
      const tryIt = spawnSync(bin("java"), ["-cp", out, "TryIt"], { encoding: "utf8", timeout: 60_000 });
      expect(tryIt.status, tryIt.stderr).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);

  it.skipIf(!hasPython)("Python unittest passes and try_it.py runs", () => {
    const pyDir = path.join(snippets, "python");
    const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
    // -B: no __pycache__ in the content folder.
    const run = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", pyDir, "-p", "test_*.py"], { encoding: "utf8", timeout: 60_000, env });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const ran = Number(/Ran (\d+) tests?/.exec(run.stderr)?.[1] ?? 0);
    expect(ran).toBeGreaterThanOrEqual(jsTestCount(snippets));
    expect(run.stderr).toMatch(/\nOK\b/);
    const tryIt = spawnSync("python3", ["-B", path.join(pyDir, "try_it.py")], { encoding: "utf8", timeout: 60_000, env, cwd: pyDir });
    expect(tryIt.status, tryIt.stderr).toBe(0);
  }, 60_000);
});

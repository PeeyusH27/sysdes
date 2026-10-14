// Java and Python versions of the code snippets on pattern pages 07-11 (intervals, fast/slow pointers,
// linked-list reversal, tree DFS, tree BFS): compile and test them, and check the pages point at real files.
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

const PATTERNS = ["07-intervals", "08-fast-slow-pointers", "09-linked-list-reversal", "10-tree-dfs", "11-tree-bfs"];

/** How many tests the JavaScript suite has: the other languages must cover at least as many. */
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^test\(/gm)?.length ?? 0), 0);

describe.each(PATTERNS)("%s in Java and Python", (dir) => {
  const snippets = path.join(root, "content/dsa/patterns", dir, "snippets");

  it.skipIf(!hasJava)("Java compiles (javac -Xlint) and its tests pass", () => {
    const javaDir = path.join(snippets, "java");
    const out = mkdtempSync(path.join(os.tmpdir(), `pat-${dir}-`));
    try {
      const files = readdirSync(javaDir).filter((f) => f.endsWith(".java"));
      // auxiliaryclass: the snippets deliberately keep small package-private types together in one file.
      const compile = spawnSync(bin("javac"), ["-encoding", "UTF-8", "-Xlint:all,-auxiliaryclass", "-Werror", "-d", out, ...files.map((f) => path.join(javaDir, f))], { encoding: "utf8" });
      expect(compile.status, compile.stderr).toBe(0);
      let passed = 0;
      for (const main of files.filter((f) => f.endsWith("Test.java")).map((f) => f.replace(/\.java$/, ""))) {
        const run = spawnSync(bin("java"), ["-cp", out, main], { encoding: "utf8", timeout: 60_000 });
        expect(run.status, `${main}\n${run.stdout}${run.stderr}`).toBe(0);
        expect(run.stdout).toContain("All tests passed.");
        passed += run.stdout.match(/^PASS /gm)?.length ?? 0;
      }
      expect(passed).toBeGreaterThanOrEqual(jsTestCount(snippets));
      // The try-it example runs too.
      const tryIt = spawnSync(bin("java"), ["-cp", out, "TryIt"], { encoding: "utf8", timeout: 60_000 });
      expect(tryIt.status, tryIt.stderr).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);

  it.skipIf(!hasPython)("Python unittest passes and try_it.py runs", () => {
    const pyDir = path.join(snippets, "python");
    const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
    // -B: no __pycache__ in the content folder.
    const run = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", pyDir, "-p", "test_*.py"], { encoding: "utf8", timeout: 60_000, env });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const ran = Number(/Ran (\d+) tests?/.exec(run.stderr)?.[1] ?? 0);
    expect(ran).toBeGreaterThanOrEqual(jsTestCount(snippets));
    expect(run.stderr).toMatch(/\nOK\b/);
    const tryIt = spawnSync("python3", ["-B", "try_it.py"], { cwd: pyDir, encoding: "utf8", timeout: 60_000, env });
    expect(tryIt.status, tryIt.stderr).toBe(0);
  }, 120_000);

  it("the page offers a Java and Python file for every JavaScript snippet it shows", () => {
    const mdx = readFileSync(path.join(root, "content/dsa/patterns", dir, "page.mdx"), "utf8");
    const list = (tag: string, prop: string) => [...mdx.matchAll(new RegExp(`<${tag}[^>]*?\\b${prop}=\\{\\[([^\\]]*)\\]\\}`, "g"))].map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    const tabs = [...mdx.matchAll(/<CodeTabs\s+files=\{\[([^\]]*)\]\}/g)].map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    const java = list("CodeTabs", "java");
    const python = list("CodeTabs", "python");
    expect(tabs.length).toBeGreaterThan(0);
    expect(java.map((l) => l.length)).toEqual(tabs.map((l) => l.length));
    expect(python.map((l) => l.length)).toEqual(tabs.map((l) => l.length));
    for (const file of [...java.flat(), ...python.flat()]) expect(existsSync(path.join(root, "content/dsa/patterns", dir, file)), file).toBe(true);
    const run = /<RunCode[^>]*\bsrc="snippets\/try-it\.js"[^>]*\/>/.exec(mdx)?.[0] ?? "";
    expect(run).toContain('python="snippets/python/try_it.py"');
    expect(run).toContain('java="snippets/java/TryIt.java"');
  });
});

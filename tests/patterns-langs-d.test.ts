// Java and Python versions of the DSA pattern snippets for shortest paths, backtracking, greedy, DP and bit manipulation.
// Python needs python3; Java is checked only when a JDK is available (JAVA_HOME or on PATH), otherwise it skips.
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
  "17-shortest-paths",
  "18-backtracking",
  "19-greedy",
  "20-dp-1d",
  "21-dp-2d",
  "22-bit-manipulation",
];

/** How many tests the JavaScript suite has: the other languages must cover at least as many. */
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^test\(/gm)?.length ?? 0), 0);

/** A snippet file the page shows: the JS name -> the file the other languages must have. */
const pascal = (kebab: string) => kebab.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const jsSnippets = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
    .map((f) => f.replace(/\.js$/, ""));

describe.each(PATTERNS)("%s in Java and Python", (pattern) => {
  const snippets = path.join(root, "content/dsa/patterns", pattern, "snippets");

  it("has a Java and a Python file, and a test, for every JavaScript snippet", () => {
    for (const name of jsSnippets(snippets)) {
      const py = name.replace(/-/g, "_");
      expect(existsSync(path.join(snippets, "python", `${py}.py`)), `python/${py}.py`).toBe(true);
      expect(existsSync(path.join(snippets, "java", `${pascal(name)}.java`)), `java/${pascal(name)}.java`).toBe(true);
      if (name !== "try-it") {
        expect(existsSync(path.join(snippets, "python", `test_${py}.py`)), `python/test_${py}.py`).toBe(true);
        expect(existsSync(path.join(snippets, "java", `${pascal(name)}Test.java`)), `java/${pascal(name)}Test.java`).toBe(true);
      }
    }
  });

  it.skipIf(!hasJava)("Java compiles (javac -Xlint) and its tests pass", () => {
    const javaDir = path.join(snippets, "java");
    const out = mkdtempSync(path.join(os.tmpdir(), `pat-${pattern}-`));
    try {
      const files = readdirSync(javaDir).filter((f) => f.endsWith(".java"));
      // auxiliaryclass: a snippet may keep small package-private types beside its main class.
      const compile = spawnSync(
        bin("javac"),
        ["-encoding", "UTF-8", "-Xlint:all,-auxiliaryclass", "-Werror", "-d", out, ...files.map((f) => path.join(javaDir, f))],
        { encoding: "utf8" },
      );
      expect(compile.status, compile.stderr).toBe(0);
      let passed = 0;
      for (const main of files.filter((f) => f.endsWith("Test.java")).map((f) => f.replace(/\.java$/, ""))) {
        const run = spawnSync(bin("java"), ["-cp", out, main], { encoding: "utf8", timeout: 60_000 });
        expect(run.status, `${main}\n${run.stdout}${run.stderr}`).toBe(0);
        expect(run.stdout).toContain("All tests passed.");
        passed += run.stdout.match(/^PASS /gm)?.length ?? 0;
      }
      expect(passed).toBeGreaterThanOrEqual(jsTestCount(snippets));
      // the runnable demo compiles and runs without throwing
      const demo = spawnSync(bin("java"), ["-cp", out, "TryIt"], { encoding: "utf8", timeout: 60_000 });
      expect(demo.status, demo.stdout + demo.stderr).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);

  it.skipIf(!hasPython)("Python unittest passes and the demo runs", () => {
    const pyDir = path.join(snippets, "python");
    const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONPATH: pyDir };
    // -B: no __pycache__ in the content folder.
    const run = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", pyDir, "-p", "test_*.py"], {
      encoding: "utf8",
      timeout: 60_000,
      env,
    });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const ran = Number(/Ran (\d+) tests?/.exec(run.stderr)?.[1] ?? 0);
    expect(ran).toBeGreaterThanOrEqual(jsTestCount(snippets));
    expect(run.stderr).toMatch(/\nOK\b/);
    const demo = spawnSync("python3", ["-B", path.join(pyDir, "try_it.py")], { encoding: "utf8", timeout: 60_000, env });
    expect(demo.status, demo.stdout + demo.stderr).toBe(0);
  }, 120_000);
});

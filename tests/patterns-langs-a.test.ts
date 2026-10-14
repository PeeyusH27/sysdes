// Java and Python versions of the DSA pattern snippets for hashing, two pointers, sliding window,
// prefix sum, binary search and stack: each must pass the same tests as its JavaScript original.
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

const PATTERNS = ["01-hashing", "02-two-pointers", "03-sliding-window", "04-prefix-sum", "05-binary-search", "06-stack"];

/** How many tests the JavaScript suite has: the other languages must cover at least as many. */
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^test\(/gm)?.length ?? 0), 0);

const pascal = (kebab: string) => kebab.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const snake = (kebab: string) => kebab.replace(/-/g, "_");

describe.each(PATTERNS)("%s in Java and Python", (pattern) => {
  const snippets = path.join(root, "content/dsa/patterns", pattern, "snippets");
  const jsSnippets = readdirSync(snippets).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js") && f !== "try-it.js");

  it("every JavaScript snippet has a Java and a Python twin, and the page lists them", () => {
    const mdx = readFileSync(path.join(root, "content/dsa/patterns", pattern, "page.mdx"), "utf8");
    for (const f of jsSnippets) {
      const name = f.replace(/\.js$/, "");
      const java = `snippets/java/${pascal(name)}.java`;
      const py = `snippets/python/${snake(name)}.py`;
      expect(existsSync(path.join(snippets, "java", `${pascal(name)}.java`)), java).toBe(true);
      expect(existsSync(path.join(snippets, "python", `${snake(name)}.py`)), py).toBe(true);
      expect(mdx, java).toContain(`'${java}'`);
      expect(mdx, py).toContain(`'${py}'`);
    }
    expect(mdx).toContain('python="snippets/python/try_it.py"');
    expect(mdx).toContain('java="snippets/java/TryIt.java"');
  });

  it.skipIf(!hasJava)("Java compiles (javac -Xlint) and its tests pass", () => {
    const javaDir = path.join(snippets, "java");
    const out = mkdtempSync(path.join(os.tmpdir(), `pat-${pattern}-`));
    try {
      const files = readdirSync(javaDir).filter((f) => f.endsWith(".java"));
      const compile = spawnSync(bin("javac"), ["-encoding", "UTF-8", "-Xlint:all", "-Werror", "-d", out, ...files.map((f) => path.join(javaDir, f))], { encoding: "utf8" });
      expect(compile.status, compile.stderr).toBe(0);
      let passes = 0;
      for (const f of files.filter((f) => f.endsWith("Test.java"))) {
        const run = spawnSync(bin("java"), ["-cp", out, f.replace(/\.java$/, "")], { encoding: "utf8", timeout: 60_000 });
        expect(run.status, f + "\n" + run.stdout + run.stderr).toBe(0);
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

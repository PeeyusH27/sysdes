// The LLD foundation lessons: every JavaScript snippet has a Python twin, the page shows both, and the Python tests
// (unittest) pass and cover at least as much as the JavaScript ones. Skipped without python3. Java is not required here.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lldLessons } from "@content/lld/registry";

const root = path.resolve(__dirname, "../content/lld/foundations");
const hasPython = (() => {
  try {
    return spawnSync("python3", ["--version"], { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
})();

const snake = (kebab: string) => kebab.replace(/-/g, "_");
const jsTestCount = (snippets: string) =>
  readdirSync(snippets)
    .filter((f) => f.endsWith(".test.js"))
    .reduce((n, f) => n + (readFileSync(path.join(snippets, f), "utf8").match(/^\s*(test|it)\(/gm)?.length ?? 0), 0);

describe.each(lldLessons)("$slug lesson snippets", ({ dir }) => {
  const snippets = path.join(root, dir, "snippets");
  const jsSnippets = existsSync(snippets) ? readdirSync(snippets).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js")) : [];

  it("has runnable snippets with tests", () => {
    expect(jsSnippets.length, "at least one JavaScript snippet").toBeGreaterThan(0);
    expect(jsTestCount(snippets), "JavaScript tests").toBeGreaterThan(0);
  });

  it("every JavaScript snippet has a Python twin and the page lists both", () => {
    const mdx = readFileSync(path.join(root, dir, "page.mdx"), "utf8");
    for (const f of jsSnippets) {
      const name = f.replace(/\.js$/, "");
      const py = `snippets/python/${snake(name)}.py`;
      expect(existsSync(path.join(root, dir, py)), py).toBe(true);
      expect(mdx, `snippets/${f}`).toContain(`snippets/${f}`);
      expect(mdx, py).toContain(py);
    }
  });

  it.skipIf(!hasPython)("Python unittest passes", () => {
    const run = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", path.join(snippets, "python"), "-p", "test_*.py"], {
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const ran = Number(/Ran (\d+) tests?/.exec(run.stderr)?.[1] ?? 0);
    expect(ran).toBeGreaterThanOrEqual(jsTestCount(snippets));
    expect(run.stderr).toMatch(/\nOK\b/);
  }, 60_000);
});

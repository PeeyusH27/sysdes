import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getLldLesson, lldLessons } from "@content/lld/registry";
import { EXERCISES_DIR, loadExercises, problemSlugs } from "@/lib/dsa/load";
import { ProblemMeta } from "@/lib/dsa/schema";
import { runnable } from "@/lib/dsa/load";
import { checkPython, formatReport, PYTHON } from "../scripts/dsa-lang-check.mjs";

const hasPython = (() => {
  try {
    return spawnSync(PYTHON, ["--version"], { encoding: "utf8", timeout: 20_000 }).status === 0;
  } catch {
    return false;
  }
})();
vi.setConfig({ testTimeout: 30_000 });

// The exact runner learners use in the browser (public/dsa-runner.js), evaluated in Node.
new Function(readFileSync(path.resolve(__dirname, "../public/dsa-runner.js"), "utf8"))();
type Harness = {
  runTests: (code: string, problem: unknown) => { compileError: { message: string } | null; results: { index: number; pass: boolean; received: string; expected: string; error: { message: string } | null; reason: string | null; ms: number }[] };
};
const H = (globalThis as unknown as { __dsaHarness: Harness }).__dsaHarness;

const root = path.resolve(__dirname, "../content/lld");

describe("lld registry", () => {
  it("has unique slugs and dirs, in order", () => {
    expect(new Set(lldLessons.map((l) => l.slug)).size).toBe(lldLessons.length);
    expect(new Set(lldLessons.map((l) => l.dir)).size).toBe(lldLessons.length);
    lldLessons.forEach((l, i) => expect(l.order, l.slug).toBe(i + 1));
  });
  for (const l of lldLessons) {
    it(`foundation ${l.slug}: folder with page, quiz and snippets`, () => {
      for (const f of ["page.mdx", "quiz.ts"]) expect(existsSync(path.join(root, "foundations", l.dir, f)), `${l.dir}/${f}`).toBe(true);
    });
  }
});

describe("lld exercises", () => {
  const exercises = loadExercises();
  it("every folder has a valid problem.json", () => {
    for (const slug of problemSlugs(EXERCISES_DIR)) {
      const parsed = ProblemMeta.safeParse(JSON.parse(readFileSync(path.join(EXERCISES_DIR, slug, "problem.json"), "utf8")));
      expect(parsed.success, `${slug}: ${parsed.success ? "" : parsed.error.message}`).toBe(true);
    }
  });
  it("has at least one exercise for every foundation that promises one", () => {
    expect(exercises.length).toBeGreaterThanOrEqual(6);
  });
  it("has unique orders", () => {
    expect(new Set(exercises.map((e) => e.meta.order)).size).toBe(exercises.length);
  });
  for (const p of exercises) {
    describe(p.slug, () => {
      it("is a design problem tied to real lessons", () => {
        expect(p.meta.kind).toBe("design");
        for (const s of p.meta.patterns) expect(getLldLesson(s), `unknown lesson ${s}`).toBeTruthy();
      });
      it("has a statement, a step-by-step approach and a reference solution", () => {
        expect(p.statement.trim().length, "statement.md").toBeGreaterThan(120);
        expect(p.approach.trim().length, "solution.md").toBeGreaterThan(300);
        expect(p.solution.trim().length, "solution.js").toBeGreaterThan(50);
        for (const [name, md] of [["statement.md", p.statement], ["solution.md", p.approach]] as const) {
          expect(/^# /m.test(md.replace(/```[\s\S]*?```/g, "")), `${name} must not use a # heading`).toBe(false);
        }
        expect(/^\s*1\.\s/m.test(p.approach), "solution.md needs a numbered step list").toBe(true);
        expect(p.meta.samples).toBeLessThanOrEqual(p.meta.tests.length);
        expect(p.meta.tests.length, "at least 8 tests").toBeGreaterThanOrEqual(8);
      });
      it("reference solution passes every test", () => {
        const out = H.runTests(p.solution, p.meta);
        expect(out.compileError, out.compileError?.message).toBeNull();
        const bad = out.results.filter((r) => !r.pass).map((r) => `#${r.index + 1}: expected ${r.expected}, got ${r.received}${r.error ? ` (${r.error.message})` : ""}${r.reason ? ` (${r.reason})` : ""}`);
        expect(bad, bad.join("\n")).toEqual([]);
      });
      it("starter code compiles and does not already pass", () => {
        const out = H.runTests(p.starter, p.meta);
        expect(out.compileError, out.compileError?.message).toBeNull();
        expect(out.results.every((r) => r.pass), "the starter passes every test, so the tests check nothing").toBe(false);
      });
    });
  }

  // Python is a first-class language of the editor, so every exercise ships a Python reference that passes the same tests.
  describe.skipIf(!hasPython)("python references", () => {
    for (const p of exercises) {
      it(`${p.slug}: solution.py passes every test`, () => {
        const file = path.join(EXERCISES_DIR, p.slug, "solution.py");
        expect(existsSync(file), "solution.py").toBe(true);
        const check = checkPython(runnable(p), readFileSync(file, "utf8"));
        expect(check.ok, formatReport(check)).toBe(true);
      });
    }
  });
});

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { jsTopics, patterns } from "@content/dsa/registry";
import { loadProblems, PROBLEMS_DIR, problemSlugs } from "@/lib/dsa/load";
import { ProblemMeta } from "@/lib/dsa/schema";
import { TONES, type TraceSpec, type View } from "@/components/algo/types";
import { loadRunnable } from "@/lib/dsa/snippet";

// The exact runner learners use in the browser (public/dsa-runner.js), evaluated in Node.
new Function(readFileSync(path.resolve(__dirname, "../public/dsa-runner.js"), "utf8"))();
type Harness = {
  runTests: (code: string, problem: unknown) => { compileError: { message: string } | null; results: { index: number; pass: boolean; received: string; expected: string; error: { message: string } | null; reason: string | null; ms: number }[] };
  runScript: (code: string, maxWaitMs?: number) => Promise<{ error: { name: string; message: string; line: number | null } | null; logs: { text: string }[] }>;
};
const H = (globalThis as unknown as { __dsaHarness: Harness }).__dsaHarness;

const root = path.resolve(__dirname, "../content/dsa");
const vizModules = import.meta.glob("../content/dsa/patterns/*/viz.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const quizModules = import.meta.glob("../content/dsa/patterns/*/quiz.ts", { eager: true }) as Record<string, Record<string, unknown>>;

describe("dsa registry", () => {
  it("has unique slugs, dirs and topic ids", () => {
    expect(new Set(patterns.map((p) => p.slug)).size).toBe(patterns.length);
    expect(new Set(patterns.map((p) => p.dir)).size).toBe(patterns.length);
    expect(new Set(jsTopics.map((t) => t.id)).size).toBe(jsTopics.length);
    patterns.forEach((p, i) => expect(p.order, p.slug).toBe(i + 1));
  });
  for (const p of patterns) {
    it(`pattern ${p.slug}: folder, js refs`, () => {
      for (const f of ["page.mdx", "viz.ts", "quiz.ts"]) expect(existsSync(path.join(root, "patterns", p.dir, f)), `${p.dir}/${f}`).toBe(true);
      for (const id of p.js) expect(jsTopics.some((t) => t.id === id), `unknown js topic ${id}`).toBe(true);
    });
  }
  for (const t of jsTopics) {
    it(`js topic ${t.id}: file exists`, () => expect(existsSync(path.join(root, "js", `${t.file}.mdx`))).toBe(true));
  }
});

describe("dsa problems", () => {
  const problems = loadProblems();
  it("every folder has a valid problem.json", () => {
    for (const slug of problemSlugs()) {
      const parsed = ProblemMeta.safeParse(JSON.parse(readFileSync(path.join(PROBLEMS_DIR, slug, "problem.json"), "utf8")));
      expect(parsed.success, `${slug}: ${parsed.success ? "" : parsed.error.message}`).toBe(true);
    }
  });
  for (const p of patterns) {
    it(`pattern ${p.slug}: has at least 4 primary problems`, () => {
      expect(problems.filter((x) => x.meta.patterns[0] === p.slug).length).toBeGreaterThanOrEqual(4);
    });
  }
  for (const p of problems) {
    describe(`${p.meta.patterns[0]} › ${p.slug}`, () => {
      it("references real patterns and cheat sheet topics", () => {
        for (const s of p.meta.patterns) expect(patterns.some((x) => x.slug === s), `unknown pattern ${s}`).toBe(true);
        for (const id of p.meta.js) expect(jsTopics.some((t) => t.id === id), `unknown js topic ${id}`).toBe(true);
      });
      it("has a statement, a step-by-step approach and a reference solution", () => {
        expect(p.statement.trim().length, "statement.md").toBeGreaterThan(80);
        expect(p.approach.trim().length, "solution.md").toBeGreaterThan(200);
        expect(p.solution.trim().length, "solution.js").toBeGreaterThan(20);
        for (const [name, md] of [["statement.md", p.statement], ["solution.md", p.approach]] as const) {
          expect(/^# /m.test(md.replace(/```[\s\S]*?```/g, "")), `${name} must not use a # heading (the page has the h1)`).toBe(false);
        }
        expect(/^\s*1\.\s/m.test(p.approach), "solution.md needs a numbered step list").toBe(true);
        expect(p.meta.samples, "samples ≤ tests").toBeLessThanOrEqual(p.meta.tests.length);
        expect(p.meta.tests.length, "at least 6 tests").toBeGreaterThanOrEqual(6);
        if (p.meta.kind === "function") expect(p.meta.types.params.length, "one type per param").toBe(p.meta.params.length);
      });
      it("reference solution passes every test", () => {
        const out = H.runTests(p.solution, p.meta);
        expect(out.compileError, out.compileError?.message).toBeNull();
        const bad = out.results.filter((r) => !r.pass).map((r) => `#${r.index + 1}: expected ${r.expected}, got ${r.received}${r.error ? ` (${r.error.message})` : ""}${r.reason ? ` (${r.reason})` : ""}`);
        expect(bad, bad.join("\n")).toEqual([]);
        // Leave plenty of headroom under the browser's per-test limit for slower machines.
        const limit = (p.meta.timeoutMs ?? 3000) / 4;
        const slow = out.results.filter((r) => r.ms > limit).map((r) => `#${r.index + 1}: ${r.ms} ms`);
        expect(slow, `reference solution is too slow (limit ${limit} ms per test): ${slow.join(", ")}`).toEqual([]);
      });
      it("starter code compiles and does not already pass", () => {
        const out = H.runTests(p.starter, p.meta);
        expect(out.compileError, out.compileError?.message).toBeNull();
        expect(out.results.every((r) => r.pass), "the starter passes every test, so the tests check nothing").toBe(false);
      });
    });
  }
});

function checkView(v: View, where: string) {
  const tone = (t: unknown) => expect(TONES, `${where}: tone ${String(t)}`).toContain(t);
  switch (v.kind) {
    case "array":
      for (const [name, i] of Object.entries(v.pointers ?? {})) if (i !== null) expect(i >= -1 && i <= v.values.length, `${where}: pointer ${name}=${i} out of range`).toBe(true);
      if (v.window) expect(v.window[0] >= 0 && v.window[1] < v.values.length + 1, `${where}: window out of range`).toBe(true);
      for (const [i, t] of Object.entries(v.tones ?? {})) {
        expect(Number(i) >= 0 && Number(i) < v.values.length, `${where}: tone index ${i}`).toBe(true);
        tone(t);
      }
      break;
    case "grid":
      for (const [k, t] of Object.entries(v.tones ?? {})) {
        const [r, c] = k.split(",").map(Number);
        expect(r >= 0 && r < v.cells.length && c >= 0 && c < (v.cells[r]?.length ?? 0), `${where}: grid tone ${k}`).toBe(true);
        tone(t);
      }
      break;
    case "list": {
      const ids = new Set(v.nodes.map((n) => n.id));
      for (const to of Object.values(v.next)) if (to !== null) expect(ids.has(to), `${where}: next → ${to}`).toBe(true);
      for (const id of Object.values(v.pointers ?? {})) if (id !== null) expect(ids.has(id), `${where}: pointer → ${id}`).toBe(true);
      Object.values(v.tones ?? {}).forEach(tone);
      break;
    }
    case "tree": {
      const ids = new Set(v.nodes.map((n) => n.id));
      if (v.root !== null) expect(ids.has(v.root), `${where}: root`).toBe(true);
      for (const n of v.nodes) for (const c of [n.left, n.right]) if (c) expect(ids.has(c), `${where}: child ${c}`).toBe(true);
      Object.values(v.tones ?? {}).forEach(tone);
      break;
    }
    case "graph": {
      const ids = new Set(v.nodes.map((n) => n.id));
      expect(ids.size, `${where}: duplicate graph node ids`).toBe(v.nodes.length);
      for (const n of v.nodes) expect(n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100, `${where}: node ${n.id} outside 0..100`).toBe(true);
      for (const e of v.edges) expect(ids.has(e.from) && ids.has(e.to), `${where}: edge ${e.from}-${e.to}`).toBe(true);
      Object.values(v.tones ?? {}).forEach(tone);
      Object.values(v.edgeTones ?? {}).forEach(tone);
      break;
    }
    default:
      break;
  }
}

const isTrace = (v: unknown): v is TraceSpec => !!v && typeof v === "object" && "presets" in v && "code" in v;

describe("dsa animations", () => {
  for (const [file, mod] of Object.entries(vizModules)) {
    const traces = Object.entries(mod).filter(([, v]) => isTrace(v)) as [string, TraceSpec][];
    it(`${file.replace("../content/dsa/patterns/", "")}: exports at least two traces`, () => expect(traces.length).toBeGreaterThanOrEqual(2));
    for (const [name, spec] of traces) {
      it(`${file.replace("../content/dsa/patterns/", "")} › ${name}: frames are valid`, () => {
        const lines = spec.code.split("\n").length;
        expect(spec.presets.length).toBeGreaterThan(0);
        for (const p of spec.presets) {
          expect(p.frames.length, `${p.label}: frame count`).toBeGreaterThanOrEqual(3);
          p.frames.forEach((f, i) => {
            const where = `${name} › ${p.label} › frame ${i}`;
            expect(f.line >= 1 && f.line <= lines, `${where}: line ${f.line}`).toBe(true);
            expect(f.caption.length, `${where}: caption`).toBeGreaterThan(10);
            expect(f.views.length, `${where}: no views`).toBeGreaterThan(0);
            f.views.forEach((v) => checkView(v, where));
          });
        }
      });
    }
  }
});

describe("dsa quizzes", () => {
  for (const [file, mod] of Object.entries(quizModules)) {
    it(file.replace("../content/dsa/patterns/", ""), () => {
      const items = mod.quiz as { q: string; options: string[]; answer: number; explain?: string }[];
      expect(items.length).toBeGreaterThanOrEqual(3);
      for (const q of items) {
        expect(q.answer >= 0 && q.answer < q.options.length).toBe(true);
        expect(q.explain, `${q.q}: explain`).toBeTruthy();
      }
    });
  }
});

/** Every <RunCode src="…"> in DSA MDX must run without throwing (it is executed as a script, `export` stripped). */
describe("dsa runnable snippets", () => {
  const walk = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])) : []);
  for (const mdx of walk(root).filter((f) => f.endsWith(".mdx"))) {
    const src = readFileSync(mdx, "utf8");
    for (const m of src.matchAll(/<RunCode[^>]*\ssrc=["']([^"']+)["']/g)) {
      const file = path.join(path.dirname(mdx), m[1]);
      it(`${path.relative(root, file)} runs`, async () => {
        expect(existsSync(file), `missing ${m[1]}`).toBe(true);
        const { prelude, code } = loadRunnable(file);
        const out = await H.runScript(prelude ? `${prelude}\n${code}` : code, 500);
        expect(out.error, out.error ? `${out.error.name}: ${out.error.message} (line ${out.error.line})` : "").toBeNull();
        expect(out.logs.length, "prints nothing: add console.log so Run shows something").toBeGreaterThan(0);
      });
    }
  }
});

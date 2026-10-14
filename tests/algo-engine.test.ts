// The walkthrough engine: "Edit input" (field inference, parsing, validate/prepare hooks, custom runs, caps) and the
// lazy registry the browser uses to load each trace's `run`.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { runCustom } from "@/components/algo/custom";
import { formatInput, inferFields, parseInput, parseValue } from "@/components/algo/input";
import { TRACE_LOADERS } from "@/components/algo/registry";
import { autoLayout, defineTrace, forestLayout, layeredLayout, MAX_CUSTOM_FRAMES, note, arr, traceSource, Tracer } from "@/components/algo/trace";
import { TONES, type FieldSpec, type TraceSpec, type View } from "@/components/algo/types";

const PATTERNS = path.resolve(__dirname, "../content/dsa/patterns");
const vizModules = import.meta.glob("../content/dsa/patterns/*/viz.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const isTrace = (v: unknown): v is TraceSpec => !!v && typeof v === "object" && "presets" in v && "code" in v;
const traces = Object.entries(vizModules).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([, v]) => isTrace(v))
    .map(([name, spec]) => ({ file: file.replace("../content/dsa/patterns/", ""), name, spec: spec as TraceSpec })),
);
const byId = (id: string) => traces.find((t) => t.spec.id === id)!.spec;

function viewProblem(v: View): string | null {
  if ("tones" in v && v.tones) for (const t of Object.values(v.tones)) if (t && !TONES.includes(t)) return `tone ${t}`;
  switch (v.kind) {
    case "array":
      for (const [name, i] of Object.entries(v.pointers ?? {})) if (i !== null && !(i >= -1 && i <= v.values.length)) return `pointer ${name}=${i}`;
      if (v.window && !(v.window[0] >= 0 && v.window[1] < v.values.length + 1)) return "window out of range";
      for (const i of Object.keys(v.tones ?? {})) if (!(Number(i) >= 0 && Number(i) < v.values.length)) return `tone index ${i}`;
      return null;
    case "grid":
      for (const k of Object.keys(v.tones ?? {})) {
        const [r, c] = k.split(",").map(Number);
        if (!(r >= 0 && r < v.cells.length && c >= 0 && c < (v.cells[r]?.length ?? 0))) return `grid tone ${k}`;
      }
      return null;
    case "list": {
      const ids = new Set(v.nodes.map((n) => n.id));
      for (const to of Object.values(v.next)) if (to !== null && !ids.has(to)) return `next → ${to}`;
      for (const id of Object.values(v.pointers ?? {})) if (id !== null && !ids.has(id)) return `pointer → ${id}`;
      return null;
    }
    case "tree": {
      const ids = new Set(v.nodes.map((n) => n.id));
      if (v.root !== null && !ids.has(v.root)) return "root";
      for (const n of v.nodes) for (const c of [n.left, n.right]) if (c && !ids.has(c)) return `child ${c}`;
      return null;
    }
    case "graph": {
      const ids = new Set(v.nodes.map((n) => n.id));
      if (ids.size !== v.nodes.length) return "duplicate node ids";
      for (const n of v.nodes) if (!(n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100)) return `node ${n.id} at ${n.x},${n.y}`;
      for (const e of v.edges) if (!ids.has(e.from) || !ids.has(e.to)) return `edge ${e.from}-${e.to}`;
      return null;
    }
    default:
      return null;
  }
}

describe("trace registry", () => {
  // Scan the source too, so a trace that slips past the module glob still has to be registered.
  const declared = readdirSync(PATTERNS).flatMap((dir) => {
    const src = readFileSync(path.join(PATTERNS, dir, "viz.ts"), "utf8");
    return [...src.matchAll(/export const (\w+) = defineTrace\(\{\s*id: "([^"]+)"/g)].map((m) => ({ dir, name: m[1], id: m[2] }));
  });

  it("every trace exported from a viz.ts is in the registry, and nothing else is", () => {
    expect(declared.length).toBe(traces.length);
    const missing = traces.filter((t) => !(t.spec.id in TRACE_LOADERS)).map((t) => `${t.file} › ${t.name} (${t.spec.id})`);
    expect(missing, `add these to src/components/algo/registry.ts:\n${missing.join("\n")}`).toEqual([]);
    const stale = Object.keys(TRACE_LOADERS).filter((id) => !traces.some((t) => t.spec.id === id));
    expect(stale, "registry entries with no trace").toEqual([]);
    expect(new Set(traces.map((t) => t.spec.id)).size, "trace ids must be unique").toBe(traces.length);
  });

  it("each loader returns that very trace (with its run function)", async () => {
    for (const t of traces) {
      const loaded = await TRACE_LOADERS[t.spec.id]();
      expect(loaded, `${t.spec.id} loads ${t.file} › ${t.name}`).toBe(t.spec);
      expect(traceSource(loaded), `${t.spec.id} has a run`).toBeTruthy();
    }
  });

  it("registry paths match the folder each trace lives in", () => {
    const src = readFileSync(path.resolve(__dirname, "../src/components/algo/registry.ts"), "utf8");
    for (const d of declared) expect(src, d.id).toContain(`"${d.id}": () => import("@content/dsa/patterns/${d.dir}/viz").then((m) => m.${d.name}),`);
  });
});

describe("every trace takes reader input", () => {
  for (const { file, name, spec } of traces) {
    it(`${file} › ${name}: presets round-trip through the form, pass validate, and re-run`, () => {
      const src = traceSource(spec)!;
      expect(spec.fields?.length, "no editable fields").toBeGreaterThan(0);
      spec.presets.forEach((p, i) => {
        const input = src.def.presets[i].input as Record<string, unknown>;
        // The form text parses back to exactly the preset's values.
        const parsed = parseInput(spec.fields!, p.form!);
        for (const f of spec.fields!) expect(parsed[f.key], `${p.label} › ${f.key}`).toEqual(input[f.key]);
        expect(src.def.validate?.(input) || null, `${p.label} fails its own validate`).toBeNull();
        const res = runCustom(spec, p.form!, i);
        expect(res.ok, res.ok ? "" : res.error).toBe(true);
        if (!res.ok) return;
        expect(res.truncated).toBe(false);
        // Without prepare, the reader's copy of a preset is the preset, frame for frame.
        if (!src.def.prepare) expect(res.frames).toEqual(p.frames);
        res.frames.forEach((fr, k) => fr.views.forEach((v) => expect(viewProblem(v), `${p.label} frame ${k} ${v.kind}`).toBeNull()));
      });
    });
  }
});

describe("validate and prepare hooks", () => {
  it("prepare sorts input that must be sorted, and says why", () => {
    const res = runCustom(byId("pair-sum"), { nums: "9, 2, 7, 4, 1", target: "11" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.values.nums).toBe("1, 2, 4, 7, 9");
    expect(res.notes.join(" ")).toMatch(/Sorted nums first/);
    expect(res.frames[0].views[0]).toMatchObject({ kind: "array", values: [1, 2, 4, 7, 9] });
  });

  it("already-sorted input runs without a note", () => {
    const res = runCustom(byId("classic-binary-search"), { nums: "1, 4, 6, 9", target: "6" });
    expect(res.ok && res.notes).toEqual([]);
  });

  it("validate rejects inputs that break the algorithm's preconditions", () => {
    const cases: [string, Record<string, string>, RegExp][] = [
      ["fixed-window-sum", { nums: "1, 2", k: "3" }, /longer than nums/],
      ["dijkstra-heap", { edges: "A B 3\nB C -2", source: "A" }, /weights of 0 or more/],
      ["kahn", { n: "3", edges: "0 1\n1 5" }, /nodes are 0 to 2/],
      ["kahn", { n: "3", edges: "0 1\n0 1" }, /appears twice/],
      ["path-compression", { parent: "1, 0, 2", queries: "0" }, /loop/],
      ["inorder-stack", { values: "5, 7, 3" }, /Not a binary search tree/],
      ["tree-height", { values: "1, null, null, 4" }, /no parent/],
      ["weave-halves", { front: "1", back: "2, 3, 4" }, /front needs/],
      ["greedy-coins", { coins: "3, 5", amount: "7" }, /Include a 1 coin/],
      ["combinations-tree", { n: "6", k: "4" }, /Keep it to 22/],
      ["islands-dfs", { rows: "110\n1" }, /same width/],
    ];
    for (const [id, values, msg] of cases) {
      const res = runCustom(byId(id), { ...byId(id).presets[0].form, ...values });
      expect(res.ok, `${id} accepted ${JSON.stringify(values)}`).toBe(false);
      if (!res.ok) expect(res.error, id).toMatch(msg);
    }
  });

  it("graphs a reader types get a fresh layout inside the canvas", () => {
    const res = runCustom(byId("bfs-levels"), { n: "5", edges: "0 1\n1 2\n2 3\n3 4\n0 4", start: "2" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const g = res.frames[0].views.find((v) => v.kind === "graph")!;
    expect(g.kind === "graph" && g.nodes.length).toBe(5);
    expect(viewProblem(g)).toBeNull();
  });

  it("hidden narrative fields are rewritten for reader input", () => {
    const res = runCustom(byId("bellman-ford-rounds"), { edges: "A B 4\nB C -1\nA C 5", rounds: "2" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.frames.at(-1)!.caption).not.toMatch(/Dijkstra would have settled B at 4/);
  });
});

describe("parsing reader input", () => {
  const f = (o: Partial<FieldSpec> & Pick<FieldSpec, "kind">): FieldSpec => ({ ...inferFields([{ x: 0 }], { x: o })[0], ...o });

  it("accepts commas, spaces and brackets for lists", () => {
    expect(parseValue(f({ kind: "ints", maxItems: 12, min: -99, max: 99 }), "[1, 2,3  4]")).toEqual([1, 2, 3, 4]);
    expect(parseValue(f({ kind: "tree", maxItems: 15 }), "3, null, 4, _, 5")).toEqual([3, null, 4, null, 5]);
  });

  it("reads rows as lines, JSON, letters and empty rows", () => {
    const pairs = f({ kind: "rows", cols: ["int", "int"], maxItems: 12 });
    expect(parseValue(pairs, "1 3\n2, 6\n\n[8, 10]")).toEqual([[1, 3], [2, 6], [8, 10]]);
    expect(parseValue(pairs, "[[1,3],[2,6]]")).toEqual([[1, 3], [2, 6]]);
    expect(parseValue(f({ kind: "rows", cols: ["letter", "letter", "int"] }), "a B 4")).toEqual([[0, 1, 4]]);
    expect(parseValue(f({ kind: "rows", maxItems: 5 }), "1 2\n-\n3")).toEqual([[1, 2], [], [3]]);
  });

  it("says exactly what is wrong", () => {
    expect(() => parseValue(f({ kind: "int", min: 1, max: 9 }), "12")).toThrow(/too big/);
    expect(() => parseValue(f({ kind: "int" }), "1.5")).toThrow(/not a whole number/);
    expect(() => parseValue(f({ kind: "rows", cols: ["int", "int"], colNames: ["start", "end"] }), "1 2 3")).toThrow(/needs 2 values \(start end\)/);
    expect(() => parseValue(f({ kind: "text", chars: "a-z", maxLength: 5 }), "abC")).toThrow(/"C" isn't allowed/);
    expect(() => parseValue(f({ kind: "tree" }), "null, 1")).toThrow(/root/);
  });

  it("formats and parses back to the same value", () => {
    const fields = inferFields([{ a: [1, -2], b: "abc", c: [[1, 2]], d: true, e: [[3], []] }]);
    const input = { a: [1, -2], b: "abc", c: [[1, 2]], d: true, e: [[3], []] };
    expect(parseInput(fields, formatInput(fields, input))).toEqual(input);
  });
});

describe("caps", () => {
  it("field limits keep inputs small", () => {
    const res = runCustom(byId("seen-set"), { nums: Array.from({ length: 13 }, (_, i) => i).join(", ") });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe("nums");
      expect(res.error).toMatch(/at most 12/);
    }
    const long = runCustom(byId("frequency-budget"), { note: "a".repeat(11), magazine: "abc" });
    expect(!long.ok && long.error).toMatch(/too long/);
  });

  // A trace that never stops on its own: reader input must stop at the frame cap instead of hanging or failing.
  const endless = defineTrace({
    id: "test-endless",
    title: "endless",
    description: "counts up while i < n",
    code: `
for (let i = 0; i < n; i++) { //@loop
  tick(i);                    //@tick
}`,
    presets: [{ label: "three", input: { n: 3 } }],
    fields: { n: { min: 1, max: 100000 } },
    run(t, { n }) {
      for (let i = 0; i < n; i++) t.step(i % 2 ? "tick" : "loop", `Step number ${i} of the loop.`, { views: [arr("i", [i])], vars: { i } });
    },
  });

  it("stops at MAX_CUSTOM_FRAMES and says so", () => {
    const res = runCustom(endless, { n: "5000" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.truncated).toBe(true);
    expect(res.frames.length).toBe(MAX_CUSTOM_FRAMES + 1);
    expect(res.frames.at(-1)!.caption).toMatch(/at most 400 steps/);
    expect(res.notes.join(" ")).toMatch(/stops after 400/);
  });

  it("presets still fail loudly when they are too long", () => {
    expect(() => defineTrace({ ...{ id: "x", title: "x", description: "x", code: "a //@a", run: (t: Tracer) => { for (let i = 0; i < 100; i++) t.step("a", "a long preset", { views: [note("x")] }); } }, presets: [{ label: "p", input: {} }] })).toThrow(/more than 80 frames/);
  });

  it("a run that throws becomes a message, not a crash", () => {
    const broken = defineTrace({
      id: "test-broken",
      title: "broken",
      description: "throws on big n",
      code: "f(n) //@a",
      presets: [{ label: "ok", input: { n: 1 } }],
      run(t, { n }) {
        if (n > 1) throw new Error("boom");
        t.step("a", "first frame here", { views: [note("a")] });
        t.step("a", "second frame here", { views: [note("b")] });
      },
    });
    const errors = console.error;
    console.error = () => {};
    const res = runCustom(broken, { n: "2" });
    console.error = errors;
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/can't handle/) });
  });
});

describe("layouts for reader graphs", () => {
  const inside = (ps: [number, number][]) => ps.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100);
  it("stay inside 0..100", () => {
    expect(inside(autoLayout(6, [[0, 1], [1, 2], [2, 0], [3, 4]], { directed: true }))).toBe(true);
    expect(inside(autoLayout(7, [[0, 1], [0, 2], [1, 3]], { start: 0 }))).toBe(true);
    expect(inside(layeredLayout([0, 1, 1, 2, 2, 2, 3]))).toBe(true);
    expect(inside(forestLayout([0, 0, 1, 1, 4, 4]))).toBe(true);
  });
  it("put a DAG's sources left of their targets", () => {
    const pos = autoLayout(3, [[2, 1], [1, 0]], { directed: true });
    expect(pos[2][0]).toBeLessThan(pos[1][0]);
    expect(pos[1][0]).toBeLessThan(pos[0][0]);
  });
});

// Seeded random inputs within each field's caps: a run may be rejected, but must never throw or draw a broken view.
describe("random reader input", () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const num = (f: FieldSpec) => (rand() < 0.1 ? (f.min ?? -9) : rand() < 0.1 ? (f.max ?? 9) : ri(Math.max(f.min ?? -9, -3), Math.min(f.max ?? 9, 12)));
  const letters = (f: FieldSpec) => {
    const set = (f.chars ?? "a-c").replace(/\\/g, "").replace(/(.)-(.)/g, (_, a: string, b: string) => String.fromCharCode(...Array.from({ length: Math.min(5, b.charCodeAt(0) - a.charCodeAt(0) + 1) }, (_, i) => a.charCodeAt(0) + i)));
    return Array.from({ length: ri(1, Math.min(f.maxLength ?? 5, 6)) }, () => set[ri(0, set.length - 1)]).join("");
  };
  const count = (f: FieldSpec) => ri(f.minItems ?? 1, Math.min(f.maxItems ?? 8, 8));
  const gen = (f: FieldSpec, old: string): string => {
    switch (f.kind) {
      case "int":
        return String(num(f));
      case "letter":
        return String.fromCharCode(65 + ri(0, f.max ?? 5));
      case "bool":
        return rand() < 0.5 ? "true" : "false";
      case "text":
        return letters(f);
      case "ints":
        return Array.from({ length: count(f) }, () => num(f)).join(", ");
      case "tree":
        return [num(f), ...Array.from({ length: count(f) - 1 }, () => (rand() < 0.3 ? "null" : num(f)))].join(", ");
      case "words":
        return Array.from({ length: count(f) }, () => letters(f)).join(", ");
      case "lines": {
        const w = ri(1, f.maxLength ?? 5);
        return Array.from({ length: count(f) }, () => letters({ ...f, minLength: w, maxLength: w }).padEnd(w, letters(f)[0]).slice(0, w)).join("\n");
      }
      case "rows":
        return Array.from({ length: count(f) }, () => (f.cols ? f.cols.map((c) => (c === "int" ? num(f) : c === "letter" ? String.fromCharCode(65 + ri(0, 5)) : letters(f))).join(" ") : Array.from({ length: ri(0, 4) }, () => num(f)).join(" ") || "-")).join("\n");
      case "json":
        return old;
    }
  };
  for (const { file, name, spec } of traces) {
    it(`${file} › ${name}`, () => {
      for (let k = 0; k < 40; k++) {
        const values = { ...spec.presets[0].form! };
        for (const f of spec.fields ?? []) if (rand() < 0.85) values[f.key] = gen(f, values[f.key]);
        const res = runCustom(spec, values);
        if (!res.ok) {
          expect(res.error, JSON.stringify(values)).not.toMatch(/can't handle|doesn't fit this algorithm/);
          continue;
        }
        expect(res.frames.length).toBeGreaterThanOrEqual(2);
        res.frames.forEach((fr, i) => fr.views.forEach((v) => expect(viewProblem(v), `${JSON.stringify(values)} frame ${i}`).toBeNull()));
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { deepDives, learnSteps, questions } from "@content/registry";
import type { ClassSpec, DecisionSpec, FlowSpec, SeqItem, SequenceSpec, TimelineSpec } from "@/components/diagram/types";
import { NODE_KINDS } from "@/components/diagram/types";

const diagramModules = import.meta.glob("../content/**/diagrams.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const quizModules = import.meta.glob("../content/**/quiz.ts", { eager: true }) as Record<string, Record<string, unknown>>;

const isFlow = (v: unknown): v is FlowSpec => !!v && typeof v === "object" && "nodes" in v && "edges" in v;
const isSeq = (v: unknown): v is SequenceSpec => !!v && typeof v === "object" && "actors" in v && "items" in v;
const isClass = (v: unknown): v is ClassSpec => !!v && typeof v === "object" && "classes" in v && "relations" in v;
const isDecision = (v: unknown): v is DecisionSpec => !!v && typeof v === "object" && "start" in v && "nodes" in v && !Array.isArray((v as DecisionSpec).nodes);
const isTimeline = (v: unknown): v is TimelineSpec => !!v && typeof v === "object" && "lanes" in v && "spans" in v;

describe("registry ↔ content folders", () => {
  const root = path.resolve(__dirname, "../content");
  for (const s of learnSteps) it(`learn/${s.dir}`, () => expect(existsSync(path.join(root, "learn", s.dir, "page.mdx"))).toBe(true));
  for (const d of deepDives) it(`deep-dives/${d.dir}`, () => expect(existsSync(path.join(root, "deep-dives", d.dir, "page.mdx"))).toBe(true));
  for (const q of questions) it(`questions/${q.slug}`, () => expect(existsSync(path.join(root, "questions", q.slug, "page.mdx"))).toBe(true));
});

describe("diagram specs", () => {
  for (const [file, mod] of Object.entries(diagramModules)) {
    for (const [name, spec] of Object.entries(mod)) {
      const label = `${file.replace("../content/", "")} › ${name}`;
      if (isFlow(spec)) {
        it(`${label}: nodes, edges and scenarios are consistent`, () => {
          const ids = new Set(spec.nodes.map((n) => n.id));
          expect(ids.size, "duplicate node ids").toBe(spec.nodes.length);
          for (const n of spec.nodes) {
            expect(NODE_KINDS, `${n.id} kind`).toContain(n.kind);
            expect(n.label.length, `label too long: ${n.label}`).toBeLessThanOrEqual(18);
          }
          const cells = new Set(spec.nodes.map((n) => `${n.col},${n.row}`));
          expect(cells.size, "two nodes share a grid cell").toBe(spec.nodes.length);
          for (const e of spec.edges) {
            expect(ids.has(e.from), `edge from unknown node ${e.from}`).toBe(true);
            expect(ids.has(e.to), `edge to unknown node ${e.to}`).toBe(true);
          }
          const edgeIds = new Set(spec.edges.map((e) => `${e.from}>${e.to}`));
          for (const sc of spec.scenarios ?? []) {
            expect(sc.steps.length, `${sc.id} has no steps`).toBeGreaterThan(0);
            for (const st of sc.steps) {
              for (const s of [st, ...(st.with ?? [])]) {
                expect(edgeIds.has(s.edge), `${sc.id}: unknown edge ${s.edge}`).toBe(true);
                for (const mk of s.mark ?? []) expect(ids.has(mk.node), `${sc.id}: mark on unknown node ${mk.node}`).toBe(true);
              }
            }
          }
        });
      } else if (isSeq(spec)) {
        it(`${label}: messages reference actors`, () => {
          const ids = new Set(spec.actors.map((a) => a.id));
          const walk = (items: SeqItem[]) => {
            for (const it of items) {
              if ("alt" in it) it.alt.forEach((b) => walk(b.items));
              else if ("note" in it) it.over.forEach((o) => expect(ids.has(o), `note over unknown ${o}`).toBe(true));
              else {
                expect(ids.has(it.from), `unknown actor ${it.from}`).toBe(true);
                expect(ids.has(it.to), `unknown actor ${it.to}`).toBe(true);
              }
            }
          };
          walk(spec.items);
        });
      } else if (isClass(spec)) {
        it(`${label}: relations reference classes`, () => {
          const ids = new Set(spec.classes.map((c) => c.id));
          for (const r of spec.relations) {
            expect(ids.has(r.from), r.from).toBe(true);
            expect(ids.has(r.to), r.to).toBe(true);
          }
        });
        if (spec.stages) {
          it(`${label}: stages add every class exactly once`, () => {
            const ids = spec.classes.map((c) => c.id).sort();
            const added = spec.stages!.flatMap((s) => s.add).sort();
            expect(added).toEqual(ids);
            expect(spec.stages!.length).toBeGreaterThanOrEqual(2);
            for (const s of spec.stages!) {
              expect(s.add.length, s.title).toBeGreaterThan(0);
              expect(s.note.length, s.title).toBeGreaterThan(20);
            }
          });
        }
      } else if (isDecision(spec)) {
        it(`${label}: every branch exists`, () => {
          expect(spec.nodes[spec.start]).toBeDefined();
          for (const [id, n] of Object.entries(spec.nodes)) {
            if ("q" in n) {
              expect(spec.nodes[n.yes], `${id}.yes → ${n.yes}`).toBeDefined();
              expect(spec.nodes[n.no], `${id}.no → ${n.no}`).toBeDefined();
            }
          }
        });
      } else if (isTimeline(spec)) {
        it(`${label}: spans use known lanes`, () => {
          const lanes = new Set(spec.lanes.map((l) => l.id));
          for (const s of spec.spans) {
            expect(lanes.has(s.lane), s.lane).toBe(true);
            expect(s.end).toBeGreaterThan(s.start);
          }
        });
      }
    }
  }
});

describe("quizzes", () => {
  for (const [file, mod] of Object.entries(quizModules)) {
    it(file.replace("../content/", ""), () => {
      const items = mod.quiz as { q: string; options: string[]; answer: number }[];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(3);
      for (const q of items) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    });
  }
});

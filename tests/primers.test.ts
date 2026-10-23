import { describe, expect, it } from "vitest";
import { allPages } from "@content/registry";
import { getPrimer, PRIMER_IDS } from "@content/primers";
import { DOODLE_NAMES } from "@/components/doodle/names";
import { NODE_KINDS } from "@/components/diagram/types";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const hrefs = new Set(allPages().map((p) => p.href.split("#")[0]));

describe("primers", () => {
  for (const id of PRIMER_IDS) {
    describe(id, () => {
      const p = getPrimer(id);
      it("is written", () => expect(p, `content/primers/${id}.ts needs a primer`).toBeTruthy());
      if (!p) return;

      it("has the right id and a plain title", () => {
        expect(p.id).toBe(id);
        expect(p.title).toMatch(/^What (is|are) .+\?$/);
      });

      it("keeps the words few", () => {
        expect(words(p.idea)).toBeLessThanOrEqual(22);
        expect(words(p.analogy)).toBeLessThanOrEqual(28);
        expect(p.remember).toHaveLength(3);
        for (const r of p.remember) expect(words(r), r).toBeLessThanOrEqual(12);
        expect(words(p.whenToUse)).toBeLessThanOrEqual(22);
        expect(words(p.theCatch)).toBeLessThanOrEqual(22);
        expect(words(p.say)).toBeLessThanOrEqual(30);
      });

      it("has a picture and somewhere to go next", () => {
        expect(DOODLE_NAMES as readonly string[]).toContain(p.doodle);
        expect(p.learnMore.length).toBeGreaterThanOrEqual(1);
        expect(p.learnMore.length).toBeLessThanOrEqual(3);
        for (const l of p.learnMore) expect(hrefs.has(l.href), `${l.href} is not a page`).toBe(true);
      });

      it("tells a before and an after, in short plain captions", () => {
        const scenarios = p.flow.scenarios ?? [];
        expect(scenarios.length).toBeGreaterThanOrEqual(2);
        expect(scenarios.length).toBeLessThanOrEqual(3);
        expect(scenarios[0].name).toMatch(/^Without/i);
        expect(scenarios[1].name).toMatch(/^With/i);
        for (const sc of scenarios) {
          expect(sc.steps.length, sc.id).toBeGreaterThanOrEqual(3);
          expect(sc.steps.length, sc.id).toBeLessThanOrEqual(8);
          for (const st of sc.steps) if (st.caption) expect(words(st.caption), st.caption).toBeLessThanOrEqual(16);
        }
      });

      it("is a valid diagram", () => {
        const ids = new Set(p.flow.nodes.map((n) => n.id));
        expect(ids.size).toBe(p.flow.nodes.length);
        expect(p.flow.nodes.length).toBeLessThanOrEqual(7);
        for (const n of p.flow.nodes) {
          expect(NODE_KINDS).toContain(n.kind);
          expect(n.label.length, n.label).toBeLessThanOrEqual(16);
        }
        expect(new Set(p.flow.nodes.map((n) => `${n.col},${n.row}`)).size).toBe(p.flow.nodes.length);
        const edgeIds = new Set(p.flow.edges.map((e) => `${e.from}>${e.to}`));
        for (const e of p.flow.edges) expect(ids.has(e.from) && ids.has(e.to)).toBe(true);
        for (const sc of p.flow.scenarios ?? [])
          for (const st of sc.steps)
            for (const s of [st, ...(st.with ?? [])]) {
              expect(edgeIds.has(s.edge), `${sc.id}: unknown edge ${s.edge}`).toBe(true);
              for (const m of s.mark ?? []) expect(ids.has(m.node)).toBe(true);
            }
      });
    });
  }
});

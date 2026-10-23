// Stories: the step-by-step walkthrough a page opens on. Limits keep each one light and visual. See docs/AUTHORING-STORIES.md.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { allStories, type Scene, type Story } from "@content/stories";
import { allExtras } from "@content/extras";
import { DOODLE_NAMES } from "@/components/doodle/names";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function sceneWords(s: Scene): number {
  switch (s.kind) {
    case "doodle":
    case "flow":
    case "trace":
    case "classes":
      return 0;
    case "sum":
      return s.rows.reduce((n, r) => n + words(r.label) + words(r.value), 0) + words(s.result.label) + words(s.result.value) + words(s.verdict.text);
    case "bars":
      return s.bars.reduce((n, b) => n + words(b.label) + words(b.shown), 0);
    case "verdicts":
      return s.items.reduce((n, i) => n + words(i.label) + words(i.why), 0);
    case "versus":
      return [s.left, s.right].reduce((n, c) => n + words(c.title) + c.points.reduce((m, p) => m + words(p), 0), 0);
    case "meter":
      return words(s.label) + s.stops.reduce((n, t) => n + words(t.verdict), 0);
  }
}

/** "Understand it": optional, but when a story has it, it teaches from zero with a real example per step. */
function checkLearn(story: Story, where: string) {
  const learn = story.learn;
  if (!learn) return;
  expect(learn.length, `${where}: Understand it has 3 to 6 steps`).toBeGreaterThanOrEqual(3);
  expect(learn.length, `${where}: Understand it has 3 to 6 steps`).toBeLessThanOrEqual(6);
  learn.forEach((l, i) => {
    const at = `${where} learn ${i + 1}`;
    expect(words(l.head), `${at}: head at most 7 words`).toBeLessThanOrEqual(7);
    expect(words(l.body), `${at}: body at most 45 words (now ${words(l.body)})`).toBeLessThanOrEqual(45);
    expect(words(l.body), `${at}: body is at least 15 words`).toBeGreaterThanOrEqual(15);
    expect(words(l.eg), `${at}: example title at most 6 words`).toBeLessThanOrEqual(6);
    expect(words(l.example), `${at}: example at most 38 words (now ${words(l.example)})`).toBeLessThanOrEqual(38);
    expect(words(l.example), `${at}: example is at least 12 words`).toBeGreaterThanOrEqual(12);
    if (l.doodle) expect(DOODLE_NAMES as readonly string[], `${at}: doodle exists`).toContain(l.doodle);
  });
  expect(learn.filter((l) => l.doodle).length, `${where}: at most 2 pictures in Understand it`).toBeLessThanOrEqual(2);
}

function check(story: Story, where: string) {
  const { steps } = story;
  expect(steps.length, `${where}: 6 to 9 steps`).toBeGreaterThanOrEqual(6);
  expect(steps.length, `${where}: 6 to 9 steps`).toBeLessThanOrEqual(9);
  expect(steps[0].tag, `${where}: starts with the pain`).toBe("pain");
  expect(["catch", "skip"], `${where}: ends on a catch or a skip`).toContain(steps.at(-1)!.tag);
  expect(steps.some((s) => s.tag === "sum" || s.tag === "choose"), `${where}: has a sum or a choice`).toBe(true);
  expect(steps.filter((s) => s.scene.kind === "doodle").length, `${where}: at most 2 doodle scenes`).toBeLessThanOrEqual(2);
  expect(new Set(steps.map((s) => s.scene.kind)).size, `${where}: at least 3 kinds of scene`).toBeGreaterThanOrEqual(3);
  const predicts = steps.filter((s) => s.predict).length;
  expect(predicts, `${where}: 1 to 3 questions`).toBeGreaterThanOrEqual(1);
  expect(predicts, `${where}: 1 to 3 questions`).toBeLessThanOrEqual(3);

  let total = 0;
  steps.forEach((st, i) => {
    const at = `${where} step ${i + 1}`;
    if (i > 0) expect(st.scene.kind === steps[i - 1].scene.kind && st.scene.kind !== "flow" && st.scene.kind !== "trace" && st.scene.kind !== "classes", `${at}: same scene twice in a row`).toBe(false);
    expect(words(st.head), `${at}: head at most 6 words`).toBeLessThanOrEqual(6);
    expect(words(st.line), `${at}: line at most 18 words`).toBeLessThanOrEqual(18);
    total += words(st.head) + words(st.line) + sceneWords(st.scene);
    const sc = st.scene;
    if (sc.kind === "doodle") expect(DOODLE_NAMES as readonly string[], `${at}: doodle exists`).toContain(sc.name);
    if (sc.kind === "flow") {
      expect(sc.spec.scenarios?.some((x) => x.id === sc.scenario), `${at}: flow scenario "${sc.scenario}" exists`).toBe(true);
      expect(sc.spec.nodes.length, `${at}: flow has at most 7 nodes`).toBeLessThanOrEqual(7);
      const ids = new Set(sc.spec.nodes.map((n) => n.id));
      expect(ids.size, `${at}: duplicate node ids`).toBe(sc.spec.nodes.length);
      expect(new Set(sc.spec.nodes.map((n) => `${n.col},${n.row}`)).size, `${at}: two nodes share a grid cell`).toBe(sc.spec.nodes.length);
      for (const n of sc.spec.nodes) expect(n.label.length, `${at}: node label "${n.label}" over 18 characters`).toBeLessThanOrEqual(18);
      const edgeIds = new Set(sc.spec.edges.map((e) => `${e.from}>${e.to}`));
      for (const e of sc.spec.edges) expect(ids.has(e.from) && ids.has(e.to), `${at}: edge ${e.from}>${e.to} names a missing node`).toBe(true);
      const played = sc.spec.scenarios!.find((x) => x.id === sc.scenario)!;
      expect(played.steps.length, `${at}: scenario has 3 to 8 steps`).toBeGreaterThanOrEqual(3);
      expect(played.steps.length, `${at}: scenario has 3 to 8 steps`).toBeLessThanOrEqual(8);
      for (const stp of played.steps) for (const x of [stp, ...(stp.with ?? [])]) expect(edgeIds.has(x.edge), `${at}: scenario edge ${x.edge} does not exist`).toBe(true);
    }
    if (sc.kind === "trace") {
      const pr = sc.preset ? sc.trace.presets.find((x) => x.label === sc.preset) : sc.trace.presets[0];
      expect(pr, `${at}: trace preset "${sc.preset}" exists`).toBeDefined();
      expect(pr!.frames.length, `${at}: trace has 3 to 16 frames`).toBeGreaterThanOrEqual(3);
      expect(pr!.frames.length, `${at}: trace has 3 to 16 frames`).toBeLessThanOrEqual(16);
    }
    if (sc.kind === "classes") {
      expect(sc.spec.stages, `${at}: class diagram needs stages`).toBeDefined();
      expect(sc.stage, `${at}: stage in range`).toBeGreaterThanOrEqual(0);
      expect(sc.stage, `${at}: stage in range`).toBeLessThan(sc.spec.stages!.length);
    }
    if (sc.kind === "sum") {
      expect(sc.rows.length, `${at}: 2 to 4 rows`).toBeGreaterThanOrEqual(2);
      expect(sc.rows.length, `${at}: 2 to 4 rows`).toBeLessThanOrEqual(4);
      for (const r of sc.rows) {
        expect(words(r.label), `${at}: row label`).toBeLessThanOrEqual(5);
        expect(r.value.length, `${at}: row value`).toBeLessThanOrEqual(14);
      }
      expect(words(sc.result.label)).toBeLessThanOrEqual(6);
      expect(sc.result.value.length, `${at}: result value`).toBeLessThanOrEqual(14);
      expect(words(sc.verdict.text), `${at}: verdict`).toBeLessThanOrEqual(8);
    }
    if (sc.kind === "bars") {
      expect(sc.bars.length, `${at}: 2 to 5 bars`).toBeGreaterThanOrEqual(2);
      expect(sc.bars.length, `${at}: 2 to 5 bars`).toBeLessThanOrEqual(5);
      for (const b of sc.bars) {
        expect(b.value, `${at}: bar value`).toBeGreaterThan(0);
        expect(b.shown.length, `${at}: bar label`).toBeLessThanOrEqual(12);
        expect(b.label.length, `${at}: bar name`).toBeLessThanOrEqual(22);
      }
    }
    if (sc.kind === "verdicts") {
      expect(sc.items.length, `${at}: 3 to 5 items`).toBeGreaterThanOrEqual(3);
      expect(sc.items.length, `${at}: 3 to 5 items`).toBeLessThanOrEqual(5);
      for (const it of sc.items) {
        expect(it.label.length, `${at}: item label`).toBeLessThanOrEqual(18);
        expect(words(it.why), `${at}: item reason at most 10 words`).toBeLessThanOrEqual(10);
      }
    }
    if (sc.kind === "versus") {
      for (const c of [sc.left, sc.right]) {
        expect(words(c.title), `${at}: column title`).toBeLessThanOrEqual(4);
        expect(c.points.length, `${at}: 2 to 4 points`).toBeGreaterThanOrEqual(2);
        expect(c.points.length, `${at}: 2 to 4 points`).toBeLessThanOrEqual(4);
        for (const p of c.points) expect(words(p), `${at}: point at most 7 words`).toBeLessThanOrEqual(7);
      }
    }
    if (sc.kind === "meter") {
      expect(sc.min).toBeLessThan(sc.max);
      if (sc.log) expect(sc.min, `${at}: log scale needs min > 0`).toBeGreaterThan(0);
      expect(sc.start, `${at}: start in range`).toBeGreaterThanOrEqual(sc.min);
      expect(sc.start, `${at}: start in range`).toBeLessThanOrEqual(sc.max);
      expect(sc.stops.length, `${at}: 3 or 4 stops`).toBeGreaterThanOrEqual(3);
      expect(sc.stops.length, `${at}: 3 or 4 stops`).toBeLessThanOrEqual(4);
      const ups = sc.stops.map((s) => s.upTo);
      expect(ups, `${at}: stops ascend`).toEqual([...ups].sort((a, b) => a - b));
      expect(ups.at(-1)!, `${at}: last stop reaches max`).toBeGreaterThanOrEqual(sc.max);
      expect(words(sc.label), `${at}: meter label`).toBeLessThanOrEqual(8);
      expect(sc.unit.length, `${at}: unit`).toBeLessThanOrEqual(12);
      for (const t of sc.stops) expect(words(t.verdict), `${at}: stop verdict`).toBeLessThanOrEqual(10);
    }
    if (st.predict) {
      const p = st.predict;
      expect(words(p.q), `${at}: question at most 12 words`).toBeLessThanOrEqual(12);
      expect(p.options.length, `${at}: 2 or 3 options`).toBeGreaterThanOrEqual(2);
      expect(p.options.length, `${at}: 2 or 3 options`).toBeLessThanOrEqual(3);
      for (const o of p.options) expect(words(o), `${at}: option at most 8 words`).toBeLessThanOrEqual(8);
      expect(p.answer).toBeGreaterThanOrEqual(0);
      expect(p.answer).toBeLessThan(p.options.length);
      expect(words(p.why), `${at}: explanation at most 20 words`).toBeLessThanOrEqual(20);
    }
  });
  expect(total, `${where}: the whole story is at most 260 words (now ${total})`).toBeLessThanOrEqual(260);
}

describe("stories", () => {
  for (const [section, pages] of Object.entries(allStories)) {
    for (const [slug, story] of Object.entries(pages)) {
      it(`${section}/${slug} has a story`, () => expect(story, "missing: see docs/AUTHORING-STORIES.md").toBeDefined());
      if (story) it(`${section}/${slug}: the walkthrough is short and visual`, () => check(story, `${section}/${slug}`));
      if (story?.learn) it(`${section}/${slug}: Understand it teaches with real examples`, () => checkLearn(story, `${section}/${slug}`));
    }
  }
  it("every story belongs to a page that exists", () => {
    for (const [section, pages] of Object.entries(allStories)) for (const slug of Object.keys(pages)) expect(allExtras[section as keyof typeof allExtras][slug], `${section}/${slug}`).toBeDefined();
  });
});

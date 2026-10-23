import { describe, expect, it } from "vitest";
import { DesignDoc } from "@/components/playground/schema";
import { lint } from "@/components/playground/lint";
import { checkStage, docAt, FULL, graphOf, hopEdges, NODE_IDS, NODES, EDGES, SCENARIOS, STAGES } from "@/lib/arch/design";

describe("architecture lab: the stages", () => {
  it("every stage is a valid design and every edge joins components that exist at that stage", () => {
    for (let i = 0; i < STAGES.length; i++) {
      const doc = docAt(i);
      expect(DesignDoc.safeParse(doc).success, `stage ${i}`).toBe(true);
      const ids = new Set(doc.nodes.map((n) => n.id));
      for (const e of doc.edges) expect(ids.has(e.source) && ids.has(e.target), `stage ${i}: ${e.id}`).toBe(true);
    }
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODE_IDS.length);
    for (const e of EDGES) expect(NODE_IDS as readonly string[]).toContain(e.from);
  });

  it("each stage adds exactly the components it says it adds", () => {
    for (let i = 0; i < STAGES.length; i++) {
      const prev = new Set(i ? docAt(i - 1).nodes.map((n) => n.id) : []);
      const added = docAt(i).nodes.map((n) => n.id).filter((id) => !prev.has(id)).sort();
      expect(added, STAGES[i].title).toEqual([...STAGES[i].adds].sort());
    }
  });

  it("the full design contains every component", () => {
    expect(docAt(FULL).nodes.map((n) => n.id).sort()).toEqual([...NODE_IDS].sort());
  });

  STAGES.forEach((s, i) => {
    it(`stage ${i} (${s.title}): the new design copes, with no errors`, () => {
      const { after } = checkStage(i);
      expect(after.overloaded, `overloaded: ${after.overloaded.join(", ")} (worst ${after.worst?.id} ${Math.round((after.worst?.util ?? 0) * 100)}%)`).toEqual([]);
      expect(after.sim.errorsPerSec).toBe(0);
      expect(Object.values(after.sim.backlog).every((b) => b < 1)).toBe(true);
    });
    if (s.trigger.kind === "load") {
      it(`stage ${i}: the old design really breaks at this load`, () => {
        const { before } = checkStage(i);
        expect(before, "load stages have a stage before them").not.toBeNull();
        expect(before!.overloaded.length, `the stage ${i - 1} design should be over capacity at ${s.qps} req/s`).toBeGreaterThan(0);
      });
    }
  });

  it("the full design lints without errors", () => {
    const { nodes, edges } = graphOf(docAt(FULL));
    expect(lint(nodes, edges).filter((f) => f.level === "error")).toEqual([]);
  });
});

describe("architecture lab: requests", () => {
  it("every hop is a component in the full design, and consecutive hops are connected", () => {
    const edges = new Set(docAt(FULL).edges.map((e) => e.id));
    for (const sc of SCENARIOS) {
      expect(sc.hops.length).toBeGreaterThanOrEqual(4);
      expect(new Set(sc.hops.map((h) => h.node)).size).toBe(sc.hops.length);
      hopEdges(sc).forEach((link, i) => {
        if (link) expect(edges.has(link), `${sc.id}: ${link} is not an edge`).toBe(true);
        else expect(i, "only the first hop has no edge").toBe(0);
      });
    }
  });

  it("the fast paths fit their latency budget and the slow ones say why", () => {
    for (const sc of SCENARIOS) {
      // The queue, worker and email run after the user has their answer.
      const sync = sc.hops.filter((h) => !["queue", "worker", "email"].includes(h.node)).reduce((n, h) => n + h.ms, 0);
      expect(sync, sc.id).toBeLessThanOrEqual(sc.budgetMs);
    }
  });
});

describe("architecture lab: concept cards", async () => {
  const { CONCEPTS } = await import("@/lib/arch/concepts");
  const { allPages } = await import("@content/registry");
  const { DOODLE_NAMES } = await import("@/components/doodle/names");
  const hrefs = new Set(allPages().map((p) => p.href.split("#")[0]));
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

  for (const id of NODE_IDS) {
    describe(id, () => {
      const c = CONCEPTS[id];
      it("has a card", () => expect(c, `src/lib/arch/concepts.ts needs "${id}"`).toBeTruthy());
      if (!c) return;
      it("is complete and short enough for a card", () => {
        expect(c.id).toBe(id);
        expect(c.name.length).toBeGreaterThan(2);
        expect(words(c.what)).toBeGreaterThanOrEqual(12);
        expect(words(c.what)).toBeLessThanOrEqual(40);
        expect(words(c.why)).toBeLessThanOrEqual(40);
        expect(words(c.whenNot)).toBeLessThanOrEqual(35);
        expect(c.tradeoffs).toHaveLength(3);
        for (const t of c.tradeoffs) expect(words(t)).toBeLessThanOrEqual(25);
        expect(words(c.say)).toBeLessThanOrEqual(35);
        expect(c.followUp).toMatch(/\?$/);
        expect(words(c.followUp)).toBeLessThanOrEqual(20);
        expect(c.examples.length).toBeGreaterThanOrEqual(2);
        expect(c.examples.length).toBeLessThanOrEqual(4);
      });
      it("links to real pages and a real doodle", () => {
        expect(c.learn.length).toBeGreaterThanOrEqual(1);
        expect(c.learn.length).toBeLessThanOrEqual(3);
        for (const l of c.learn) expect(hrefs.has(l.href), `${l.href} is not a page`).toBe(true);
        if (c.doodle) expect(DOODLE_NAMES as readonly string[]).toContain(c.doodle);
      });
    });
  }
});

describe("architecture lab: diagnosis", async () => {
  const { diagnose } = await import("@/lib/arch/diagnose");
  const { simulate } = await import("@/components/playground/simulate");

  const run = (opts: Parameters<typeof simulate>[2] = {}, doc = docAt(FULL)) => {
    const { nodes, edges } = graphOf(doc);
    return { nodes, sim: simulate(nodes, edges, opts) };
  };

  it("says everything holds when it does", () => {
    const { nodes, sim } = run();
    expect(diagnose(nodes, sim).map((f) => f.level)).toEqual(["ok"]);
  });

  it("names a dead component and the requests it takes down", () => {
    const { nodes, sim } = run({ down: new Set(["gw"]) });
    const f = diagnose(nodes, sim);
    expect(f[0].text).toMatch(/requests a second are failing/);
    expect(f.some((x) => x.node === "gw" && /down/.test(x.text))).toBe(true);
  });

  it("a spike overloads something and says what to do about it", () => {
    const { nodes, sim } = run({ multiplier: 8 });
    const bad = diagnose(nodes, sim).filter((f) => f.level === "bad");
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some((f) => /capacity/.test(f.text))).toBe(true);
  });

  it("losing one instance of something replicated is survivable, of something single is not", () => {
    const { nodes, sim } = run({ lose: new Set(["api", "obs"]) });
    expect(sim.nodes.api.down).toBeUndefined();
    expect(sim.nodes.obs.down).toBe(true);
    expect(diagnose(nodes, sim).some((f) => f.node === "obs")).toBe(true);
  });

  it("a stage-0 design has a single point of failure the diagnosis can show", () => {
    const { nodes, sim } = run({ lose: new Set(["db"]) }, docAt(0));
    expect(diagnose(nodes, sim).some((f) => f.node === "db" && /down/.test(f.text))).toBe(true);
  });
});

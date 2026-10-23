import { describe, expect, it } from "vitest";
import { challenges, referenceDesign } from "@/components/playground/challenges";
import { grade, graphQuery } from "@/components/playground/grader";
import { lint } from "@/components/playground/lint";
import { orient } from "@/components/playground/rules";
import { decodeDesign, encodeDesign, specToDesign } from "@/components/playground/share";
import { simulate } from "@/components/playground/simulate";
import type { DesignDoc } from "@/components/playground/schema";
import type { FlowEdgeT, HldNode } from "@/components/playground/types";
import type { NodeKind } from "@/components/diagram/types";

const toGraph = (doc: DesignDoc) => ({
  nodes: doc.nodes.map((n) => ({ ...n, type: "hld" as const, data: { ...n.data } })) as HldNode[],
  edges: doc.edges.map((e) => ({ ...e, type: "flow" as const, data: { ...(e.data ?? {}) } })) as FlowEdgeT[],
});

const node = (id: string, kind: NodeKind, extra: Partial<HldNode["data"]> = {}): HldNode => ({
  id, type: "hld", position: { x: 0, y: 0 }, data: { kind, label: id, ...extra },
});
const edge = (source: string, target: string, data: FlowEdgeT["data"] = {}): FlowEdgeT => ({ id: `${source}>${target}`, source, target, type: "flow", data });

describe("challenges", () => {
  for (const c of challenges) {
    it(`${c.slug}: the reference design scores 100% and has no lint errors`, () => {
      const { nodes, edges } = toGraph(referenceDesign(c));
      const r = grade(c.rubric, nodes, edges);
      expect(r.items.filter((i) => !i.passed).map((i) => i.id)).toEqual([]);
      expect(r.percent).toBe(100);
      expect(lint(nodes, edges).filter((f) => f.level === "error")).toEqual([]);
    });
    it(`${c.slug}: an empty canvas scores 0`, () => {
      expect(grade(c.rubric, [], []).score).toBe(0);
    });
  }
});

describe("graphQuery.pathThrough", () => {
  const nodes = [node("c", "client"), node("lb", "lb"), node("s", "service"), node("d", "database")];
  it("finds paths with intermediate nodes", () => {
    const g = graphQuery(nodes, [edge("c", "lb"), edge("lb", "s"), edge("s", "d")]);
    expect(g.pathThrough(["client", "database"])).toBe(true);
    expect(g.pathThrough(["client", ["lb", "gateway"], "service"])).toBe(true);
    expect(g.pathThrough(["database", "client"])).toBe(false);
  });
  it("survives cycles", () => {
    const g = graphQuery(nodes, [edge("c", "lb"), edge("lb", "s"), edge("s", "lb")]);
    expect(g.pathThrough(["client", "database"])).toBe(false);
  });
});

describe("orient", () => {
  it("flips data-store → caller drags", () => {
    const kinds: Record<string, NodeKind> = { d: "database", s: "service" };
    const c = orient({ source: "d", target: "s", sourceHandle: "a", targetHandle: "b" }, (id) => kinds[id]);
    expect(c).toMatchObject({ source: "s", target: "d", sourceHandle: "b", targetHandle: "a" });
    const keep = orient({ source: "s", target: "d", sourceHandle: null, targetHandle: null }, (id) => kinds[id]);
    expect(keep.source).toBe("s");
  });
});

describe("lint", () => {
  it("flags a client talking to a database and a queue with no consumer", () => {
    const f = lint([node("c", "client"), node("d", "database"), node("q", "queue")], [edge("c", "d")]);
    const ids = f.map((x) => x.id.split(":")[0]);
    expect(ids).toContain("client-to-data");
    expect(ids).toContain("queue-no-consumer");
    expect(ids).toContain("db-spof");
  });
  it("ignores async edges when looking for sync cycles", () => {
    const nodes = [node("a", "service"), node("b", "external")];
    expect(lint(nodes, [edge("a", "b"), edge("b", "a", { async: true })]).some((x) => x.id.startsWith("sync-cycle"))).toBe(false);
    expect(lint(nodes, [edge("a", "b"), edge("b", "a")]).some((x) => x.id.startsWith("sync-cycle"))).toBe(true);
  });
});

describe("simulate", () => {
  it("splits load across a balancer and applies cache-aside to the database", () => {
    const nodes = [
      node("c", "client", { qps: 1000, readRatio: 0.9 }),
      node("lb", "lb"),
      node("s1", "service"),
      node("s2", "service"),
      node("k", "cache", { hitRatio: 0.9 }),
      node("d", "database"),
    ];
    const edges = [edge("c", "lb"), edge("lb", "s1"), edge("lb", "s2"), edge("s1", "k"), edge("s1", "d"), edge("s2", "k"), edge("s2", "d")];
    const r = simulate(nodes, edges);
    expect(r.nodes.s1.qps).toBeCloseTo(500);
    expect(r.nodes.s2.qps).toBeCloseTo(500);
    // reads 900 × 10% misses + writes 100 = 190
    expect(r.nodes.d.qps).toBeCloseTo(190);
    expect(r.nodes.k.qps).toBeCloseTo(1000);
  });
  it("reports queue backlog when consumers are too slow", () => {
    const nodes = [node("c", "client", { qps: 1000, readRatio: 0 }), node("q", "queue"), node("w", "worker", { perInstanceQps: 300 })];
    const r = simulate(nodes, [edge("c", "q"), edge("q", "w")]);
    expect(r.backlog.q).toBeCloseTo(700);
    expect(r.nodes.w.qps).toBeCloseTo(300);
  });
  it("reroutes around a dead instance and counts errors when nothing is left", () => {
    const nodes = [node("c", "client", { qps: 100 }), node("lb", "lb"), node("a", "service"), node("b", "service")];
    const edges = [edge("c", "lb"), edge("lb", "a"), edge("lb", "b")];
    expect(simulate(nodes, edges, { down: new Set(["a"]) }).nodes.b.qps).toBeCloseTo(100);
    expect(simulate(nodes, edges, { down: new Set(["a", "b"]) }).errorsPerSec).toBeCloseTo(100);
  });
});

describe("simulate: losing one instance, and side calls from a gateway", () => {
  const nodes = [node("c", "client", { qps: 1000, readRatio: 1 }), node("s", "service", { replicas: 3 })];
  const edges = [edge("c", "s")];
  it("a replicated node keeps serving with less capacity when it loses one instance", () => {
    expect(simulate(nodes, edges).nodes.s.util).toBeCloseTo(1000 / 6000);
    const r = simulate(nodes, edges, { lose: new Set(["s"]) });
    expect(r.nodes.s.util).toBeCloseTo(1000 / 4000);
    expect(r.nodes.s.down).toBeUndefined();
    expect(r.errorsPerSec).toBe(0);
  });
  it("a single-instance node that loses one instance is down", () => {
    const single = [node("c", "client", { qps: 1000 }), node("s", "service")];
    const r = simulate(single, [edge("c", "s")], { lose: new Set(["s"]) });
    expect(r.nodes.s.down).toBe(true);
    expect(r.errorsPerSec).toBeCloseTo(1000);
  });
  it("capacity can run out after losing an instance even though the full set coped", () => {
    const busy = [node("c", "client", { qps: 5000, readRatio: 1 }), node("s", "service", { replicas: 3 })];
    expect(simulate(busy, [edge("c", "s")]).nodes.s.util).toBeLessThan(1);
    expect(simulate(busy, [edge("c", "s")], { lose: new Set(["s"]) }).nodes.s.util).toBeGreaterThan(1);
  });
  it("a cache called by a gateway sees every request and takes none away from the service", () => {
    const g = [node("c", "client", { qps: 1000 }), node("g", "gateway"), node("k", "cache"), node("s", "service")];
    const r = simulate(g, [edge("c", "g"), edge("g", "k"), edge("g", "s")]);
    expect(r.nodes.k.qps).toBeCloseTo(1000);
    expect(r.nodes.s.qps).toBeCloseTo(1000);
  });
  it("a gateway still splits traffic between its services", () => {
    const g = [node("c", "client", { qps: 1000 }), node("g", "gateway"), node("a", "service"), node("b", "service")];
    const r = simulate(g, [edge("c", "g"), edge("g", "a"), edge("g", "b")]);
    expect(r.nodes.a.qps).toBeCloseTo(500);
  });
  it("losing the only cache behind a gateway fails every request, but a second instance saves it", () => {
    const mk = (replicas: number) => [node("c", "client", { qps: 1000 }), node("g", "gateway"), node("k", "cache", { replicas }), node("s", "service")];
    const e = [edge("c", "g"), edge("g", "k"), edge("g", "s")];
    expect(simulate(mk(1), e, { lose: new Set(["k"]) }).errorsPerSec).toBeCloseTo(1000);
    expect(simulate(mk(2), e, { lose: new Set(["k"]) }).errorsPerSec).toBe(0);
  });
  it("adds the cache's latency to the gateway's own and averages the services", () => {
    const g = [node("c", "client", { qps: 10 }), node("g", "gateway"), node("k", "cache"), node("s", "service")];
    const r = simulate(g, [edge("c", "g"), edge("g", "k"), edge("g", "s")]);
    expect(r.entryLatencyMs).toBeGreaterThan(3 + 1 + 20 - 0.5);
    expect(r.entryLatencyMs).toBeLessThan(3 + 1 + 20 + 1);
  });
});

describe("share links", () => {
  it("round-trips a design, including ones whose encoding contains '+'", () => {
    for (const c of challenges) {
      const doc = referenceDesign(c);
      const hash = `#d=${encodeDesign(doc)}`;
      expect(decodeDesign(hash)).toEqual(doc);
    }
  });
  it("rejects garbage and tampered links", () => {
    expect(decodeDesign("#d=not-a-design")).toBeNull();
    expect(decodeDesign("#x=1")).toBeNull();
    const bad = specToDesign({ id: "x", title: "x", description: "", nodes: [], edges: [] });
    const tampered = encodeDesign({ ...bad, version: 2 as 1 });
    expect(decodeDesign(`#d=${tampered}`)).toBeNull();
  });
});

describe("templates", () => {
  it("every template is a valid design that lints without crashing", async () => {
    const { TEMPLATES } = await import("@/components/playground/templates");
    const { DesignDoc } = await import("@/components/playground/schema");
    for (const t of TEMPLATES) {
      const doc = t.doc();
      expect(DesignDoc.safeParse(doc).success, t.id).toBe(true);
      const { nodes, edges } = toGraph(doc);
      expect(() => lint(nodes, edges)).not.toThrow();
      expect(() => simulate(nodes, edges)).not.toThrow();
    }
  });
});

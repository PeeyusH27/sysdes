import { describe, expect, it } from "vitest";
import { getChallenge } from "@/components/playground/challenges";
import { grade } from "@/components/playground/grader";
import { evaluateStep, missions } from "@/components/playground/missions";
import { DesignDoc } from "@/components/playground/schema";
import type { FlowEdgeT, HldNode } from "@/components/playground/types";

const toGraph = (doc: DesignDoc) => ({
  nodes: doc.nodes.map((n) => ({ ...n, type: "hld" as const, data: { ...n.data } })) as HldNode[],
  edges: doc.edges.map((e) => ({ ...e, type: "flow" as const, data: { ...(e.data ?? {}) } })) as FlowEdgeT[],
});

describe.each(missions)("mission $slug", (mission) => {
  it("belongs to a real challenge and starts from a valid design", () => {
    expect(getChallenge(mission.slug)).toBeTruthy();
    expect(DesignDoc.safeParse(mission.start).success).toBe(true);
    expect(mission.start.title).toBe(`${getChallenge(mission.slug)!.title} (guided)`);
    expect(mission.steps.length).toBeGreaterThanOrEqual(3);
    expect(new Set(mission.steps.map((s) => s.id)).size).toBe(mission.steps.length);
  });

  it("every scenario names components that exist in the starting design or are added by an earlier step", () => {
    let doc = mission.start;
    for (const step of mission.steps) {
      const ids = new Set(doc.nodes.map((n) => n.id));
      for (const id of [...(step.scenario.down ?? []), ...(step.scenario.lose ?? [])]) expect(ids.has(id), `${step.id}: ${id}`).toBe(true);
      doc = step.solve(doc);
    }
  });

  it("each step fails before its fix, with a message, and passes after it", () => {
    let doc = mission.start;
    for (const step of mission.steps) {
      const before = toGraph(doc);
      const r = evaluateStep(step, before.nodes, before.edges);
      expect(r.failure, `${step.id} should fail on the design as it stands`).not.toBeNull();
      expect(r.failure!.message.length).toBeGreaterThan(40);
      for (const id of r.failure!.nodes ?? []) expect(before.nodes.some((n) => n.id === id), `${step.id}: highlighted ${id}`).toBe(true);

      doc = step.solve(doc);
      expect(DesignDoc.safeParse(doc).success, `${step.id}: solved design is valid`).toBe(true);
      const after = toGraph(doc);
      const ok = evaluateStep(step, after.nodes, after.edges);
      expect(ok.failure?.message, `${step.id} should pass after its fix`).toBeUndefined();
    }
  });

  it("earlier fixes keep working: the finished design passes every step", () => {
    const doc = mission.steps.reduce((d, s) => s.solve(d), mission.start);
    const { nodes, edges } = toGraph(doc);
    for (const step of mission.steps) expect(evaluateStep(step, nodes, edges).failure?.message, step.id).toBeUndefined();
  });

  it("a step does not pass by accident: skipping a fix leaves the next step failing", () => {
    // Apply every fix except step i; step i must still fail on the result.
    mission.steps.forEach((skipped, i) => {
      const doc = mission.steps.reduce((d, s, j) => (j === i ? d : s.solve(d)), mission.start);
      const { nodes, edges } = toGraph(doc);
      expect(evaluateStep(skipped, nodes, edges).failure, `${skipped.id} must still fail without its own fix`).not.toBeNull();
    });
  });

  it("the finished design earns a good score on the full challenge", () => {
    const c = getChallenge(mission.slug)!;
    const { nodes, edges } = toGraph(mission.steps.reduce((d, s) => s.solve(d), mission.start));
    expect(grade(c.rubric, nodes, edges).percent).toBeGreaterThanOrEqual(65);
  });
});

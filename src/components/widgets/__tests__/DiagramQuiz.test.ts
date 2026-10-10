import { describe, expect, test } from "vitest";
import type { FlowSpec } from "@/components/diagram/types";
import { hintFor, pickNeutralKind, quizSpec, slotBox } from "../DiagramQuiz";

const spec: FlowSpec = {
  id: "cache-aside",
  title: "Cache-aside",
  description: "App checks the cache before the database.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 0 },
    { id: "api", label: "API", kind: "service", col: 1, row: 0, sub: "×3" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "client", to: "api" },
    { from: "api", to: "redis" },
    { from: "api", to: "db" },
  ],
  scenarios: [{ id: "hit", name: "Hit", steps: [{ edge: "client>api", caption: "Request." }] }],
};
const options = ["queue", "cache", "lb"] as const;

describe("DiagramQuiz helpers", () => {
  test("the hidden node never borrows the answer's look", () => {
    const k = pickNeutralKind(spec, "redis", [...options]);
    expect(k).toBe("client");
    expect(options).not.toContain(k);
    // when every other kind is an option, fall back to one that isn't
    expect(options).not.toContain(pickNeutralKind({ ...spec, nodes: [spec.nodes[2]] }, "redis", [...options]));
  });

  test("quizSpec hides the slot until solved, shows wrong guesses, unlocks scenarios when right", () => {
    const hidden = quizSpec(spec, "redis", null, "cache", "client");
    const slot = hidden.nodes.find((n) => n.id === "redis")!;
    expect(slot).toMatchObject({ label: "?", kind: "client", sub: undefined });
    expect(hidden.scenarios).toBeUndefined();

    const wrong = quizSpec(spec, "redis", "queue", "cache", "client").nodes.find((n) => n.id === "redis")!;
    expect(wrong).toMatchObject({ kind: "queue", label: "Queue" });

    const right = quizSpec(spec, "redis", "cache", "cache", "client");
    expect(right.nodes.find((n) => n.id === "redis")).toEqual(spec.nodes[2]);
    expect(right.scenarios).toHaveLength(1);
  });

  test("slotBox is the node's rectangle as fractions of the laid-out SVG", () => {
    const b = slotBox(spec, "redis", "horizontal")!;
    // horizontal layout: x = 30 + col·176 + 68, width = max x + 68 + 30 → node at col 2 of 3
    expect(b.left).toBeCloseTo((30 + 2 * 176) / (30 + 2 * 176 + 136 + 30), 5);
    expect(b.top).toBeCloseTo(30 / (30 + 86 + 46 + 30), 5);
    expect(b.width).toBeGreaterThan(0);
    expect(b.left + b.width).toBeLessThanOrEqual(1);
    expect(slotBox(spec, "nope", "horizontal")).toBeNull();
    const v = slotBox(spec, "redis", "vertical")!;
    expect(v.top).toBeGreaterThan(b.top); // transposed: columns become rows
  });

  test("hint names the neighbours, not the answer", () => {
    const h = hintFor(spec, "redis");
    expect(h).toContain("API");
    expect(h.toLowerCase()).not.toContain("cache");
  });
});

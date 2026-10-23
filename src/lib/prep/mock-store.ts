"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getChallenge } from "@/components/playground/challenges";
import { grade } from "@/components/playground/grader";
import { useDesign } from "@/components/playground/store";
import { useDsa } from "@/lib/dsa/store";
import type { Track } from "./catalog-types";
import type { MockItem, MockOutcome, MockResult } from "./mock";

export interface MockSession {
  id: string;
  type: Track;
  startedAt: number;
  durationMs: number;
  items: MockItem[];
  /** Submissions and failures per item when the round began, so only what happens in the round is judged. */
  baseline: Record<string, { submits: number; failed: number }>;
}

type MockState = {
  active: MockSession | null;
  last: MockResult | null;
  history: MockResult[];
  start: (type: Track, items: MockItem[], durationMs: number) => MockSession;
  finish: (timedOut: boolean) => MockResult | null;
  abandon: () => void;
};

/** The practice problems and exercises are judged by the DSA store; a challenge by the design on the canvas. */
function judge(session: MockSession): MockOutcome[] {
  const dsa = useDsa.getState();
  return session.items.map((item): MockOutcome => {
    if (item.kind === "challenge") {
      const c = getChallenge(item.slug);
      const d = useDesign.getState();
      // The canvas only counts if it is this challenge's (or its guided mission's) design.
      const mine = c && (d.title === c.title || d.title === `${c.title} (guided)`);
      if (!c || !mine) return { slug: item.slug, title: item.title, href: item.href, kind: "challenge", solved: false, attempts: 0, percent: 0, missed: c?.rubric.map((r) => ({ label: r.label, hint: r.hint })) };
      const g = grade(c.rubric, d.nodes, d.edges);
      return {
        slug: item.slug,
        title: item.title,
        href: item.href,
        kind: "challenge",
        solved: g.percent >= 70,
        attempts: 1,
        percent: g.percent,
        missed: g.items.filter((i) => !i.passed).map((i) => ({ label: i.label, hint: i.hint })),
      };
    }
    const base = session.baseline[item.key] ?? { submits: 0, failed: 0 };
    const submits = (dsa.submits[item.key] ?? 0) - base.submits;
    const failed = (dsa.failed[item.key] ?? 0) - base.failed;
    const solvedAt = dsa.solved[item.key];
    const freshSolve = solvedAt !== undefined && solvedAt >= session.startedAt;
    const passed = freshSolve || submits - failed > 0;
    return {
      slug: item.slug,
      title: item.title,
      href: item.href,
      kind: item.kind,
      solved: passed,
      solvedAfterMs: freshSolve ? Math.max(0, solvedAt - session.startedAt) : undefined,
      attempts: Math.max(submits, passed ? 1 : 0),
    };
  });
}

export const useMock = create<MockState>()(
  persist(
    (set, get) => ({
      active: null,
      last: null,
      history: [],
      start: (type, items, durationMs) => {
        const dsa = useDsa.getState();
        const session: MockSession = {
          id: `${Date.now().toString(36)}`,
          type,
          startedAt: Date.now(),
          durationMs,
          items,
          baseline: Object.fromEntries(items.filter((i) => i.kind !== "challenge").map((i) => [i.key, { submits: dsa.submits[i.key] ?? 0, failed: dsa.failed[i.key] ?? 0 }])),
        };
        set({ active: session });
        return session;
      },
      finish: (timedOut) => {
        const s = get().active;
        if (!s) return null;
        const now = Date.now();
        const result: MockResult = { id: s.id, type: s.type, startedAt: s.startedAt, endedAt: now, durationMs: s.durationMs, timedOut, outcomes: judge(s) };
        set({ active: null, last: result, history: [result, ...get().history].slice(0, 20) });
        return result;
      },
      abandon: () => set({ active: null }),
    }),
    { name: "sds-mock", version: 1 },
  ),
);

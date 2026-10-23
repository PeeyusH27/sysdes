// Mock interview rounds: what to ask, and how a finished round is judged. The round itself is a timer around the
// site's normal workspaces (problems, exercises, playground challenges) with hints and solutions held back.
import type { Catalog, CatalogItem, Track } from "./catalog-types";
import { shuffled } from "./plan";
import { lldSkills, patternSkills, type Signals } from "./readiness";

export interface MockItem {
  kind: "problem" | "exercise" | "challenge";
  slug: string;
  /** Solved-state key for problems and exercises. */
  key: string;
  title: string;
  href: string;
  /** Why this one: shown on the setup page. */
  why: string;
}

export const MOCK_MINUTES = [30, 45, 60] as const;
export const MOCK_LABEL: Record<Track, string> = { dsa: "Coding round", hld: "System design round", lld: "Low-level design round" };
export const MOCK_BLURB: Record<Track, string> = {
  dsa: "Two problems from the patterns you are weakest at. No hints, no solutions until the timer ends.",
  hld: "One design brief, built on the playground canvas and graded against what interviewers look for.",
  lld: "One class-design exercise with hidden tests. Model it, extend it, make it pass.",
};

const rank = (d: string) => ["Easy", "Medium", "Hard"].indexOf(d);

/** Pick a problem of the wanted difficulty if there is one, else the closest. */
function pickProblem(items: CatalogItem[], want: "Medium" | "Hard", seed: number) {
  const pool = shuffled(items, seed);
  return [...pool].sort((a, b) => Math.abs(rank(a.difficulty) - rank(want)) - Math.abs(rank(b.difficulty) - rank(want)))[0];
}

export function pickMock(type: Track, c: Catalog, s: Signals, seed: number): MockItem[] {
  if (type === "dsa") {
    // Weakest patterns first; prefer patterns with something left to solve, then fall back to solved ones to redo.
    const skills = patternSkills(c, s).sort((a, b) => a.score - b.score);
    const withTodo = skills.filter((k) => c.patterns.find((p) => `dsa:${p.slug}` === k.id)!.problems.some((x) => !s.solved[x.key]));
    const rest = skills.filter((k) => !withTodo.includes(k));
    const order = [...withTodo, ...rest];
    const out: MockItem[] = [];
    for (const k of order) {
      if (out.length === 2) break;
      const p = c.patterns.find((x) => `dsa:${x.slug}` === k.id)!;
      if (!p.problems.length) continue;
      const unsolved = p.problems.filter((x) => !s.solved[x.key] && !out.some((o) => o.slug === x.slug));
      const pool = unsolved.length ? unsolved : p.problems.filter((x) => !out.some((o) => o.slug === x.slug));
      if (!pool.length) continue;
      const x = pickProblem(pool, out.length === 0 ? "Medium" : k.score >= 50 ? "Hard" : "Medium", seed + out.length);
      out.push({ kind: "problem", slug: x.slug, key: x.key, title: x.title, href: x.href, why: `${p.short} is one of your weaker patterns (${k.score}%).` });
    }
    return out;
  }
  if (type === "lld") {
    const weak = lldSkills(c, s).sort((a, b) => a.score - b.score);
    const todo = c.exercises.filter((e) => !s.solved[e.key]);
    const pool = todo.length ? todo : c.exercises;
    const lessonOf = (e: CatalogItem) => c.lldLessons.find((l) => l.exercises.some((x) => x.slug === e.slug));
    const scored = shuffled(pool, seed).sort((a, b) => (weak.find((k) => k.id === `lld:${lessonOf(a)?.slug}`)?.score ?? 100) - (weak.find((k) => k.id === `lld:${lessonOf(b)?.slug}`)?.score ?? 100));
    const x = scored[0];
    return x ? [{ kind: "exercise", slug: x.slug, key: x.key, title: x.title, href: x.href, why: todo.length ? "You have not solved this one yet." : "You solved everything: this is a repeat." }] : [];
  }
  const ch = shuffled(c.challenges, seed).sort((a, b) => (s.challenge[a.slug] ?? -1) - (s.challenge[b.slug] ?? -1))[0];
  return ch ? [{ kind: "challenge", slug: ch.slug, key: ch.slug, title: ch.title, href: `/playground/${ch.slug}`, why: (s.challenge[ch.slug] ?? 0) > 0 ? `Your best so far is ${s.challenge[ch.slug]}%.` : "You have not tried this one." }] : [];
}

/* ------------------------------------------------------------------ judging a finished round */

export interface MockOutcome {
  slug: string;
  title: string;
  href: string;
  kind: MockItem["kind"];
  solved: boolean;
  /** Milliseconds from the start of the round to the solve, when solved in time. */
  solvedAfterMs?: number;
  attempts: number;
  /** Challenges: the score and the rubric lines that were missed. */
  percent?: number;
  missed?: { label: string; hint: string }[];
}

export interface MockResult {
  id: string;
  type: Track;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  timedOut: boolean;
  outcomes: MockOutcome[];
}

/** 0–100 for a finished round: solving counts most, then speed, with a small penalty for wrong submissions. */
export function mockScore(r: MockResult): number {
  if (!r.outcomes.length) return 0;
  const per = r.outcomes.map((o) => {
    if (o.kind === "challenge") return o.percent ?? 0;
    if (!o.solved) return 0;
    const speed = o.solvedAfterMs !== undefined ? 1 - 0.3 * Math.min(1, o.solvedAfterMs / r.durationMs) : 0.7;
    return Math.max(0, 100 * speed - Math.min(30, (o.attempts - 1) * 10));
  });
  return Math.round(per.reduce((a, b) => a + b, 0) / per.length);
}

export function mockVerdict(score: number): string {
  if (score >= 80) return "Strong. This is what a passing round looks like.";
  if (score >= 55) return "Close. The gaps below are the difference between a pass and a near miss.";
  if (score >= 25) return "A start. Review what you missed, then try another round.";
  return "Not yet, and that is useful to know now. Work through the review list, then come back.";
}

// How ready someone is, per skill and per round, from what the site already records: pages finished, quiz scores,
// problems and exercises solved, challenge and mission progress, and pattern-drill accuracy. Pure functions.
// Each skill is scored out of 100 as a few weighted signals, so "why is this 40%?" always has an answer.
import type { Catalog, CatalogItem, Track } from "./catalog-types";

export interface Signals {
  /** href → time marked done. */
  done: Record<string, number>;
  /** href → best quiz score, 0 to 1. */
  quiz: Record<string, number>;
  /** challenge slug → best score, 0 to 100. */
  challenge: Record<string, number>;
  /** challenge slug → mission steps passed. */
  mission: Record<string, number>;
  /** pattern slug → drill answers seen and right. */
  drill: Record<string, { seen: number; right: number }>;
  /** problem slug (or `lld:<slug>`) → time solved. */
  solved: Record<string, number>;
  /** question slug → how much of the "Explain it back" checklist the learner's answer covered, 0 to 1. */
  explain: Record<string, number>;
}

export const emptySignals = (): Signals => ({ done: {}, quiz: {}, challenge: {}, mission: {}, drill: {}, solved: {}, explain: {} });

export type ActionKind = "read" | "problem" | "exercise" | "drill" | "challenge" | "mission" | "question" | "explain";

export interface Action {
  kind: ActionKind;
  href: string;
  label: string;
  minutes: number;
}

export interface Evidence {
  label: string;
  got: number;
  of: number;
}

export interface Skill {
  id: string;
  track: Track;
  group: string;
  title: string;
  short: string;
  href: string;
  /** 0 to 100. */
  score: number;
  evidence: Evidence[];
  /** The single most useful next step, or null when the skill is solid. */
  next: Action | null;
}

export const READY_AT = 75;

export function band(score: number): "Just starting" | "Building" | "Getting there" | "Interview-ready" {
  if (score >= READY_AT) return "Interview-ready";
  if (score >= 50) return "Getting there";
  if (score >= 25) return "Building";
  return "Just starting";
}

const pct = (x: number) => Math.max(0, Math.min(1, x));
const unsolved = (items: CatalogItem[], s: Signals) => items.filter((i) => !s.solved[i.key]);
const solvedCount = (items: CatalogItem[], s: Signals) => items.length - unsolved(items, s).length;

/** The learner's cheapest next problem: easier first, so momentum builds. */
const easiestFirst = (items: CatalogItem[]) => [...items].sort((a, b) => ["Easy", "Medium", "Hard"].indexOf(a.difficulty) - ["Easy", "Medium", "Hard"].indexOf(b.difficulty));

/** Build a skill from weighted parts: each part is a fraction 0..1 of its weight. */
function skill(base: Omit<Skill, "score" | "evidence" | "next">, parts: { label: string; weight: number; fraction: number; got: number; of: number }[], next: Action | null): Skill {
  const total = parts.reduce((n, p) => n + p.weight, 0);
  const score = Math.round((parts.reduce((n, p) => n + p.weight * pct(p.fraction), 0) / total) * 100);
  return { ...base, score, evidence: parts.map((p) => ({ label: p.label, got: p.got, of: p.of })), next: score >= READY_AT ? null : next };
}

const quizPart = (href: string, s: Signals, weight: number) => ({ label: "Quiz", weight, fraction: s.quiz[href] ?? 0, got: Math.round((s.quiz[href] ?? 0) * 100), of: 100 });
const donePart = (href: string, s: Signals, weight: number, label = "Read") => ({ label, weight, fraction: s.done[href] ? 1 : 0, got: s.done[href] ? 1 : 0, of: 1 });

/** How many solved problems count as "enough" for a pattern. */
export const ENOUGH_PROBLEMS = 4;

export function patternSkills(c: Catalog, s: Signals): Skill[] {
  return c.patterns.map((p) => {
    const href = `/dsa/patterns/${p.slug}`;
    const need = Math.min(ENOUGH_PROBLEMS, p.problems.length);
    const got = Math.min(solvedCount(p.problems, s), need);
    const d = s.drill[p.slug] ?? { seen: 0, right: 0 };
    const parts = [
      donePart(href, s, 25),
      quizPart(href, s, 15),
      { label: "Problems solved", weight: 45, fraction: need ? got / need : 0, got, of: need },
      { label: "Pattern drill", weight: 15, fraction: d.right / Math.max(d.seen, 3), got: d.right, of: Math.max(d.seen, 3) },
    ];
    const todo = easiestFirst(unsolved(p.problems, s))[0];
    const next: Action | null = !s.done[href]
      ? { kind: "read", href, label: `Read ${p.title}`, minutes: p.minutes }
      : got < need && todo
        ? { kind: "problem", href: todo.href, label: `Solve ${todo.title}`, minutes: todo.minutes }
        : { kind: "drill", href: "/dsa/drill", label: "Play a pattern drill round", minutes: 10 };
    return skill({ id: `dsa:${p.slug}`, track: "dsa", group: p.group, title: p.title, short: p.short, href }, parts, next);
  });
}

function readQuizSkill(id: string, track: Track, group: string, title: string, short: string, href: string, minutes: number, s: Signals): Skill {
  const next: Action = !s.done[href] ? { kind: "read", href, label: `Read ${title}`, minutes } : { kind: "read", href, label: `Finish the quiz at the end of ${short}`, minutes: 5 };
  return skill({ id, track, group, title, short, href }, [donePart(href, s, 60), quizPart(href, s, 40)], next);
}

const explainPart = (slug: string, s: Signals, weight: number) => ({ label: "Explained it back", weight, fraction: s.explain[slug] ?? 0, got: Math.round((s.explain[slug] ?? 0) * 100), of: 100 });

/** A question with no practice part of its own: read it, take the quiz, and (when there is one) explain it back. */
function questionSkill(id: string, track: Track, group: string, q: Catalog["questions"][number], href: string, s: Signals): Skill {
  if (!q.explain) return readQuizSkill(id, track, group, q.label, q.label, href, q.minutes, s);
  const parts = [donePart(href, s, 45, "Read the answer"), quizPart(href, s, 25), explainPart(q.slug, s, 30)];
  const next: Action = !s.done[href] ? { kind: "question", href, label: `Read ${q.label}`, minutes: q.minutes } : { kind: "explain", href: `/explain/${q.slug}`, label: `Explain ${q.label} back`, minutes: 20 };
  return skill({ id, track, group, title: q.label, short: q.label, href }, parts, next);
}

export function hldSkills(c: Catalog, s: Signals): Skill[] {
  const steps = c.learn.map((l) => readQuizSkill(`hld:learn:${l.slug}`, "hld", "HLD path", l.title, l.title, `/learn/${l.slug}`, l.minutes, s));
  const dives = c.deepDives.map((d) => readQuizSkill(`hld:dive:${d.slug}`, "hld", "Deep dives", d.title.split(":")[0], d.title.split(":")[0], `/deep-dives/${d.slug}`, d.minutes, s));
  const qs = c.questions
    .filter((q) => !q.lld)
    .map((q) => {
      const href = `/questions/${q.slug}`;
      const ch = q.challenge ? c.challenges.find((x) => x.slug === q.challenge) : undefined;
      if (!ch) return questionSkill(`hld:q:${q.slug}`, "hld", "Interview questions", q, href, s);
      // A question with a playground challenge counts the best of the free challenge and the guided mission.
      const mission = ch.missionSteps ? (s.mission[ch.slug] ?? 0) / ch.missionSteps : 0;
      const free = (s.challenge[ch.slug] ?? 0) / 100;
      const build = Math.max(free, mission * 0.7);
      const exp = q.explain ? explainPart(q.slug, s, 20) : null;
      const parts = [donePart(href, s, q.explain ? 25 : 30, "Read the answer"), quizPart(href, s, q.explain ? 15 : 20), { label: "Built it in the playground", weight: q.explain ? 40 : 50, fraction: build, got: Math.round(build * 100), of: 100 }, ...(exp ? [exp] : [])];
      const explainNext: Action | null = q.explain && (s.explain[q.slug] ?? 0) < 0.7 ? { kind: "explain", href: `/explain/${q.slug}`, label: `Explain ${q.label} back`, minutes: 20 } : null;
      const next: Action = !s.done[href]
        ? { kind: "question", href, label: `Read ${q.label}`, minutes: q.minutes }
        : ch.missionSteps && mission < 1 && free < 0.7
          ? { kind: "mission", href: `/playground/${ch.slug}/guided`, label: `Play the ${ch.title} mission`, minutes: 20 }
          : free < 0.7
            ? { kind: "challenge", href: `/playground/${ch.slug}`, label: `Build the ${ch.title} design`, minutes: 25 }
            : (explainNext ?? { kind: "challenge", href: `/playground/${ch.slug}`, label: `Build the ${ch.title} design`, minutes: 25 });
      return skill({ id: `hld:q:${q.slug}`, track: "hld", group: "Interview questions", title: q.label, short: q.label, href }, parts, next);
    });
  return [...steps, ...dives, ...qs];
}

export function lldSkills(c: Catalog, s: Signals): Skill[] {
  const lessons = c.lldLessons.map((l) => {
    const href = `/lld/foundations/${l.slug}`;
    if (!l.exercises.length) return readQuizSkill(`lld:${l.slug}`, "lld", "Foundations", l.title, l.short, href, l.minutes, s);
    const got = solvedCount(l.exercises, s);
    const todo = easiestFirst(unsolved(l.exercises, s))[0];
    const parts = [donePart(href, s, 35), quizPart(href, s, 25), { label: "Exercises solved", weight: 40, fraction: got / l.exercises.length, got, of: l.exercises.length }];
    const next: Action = !s.done[href] ? { kind: "read", href, label: `Read ${l.title}`, minutes: l.minutes } : { kind: "exercise", href: todo ? todo.href : href, label: todo ? `Code ${todo.title}` : `Review ${l.short}`, minutes: todo?.minutes ?? 10 };
    return skill({ id: `lld:${l.slug}`, track: "lld", group: "Foundations", title: l.title, short: l.short, href }, parts, next);
  });
  const classics = c.questions
    .filter((q) => q.lld)
    .map((q) => {
      const href = `/questions/${q.slug}`;
      const ex = c.exercises.filter((e) => q.exercises.includes(e.slug));
      if (!ex.length) return questionSkill(`lld:q:${q.slug}`, "lld", "Classic questions", q, href, s);
      const got = solvedCount(ex, s);
      const todo = easiestFirst(unsolved(ex, s))[0];
      const exp = q.explain ? explainPart(q.slug, s, 20) : null;
      const parts = [donePart(href, s, q.explain ? 25 : 30, "Read the answer"), quizPart(href, s, q.explain ? 15 : 20), { label: "Exercises solved", weight: q.explain ? 40 : 50, fraction: got / ex.length, got, of: ex.length }, ...(exp ? [exp] : [])];
      const next: Action = !s.done[href]
        ? { kind: "question", href, label: `Read ${q.label}`, minutes: q.minutes }
        : todo
          ? { kind: "exercise", href: todo.href, label: `Code ${todo.title}`, minutes: todo.minutes }
          : q.explain && (s.explain[q.slug] ?? 0) < 0.7
            ? { kind: "explain", href: `/explain/${q.slug}`, label: `Explain ${q.label} back`, minutes: 20 }
            : { kind: "exercise", href, label: `Review ${q.label}`, minutes: 10 };
      return skill({ id: `lld:q:${q.slug}`, track: "lld", group: "Classic questions", title: q.label, short: q.label, href }, parts, next);
    });
  return [...lessons, ...classics];
}

export interface TrackReadiness {
  track: Track;
  score: number;
  band: ReturnType<typeof band>;
  skills: Skill[];
  ready: number;
}

export function readiness(c: Catalog, s: Signals): Record<Track, TrackReadiness> {
  const by: Record<Track, Skill[]> = { dsa: patternSkills(c, s), hld: hldSkills(c, s), lld: lldSkills(c, s) };
  const out = {} as Record<Track, TrackReadiness>;
  for (const t of ["dsa", "hld", "lld"] as Track[]) {
    const skills = by[t];
    const score = skills.length ? Math.round(skills.reduce((n, k) => n + k.score, 0) / skills.length) : 0;
    out[t] = { track: t, score, band: band(score), skills, ready: skills.filter((k) => k.score >= READY_AT).length };
  }
  return out;
}

/** The weakest skills that still have something to do, lowest score first. */
export function weakest(skills: Skill[], n = 3): Skill[] {
  return skills.filter((k) => k.next).sort((a, b) => a.score - b.score).slice(0, n);
}

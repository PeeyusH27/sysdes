// A study plan that is derived, never stored: only the learner's answers (rounds, weeks, hours) are saved, and the
// schedule is rebuilt from what is still undone every time. Finish something and the plan moves up; fall behind and
// it says so, with the exact amount of time that is missing.
import { mulberry32 } from "@/lib/rng";
import type { Catalog, Track } from "./catalog-types";
import { EXERCISE_MINUTES, TRACKS } from "./catalog-types";
import { ENOUGH_PROBLEMS, hldSkills, lldSkills, patternSkills, READY_AT, type ActionKind, type Signals } from "./readiness";

export interface PlanInputs {
  rounds: Track[];
  weeks: number;
  hoursPerWeek: number;
}

export interface PlanItem {
  id: string;
  track: Track;
  kind: ActionKind | "mock";
  label: string;
  href: string;
  minutes: number;
}

export interface PlanWeek {
  n: number;
  items: PlanItem[];
  minutes: number;
  /** The final week is for mock rounds and review. */
  mock?: boolean;
}

export interface Plan {
  weeks: PlanWeek[];
  /** What did not fit, in the order it would have been done. */
  unscheduled: PlanItem[];
  backlogMinutes: number;
  availableMinutes: number;
  fits: boolean;
  /** Hours per week that would fit everything in the same number of weeks. */
  hoursNeeded: number;
  /** How the learner's time is split between rounds. */
  shares: Partial<Record<Track, number>>;
}

/** Share of study time per round when all are chosen; renormalised over the rounds that are. */
const WEIGHT: Record<Track, number> = { dsa: 0.5, hld: 0.3, lld: 0.2 };

/**
 * Editorial: with little time, the patterns that come up most come first. With 5+ weeks the site's own teaching
 * order is used, because each pattern builds on the one before it.
 */
const SHORT_TIMELINE_ORDER = [
  "hashing", "two-pointers", "sliding-window", "binary-search", "tree-dfs", "tree-bfs", "graph-traversal", "dp-1d", "heaps", "stack",
  "backtracking", "intervals", "linked-list-reversal", "fast-slow-pointers", "prefix-sum", "trie", "union-find", "topological-sort",
  "shortest-paths", "dp-2d", "greedy", "bit-manipulation",
];

const easiestFirst = <T extends { difficulty: string }>(xs: T[]) => [...xs].sort((a, b) => ["Easy", "Medium", "Hard"].indexOf(a.difficulty) - ["Easy", "Medium", "Hard"].indexOf(b.difficulty));

function dsaBacklog(c: Catalog, s: Signals, weeks: number): PlanItem[] {
  const skills = new Map(patternSkills(c, s).map((k) => [k.id, k]));
  const order = weeks <= 4 ? SHORT_TIMELINE_ORDER.map((slug) => c.patterns.find((p) => p.slug === slug)!).filter(Boolean) : c.patterns;
  const out: PlanItem[] = [];
  let count = 0;
  for (const p of order) {
    const skill = skills.get(`dsa:${p.slug}`)!;
    if (skill.score >= READY_AT) continue;
    const href = `/dsa/patterns/${p.slug}`;
    if (!s.done[href]) out.push({ id: `read:${href}`, track: "dsa", kind: "read", label: `Read ${p.title}`, href, minutes: p.minutes });
    const need = Math.min(ENOUGH_PROBLEMS, p.problems.length);
    const have = p.problems.filter((x) => s.solved[x.key]).length;
    for (const x of easiestFirst(p.problems.filter((q) => !s.solved[q.key])).slice(0, Math.max(0, need - have))) {
      out.push({ id: `problem:${x.slug}`, track: "dsa", kind: "problem", label: `Solve ${x.title}`, href: x.href, minutes: x.minutes });
    }
    // A short recognition round after every few patterns keeps the skill of naming the pattern fresh.
    if (++count % 4 === 0) out.push({ id: `drill:${count}`, track: "dsa", kind: "drill", label: "Pattern drill: name the pattern", href: "/dsa/drill", minutes: 10 });
  }
  return out;
}

function hldBacklog(c: Catalog, s: Signals): PlanItem[] {
  const skills = new Map(hldSkills(c, s).map((k) => [k.id, k]));
  const out: PlanItem[] = [];
  const read = (id: string, href: string, title: string, minutes: number) => {
    if ((skills.get(id)?.score ?? 100) >= READY_AT) return;
    if (!s.done[href]) out.push({ id: `read:${href}`, track: "hld", kind: "read", label: `Read ${title}`, href, minutes });
    else out.push({ id: `quiz:${href}`, track: "hld", kind: "read", label: `Finish the quiz: ${title}`, href, minutes: 5 });
  };
  for (const l of c.learn) {
    read(`hld:learn:${l.slug}`, `/learn/${l.slug}`, l.title, l.minutes);
    // The URL shortener case study is followed by its guided mission.
    const ch = c.challenges.find((x) => x.slug === "url-shortener");
    if (l.slug === "case-url-shortener" && ch && (s.mission[ch.slug] ?? 0) < ch.missionSteps) out.push({ id: "mission:url-shortener", track: "hld", kind: "mission", label: "Play the URL shortener mission", href: "/playground/url-shortener/guided", minutes: 20 });
  }
  for (const d of c.deepDives) read(`hld:dive:${d.slug}`, `/deep-dives/${d.slug}`, d.title.split(":")[0], d.minutes);
  for (const q of c.questions.filter((x) => !x.lld)) {
    const skill = skills.get(`hld:q:${q.slug}`);
    if (!skill || skill.score >= READY_AT) continue;
    const href = `/questions/${q.slug}`;
    if (!s.done[href]) out.push({ id: `read:${href}`, track: "hld", kind: "question", label: `Read ${q.label}`, href, minutes: q.minutes });
    if (q.explain && (s.explain[q.slug] ?? 0) < 0.7) out.push({ id: `explain:${q.slug}`, track: "hld", kind: "explain", label: `Explain ${q.label} back`, href: `/explain/${q.slug}`, minutes: 20 });
    const ch = q.challenge ? c.challenges.find((x) => x.slug === q.challenge) : undefined;
    if (ch) {
      const mission = ch.missionSteps ? (s.mission[ch.slug] ?? 0) / ch.missionSteps : 1;
      if (ch.missionSteps && mission < 1 && ch.slug !== "url-shortener") out.push({ id: `mission:${ch.slug}`, track: "hld", kind: "mission", label: `Play the ${ch.title} mission`, href: `/playground/${ch.slug}/guided`, minutes: 20 });
      else if ((s.challenge[ch.slug] ?? 0) < 70) out.push({ id: `challenge:${ch.slug}`, track: "hld", kind: "challenge", label: `Build the ${ch.title} design`, href: `/playground/${ch.slug}`, minutes: 25 });
    }
  }
  return out;
}

function lldBacklog(c: Catalog, s: Signals): PlanItem[] {
  const skills = new Map(lldSkills(c, s).map((k) => [k.id, k]));
  const out: PlanItem[] = [];
  const exercises = (items: Catalog["exercises"]) => {
    for (const x of easiestFirst(items.filter((e) => !s.solved[e.key]))) out.push({ id: `exercise:${x.slug}`, track: "lld", kind: "exercise", label: `Code ${x.title}`, href: x.href, minutes: x.minutes || EXERCISE_MINUTES[x.difficulty] });
  };
  for (const l of c.lldLessons) {
    if ((skills.get(`lld:${l.slug}`)?.score ?? 100) >= READY_AT) continue;
    const href = `/lld/foundations/${l.slug}`;
    if (!s.done[href]) out.push({ id: `read:${href}`, track: "lld", kind: "read", label: `Read ${l.title}`, href, minutes: l.minutes });
    exercises(l.exercises);
  }
  for (const q of c.questions.filter((x) => x.lld)) {
    if ((skills.get(`lld:q:${q.slug}`)?.score ?? 100) >= READY_AT) continue;
    const href = `/questions/${q.slug}`;
    if (!s.done[href]) out.push({ id: `read:${href}`, track: "lld", kind: "question", label: `Read ${q.label}`, href, minutes: q.minutes });
    if (q.explain && (s.explain[q.slug] ?? 0) < 0.7) out.push({ id: `explain:${q.slug}`, track: "lld", kind: "explain", label: `Explain ${q.label} back`, href: `/explain/${q.slug}`, minutes: 20 });
  }
  // Exercises already queued under a lesson are not repeated under a question.
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

const MOCK_LABEL: Record<Track, string> = { dsa: "Mock coding round", hld: "Mock system design round", lld: "Mock low-level design round" };
const mockItem = (t: Track): PlanItem => ({ id: `mock:${t}`, track: t, kind: "mock", label: MOCK_LABEL[t], href: `/mock?type=${t}`, minutes: 45 });

/** Rounds are normalised so the shares of the chosen rounds add up to 1. */
export function sharesFor(rounds: Track[]): Partial<Record<Track, number>> {
  const chosen = TRACKS.filter((t) => rounds.includes(t));
  const total = chosen.reduce((n, t) => n + WEIGHT[t], 0);
  return Object.fromEntries(chosen.map((t) => [t, WEIGHT[t] / total]));
}

export function buildPlan(c: Catalog, s: Signals, inputs: PlanInputs): Plan {
  const weeksTotal = Math.max(1, Math.round(inputs.weeks));
  const budget = Math.max(30, Math.round(inputs.hoursPerWeek * 60));
  const rounds = TRACKS.filter((t) => inputs.rounds.includes(t));
  const shares = sharesFor(rounds);

  const queues: Record<Track, PlanItem[]> = {
    dsa: rounds.includes("dsa") ? dsaBacklog(c, s, weeksTotal) : [],
    hld: rounds.includes("hld") ? hldBacklog(c, s) : [],
    lld: rounds.includes("lld") ? lldBacklog(c, s) : [],
  };
  const backlog = TRACKS.flatMap((t) => queues[t]);
  const mocks = rounds.map(mockItem);

  // With two or more weeks the last one is for mock rounds. With one week the mocks are the tail of the work.
  const mockWeek = weeksTotal >= 2;
  const workWeeks = mockWeek ? weeksTotal - 1 : weeksTotal;
  if (!mockWeek) for (const m of mocks) queues[m.track].push(m);

  const weeks: PlanWeek[] = [];
  for (let n = 1; n <= workWeeks; n++) {
    const items: PlanItem[] = [];
    let used = 0;
    const taken: Record<Track, number> = { dsa: 0, hld: 0, lld: 0 };
    const blocked = new Set<Track>();
    for (;;) {
      const open = rounds.filter((t) => queues[t].length && !blocked.has(t));
      if (!open.length) break;
      // Deficit scheduling: serve the round that is furthest behind its share of the time so far.
      const t = open.reduce((a, b) => (taken[a] / (shares[a] ?? 1) <= taken[b] / (shares[b] ?? 1) ? a : b));
      const next = queues[t][0];
      if (used > 0 && used + next.minutes > budget) {
        blocked.add(t);
        continue;
      }
      queues[t].shift();
      items.push(next);
      used += next.minutes;
      taken[t] += next.minutes;
    }
    weeks.push({ n, items, minutes: used });
  }
  if (mockWeek) {
    const items = [...mocks, ...(backlog.length ? [{ id: "review", track: rounds[0] ?? "dsa", kind: "read" as const, label: "Review your weakest skills", href: "/plan#readiness", minutes: 30 }] : [])];
    weeks.push({ n: weeksTotal, items, minutes: items.reduce((n, i) => n + i.minutes, 0), mock: true });
  }

  const unscheduled = TRACKS.flatMap((t) => queues[t]);
  const backlogMinutes = backlog.reduce((n, i) => n + i.minutes, 0) + (mockWeek ? 0 : mocks.reduce((n, i) => n + i.minutes, 0));
  const availableMinutes = workWeeks * budget;
  return {
    weeks,
    unscheduled,
    backlogMinutes,
    availableMinutes,
    fits: unscheduled.length === 0,
    hoursNeeded: Math.ceil(backlogMinutes / workWeeks / 60),
    shares,
  };
}

/** The weeks left of a plan the learner started on `startedAt`. */
export function weeksLeft(totalWeeks: number, startedAt: number, now = Date.now()) {
  const elapsed = Math.floor((now - startedAt) / (7 * 24 * 3600 * 1000));
  return Math.max(1, totalWeeks - elapsed);
}

/** What to do right now: the first item of the first week. */
export const doNext = (plan: Plan): PlanItem | null => plan.weeks.find((w) => w.items.length)?.items[0] ?? null;

/** A deterministic shuffle, for choosing between equal candidates. */
export const shuffled = <T>(xs: T[], seed: number): T[] => {
  const rand = mulberry32(seed);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

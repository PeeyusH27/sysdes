import { describe, expect, it } from "vitest";
import { buildCatalog, type Track } from "@/lib/prep/catalog";
import { mockScore, pickMock, type MockResult } from "@/lib/prep/mock";
import { buildPlan, doNext, sharesFor, weeksLeft } from "@/lib/prep/plan";
import { band, emptySignals, readiness, READY_AT, weakest, type Signals } from "@/lib/prep/readiness";

const c = buildCatalog();
const none = emptySignals();
const ALL: Track[] = ["dsa", "hld", "lld"];

/** A learner who has done everything for one pattern. */
function masterPattern(slug: string): Signals {
  const p = c.patterns.find((x) => x.slug === slug)!;
  const s = emptySignals();
  s.done[`/dsa/patterns/${slug}`] = 1;
  s.quiz[`/dsa/patterns/${slug}`] = 1;
  for (const x of p.problems.slice(0, 4)) s.solved[x.key] = 1;
  s.drill[slug] = { seen: 5, right: 5 };
  return s;
}

describe("catalog", () => {
  it("covers every pattern with problems, every lesson with exercises, and the three LLD classics", () => {
    expect(c.patterns).toHaveLength(22);
    for (const p of c.patterns) expect(p.problems.length, p.slug).toBeGreaterThanOrEqual(4);
    expect(c.lldLessons.filter((l) => l.exercises.length > 0).length).toBeGreaterThanOrEqual(5);
    expect(c.questions.filter((q) => q.lld)).toHaveLength(3);
    expect(c.exercises.every((e) => e.key.startsWith("lld:"))).toBe(true);
  });
});

describe("readiness", () => {
  it("starts at zero and every skill has a next step", () => {
    const r = readiness(c, none);
    for (const t of ALL) {
      expect(r[t].score).toBe(0);
      expect(r[t].skills.every((k) => k.next), t).toBe(true);
    }
    expect(r.dsa.skills).toHaveLength(22);
    expect(r.lld.skills).toHaveLength(9);
  });

  it("a fully practised pattern is interview-ready and has no next step", () => {
    const k = readiness(c, masterPattern("hashing")).dsa.skills.find((x) => x.id === "dsa:hashing")!;
    expect(k.score).toBe(100);
    expect(k.next).toBeNull();
  });

  it("reading alone is not readiness: practice and the drill carry most of the weight", () => {
    const s = emptySignals();
    s.done["/dsa/patterns/hashing"] = 1;
    s.quiz["/dsa/patterns/hashing"] = 1;
    const k = readiness(c, s).dsa.skills.find((x) => x.id === "dsa:hashing")!;
    expect(k.score).toBeLessThan(READY_AT);
    expect(k.next?.kind).toBe("problem");
  });

  it("explains a score with evidence for each signal", () => {
    const k = readiness(c, masterPattern("hashing")).dsa.skills.find((x) => x.id === "dsa:hashing")!;
    expect(k.evidence.map((e) => e.label)).toEqual(["Read", "Quiz", "Problems solved", "Pattern drill"]);
  });

  it("combines the free challenge and the guided mission for a question with a playground challenge", () => {
    const s = emptySignals();
    s.done["/questions/rate-limiter"] = 1;
    const base = readiness(c, s).hld.skills.find((x) => x.id === "hld:q:rate-limiter")!.score;
    s.mission["rate-limiter"] = 4;
    const withMission = readiness(c, s).hld.skills.find((x) => x.id === "hld:q:rate-limiter")!.score;
    s.challenge["rate-limiter"] = 100;
    const withChallenge = readiness(c, s).hld.skills.find((x) => x.id === "hld:q:rate-limiter")!.score;
    expect(withMission).toBeGreaterThan(base);
    expect(withChallenge).toBeGreaterThan(withMission);
  });

  it("LLD exercises count towards their lesson and the classic they practise", () => {
    const s = emptySignals();
    s.solved["lld:parking-lot"] = 1;
    s.solved["lld:pricing-rules"] = 1;
    const r = readiness(c, s).lld.skills;
    expect(r.find((x) => x.id === "lld:q:parking-lot")!.score).toBeGreaterThan(0);
    expect(r.find((x) => x.id === "lld:solid")!.score).toBeGreaterThan(0);
  });

  it("bands and weakest", () => {
    expect(band(0)).toBe("Just starting");
    expect(band(30)).toBe("Building");
    expect(band(60)).toBe("Getting there");
    expect(band(80)).toBe("Interview-ready");
    const r = readiness(c, masterPattern("hashing"));
    expect(weakest(r.dsa.skills, 2).every((k) => k.id !== "dsa:hashing")).toBe(true);
  });
});

describe("plan", () => {
  const inputs = { rounds: ALL, weeks: 6, hoursPerWeek: 8 };

  it("splits time between the chosen rounds and drops the ones not chosen", () => {
    expect(sharesFor(["dsa", "hld"])).toEqual({ dsa: 0.5 / 0.8, hld: 0.3 / 0.8 });
    const plan = buildPlan(c, none, { ...inputs, rounds: ["lld"] });
    expect(plan.weeks.flatMap((w) => w.items).every((i) => i.track === "lld")).toBe(true);
  });

  it("keeps every week within its budget, except that a week always gets at least one item", () => {
    const plan = buildPlan(c, none, inputs);
    for (const w of plan.weeks.filter((x) => !x.mock)) {
      expect(w.items.length).toBeGreaterThan(0);
      expect(w.minutes).toBeLessThanOrEqual(8 * 60);
    }
  });

  it("reserves the last week for mock rounds and review", () => {
    const plan = buildPlan(c, none, inputs);
    const last = plan.weeks[plan.weeks.length - 1];
    expect(last.mock).toBe(true);
    expect(last.items.filter((i) => i.kind === "mock").map((i) => i.track).sort()).toEqual(["dsa", "hld", "lld"]);
  });

  it("tells the truth when it does not fit, with the hours that would", () => {
    const tight = buildPlan(c, none, { rounds: ALL, weeks: 2, hoursPerWeek: 3 });
    expect(tight.fits).toBe(false);
    expect(tight.unscheduled.length).toBeGreaterThan(0);
    const needed = buildPlan(c, none, { rounds: ALL, weeks: 2, hoursPerWeek: tight.hoursNeeded });
    expect(needed.unscheduled.length).toBeLessThanOrEqual(1);
  });

  it("is derived from progress: finished work leaves the plan, and a ready skill is skipped entirely", () => {
    const before = buildPlan(c, none, { ...inputs, rounds: ["dsa"] });
    const after = buildPlan(c, masterPattern("hashing"), { ...inputs, rounds: ["dsa"] });
    const ids = (p: typeof before) => p.weeks.flatMap((w) => w.items).concat(p.unscheduled).map((i) => i.id);
    expect(ids(before).some((i) => i.includes("hashing") || i.includes("/dsa/patterns/hashing"))).toBe(true);
    expect(ids(after).some((i) => i === "read:/dsa/patterns/hashing")).toBe(false);
    expect(after.backlogMinutes).toBeLessThan(before.backlogMinutes);
  });

  it("with a short timeline the most common patterns come first", () => {
    const short = buildPlan(c, none, { rounds: ["dsa"], weeks: 3, hoursPerWeek: 10 });
    const firstReads = short.weeks[0].items.filter((i) => i.kind === "read").map((i) => i.href);
    expect(firstReads[0]).toBe("/dsa/patterns/hashing");
    expect(firstReads).toContain("/dsa/patterns/sliding-window");
    const long = buildPlan(c, none, { rounds: ["dsa"], weeks: 8, hoursPerWeek: 10 });
    expect(long.weeks[0].items.filter((i) => i.kind === "read").map((i) => i.href)[1]).toBe("/dsa/patterns/two-pointers");
  });

  it("a one-week plan has no mock week but still ends with the mock rounds", () => {
    const one = buildPlan(c, none, { rounds: ["dsa"], weeks: 1, hoursPerWeek: 40 });
    expect(one.weeks).toHaveLength(1);
    expect([...one.weeks[0].items, ...one.unscheduled].some((i) => i.kind === "mock")).toBe(true);
  });

  it("tells you what to do next, and counts down the weeks", () => {
    expect(doNext(buildPlan(c, none, inputs))).toBeTruthy();
    const day = 24 * 3600 * 1000;
    expect(weeksLeft(6, 0, 0)).toBe(6);
    expect(weeksLeft(6, 0, 15 * day)).toBe(4);
    expect(weeksLeft(6, 0, 100 * day)).toBe(1);
  });
});

describe("mock rounds", () => {
  it("a coding round asks two problems from two different, weak patterns", () => {
    const s = masterPattern("hashing");
    const items = pickMock("dsa", c, s, 7);
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.slug)).size).toBe(2);
    expect(items.every((i) => i.kind === "problem" && !s.solved[i.key])).toBe(true);
    expect(items.every((i) => !i.href.includes("hashing"))).toBe(true);
  });

  it("is deterministic for a seed", () => {
    expect(pickMock("dsa", c, none, 3)).toEqual(pickMock("dsa", c, none, 3));
  });

  it("a design round picks the challenge you have scored least on", () => {
    const s = emptySignals();
    for (const ch of c.challenges) s.challenge[ch.slug] = 90;
    s.challenge["chat"] = 20;
    expect(pickMock("hld", c, s, 1)[0].slug).toBe("chat");
  });

  it("an LLD round picks an exercise you have not solved", () => {
    const s = emptySignals();
    for (const e of c.exercises.slice(1)) s.solved[e.key] = 1;
    expect(pickMock("lld", c, s, 1)[0].slug).toBe(c.exercises[0].slug);
  });

  it("scores solving, speed and wrong attempts", () => {
    const base: MockResult = { id: "x", type: "dsa", startedAt: 0, endedAt: 1, durationMs: 45 * 60000, timedOut: false, outcomes: [] };
    const solved = (ms: number, attempts: number) => ({ slug: "a", title: "A", href: "/", kind: "problem" as const, solved: true, solvedAfterMs: ms, attempts });
    const unsolved = { slug: "b", title: "B", href: "/", kind: "problem" as const, solved: false, attempts: 3 };
    const fast = mockScore({ ...base, outcomes: [solved(5 * 60000, 1)] });
    const slow = mockScore({ ...base, outcomes: [solved(44 * 60000, 1)] });
    const messy = mockScore({ ...base, outcomes: [solved(5 * 60000, 4)] });
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeGreaterThan(messy);
    expect(mockScore({ ...base, outcomes: [solved(5 * 60000, 1), unsolved] })).toBeLessThan(fast);
    expect(mockScore({ ...base, outcomes: [unsolved] })).toBe(0);
    expect(mockScore({ ...base, outcomes: [] })).toBe(0);
  });
});

describe("bundle safety", () => {
  it("no browser code imports the disk-reading catalog builder (it would pull node:fs into the client bundle)", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const path = await import("node:path");
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));
    const offenders = walk(path.resolve(__dirname, "../src"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        const importsBuilder = /from "(@\/lib\/prep\/catalog|\.\/catalog)"/.test(src);
        // Server pages may import it; anything marked "use client" or imported by client code through the shared modules may not.
        return importsBuilder && (/^"use client"/.test(src) || /lib\/prep\/(plan|mock|readiness|mock-store|use-signals)\.tsx?$/.test(f));
      });
    expect(offenders).toEqual([]);
  });
});

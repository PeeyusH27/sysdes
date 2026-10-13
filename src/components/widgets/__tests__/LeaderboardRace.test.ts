import { test, expect } from "vitest";
import {
  ME,
  PLAYER_IDS,
  aroundMe,
  applyEvent,
  byScoreThenTime,
  decodeTie,
  encodeTie,
  eventFor,
  initSim,
  mergeTopK,
  nextEvent,
  rankBoard,
  rollover,
  shardOf,
  shardRank,
  splitShards,
  stepSim,
  topK,
  type Board,
  type Sim,
  type TieRule,
} from "../LeaderboardRace";

const board: Board = {
  maya: { score: 1250, at: 5 },
  leo: { score: 1200, at: 3 },
  zoe: { score: 1200, at: 9 },
  ravi: { score: 1100, at: 1 },
  you: { score: 1100, at: 7 },
};
const ranks = (rule: TieRule, b: Board = board) => rankBoard(b, rule).map((r) => `${r.id}:${r.rank}`);
const RULES: TieRule[] = ["shared", "dense", "first"];

test("shared ranks: 1224 (1 + players with strictly more)", () => {
  expect(ranks("shared")).toEqual(["maya:1", "leo:2", "zoe:2", "ravi:4", "you:4"]);
});

test("dense ranks: 1223 (1 + distinct higher scores)", () => {
  expect(ranks("dense")).toEqual(["maya:1", "leo:2", "zoe:2", "ravi:3", "you:3"]);
});

test("first to reach: equal scores are ordered by who got there first", () => {
  expect(ranks("first")).toEqual(["maya:1", "leo:2", "zoe:3", "ravi:4", "you:5"]);
  expect(rankBoard(board, "first").map((r) => r.tied)).toEqual([false, true, true, true, true]);
});

test("top-K is the first K rows, ties included in their shared rank", () => {
  expect(topK(rankBoard(board, "shared"), 3).map((r) => r.rank)).toEqual([1, 2, 2]);
});

/** Run the stream for a while so boards look like they do in the widget. */
const played = (events: number, rule: TieRule = "shared") => {
  let s = initSim();
  for (let i = 0; i < events; i++) s = nextEvent(s, 4, rule);
  return s;
};

test("around me: centred mid-table, sliding at rank 1 and at the last rank", () => {
  const s = initSim();
  const rows = rankBoard(s.all, "first");
  const mid = rows[15].id;
  expect(aroundMe(rows, mid, 2).map((r) => r.pos)).toEqual([13, 14, 15, 16, 17]);
  expect(aroundMe(rows, rows[0].id, 2).map((r) => r.pos)).toEqual([0, 1, 2, 3, 4]);
  expect(aroundMe(rows, rows.at(-1)!.id, 2).map((r) => r.pos)).toEqual([25, 26, 27, 28, 29]);
  expect(aroundMe(rows, "nobody", 2)).toEqual([]);
});

test("the stream is deterministic and every score stays a multiple of 50 (so ties happen)", () => {
  expect(eventFor(123)).toEqual(eventFor(123));
  const s = played(300);
  expect(played(300)).toEqual(s);
  for (const e of [...Object.values(s.all), ...Object.values(s.daily)]) expect(e.score % 50).toBe(0);
  expect(rankBoard(s.all, "shared").some((r) => r.tied)).toBe(true);
});

test("you start outside the top 10, so the around-me panel is needed", () => {
  const me = rankBoard(initSim().all, "shared").find((r) => r.id === ME)!;
  expect(me.pos).toBeGreaterThanOrEqual(10);
});

test("players split 10 / 10 / 10 over three shards", () => {
  const counts = [0, 0, 0];
  for (const id of PLAYER_IDS) counts[shardOf(id, 3)]++;
  expect(counts).toEqual([10, 10, 10]);
  expect(shardOf("maya", 1)).toBe(0);
});

test("merging each shard's top K gives exactly the global top K", () => {
  for (const events of [0, 50, 200, 500]) {
    const s = played(events, "first");
    for (const b of [s.all, s.daily])
      for (const k of [1, 5, 10]) {
        const lists = splitShards(b, 3).map((part) => rankBoard(part, "first").slice(0, k));
        expect(mergeTopK(lists, k).map((e) => e.id)).toEqual(rankBoard(b, "first").slice(0, k).map((r) => r.id));
      }
  }
});

test("global rank from per-shard counts equals the true rank, for every player and tie rule", () => {
  const s = played(400);
  for (const rule of RULES) {
    for (const row of rankBoard(s.all, rule)) {
      const sr = shardRank(s.all, row.id, 3, rule)!;
      expect(sr.rank).toBe(row.rank);
      if (rule !== "dense") expect(sr.perShard.reduce((a, b) => a + b, 0)).toBe(row.rank - 1);
    }
  }
  expect(shardRank({}, ME, 3, "shared")).toBeNull();
});

test("dense ranks are not a sum of per-shard counts when a score repeats across shards", () => {
  // maya (shard 1) and leo (shard 2) both have 1,000: one distinct score, counted once per shard
  const b: Board = { maya: { score: 1000, at: 1 }, leo: { score: 1000, at: 2 }, you: { score: 500, at: 3 } };
  expect(shardOf("maya", 3)).not.toBe(shardOf("leo", 3));
  const sr = shardRank(b, ME, 3, "dense")!;
  expect(sr.perShard.reduce((a, c) => a + c, 0)).toBe(2);
  expect(sr.rank).toBe(2);
});

test("an event adds to both boards; the scorer flashes up and the overtaken flash down", () => {
  const s0: Sim = { ...initSim(), all: { ...board }, daily: {} };
  const s1 = applyEvent(s0, { pid: "ravi", points: 150 }, "shared"); // 1100 → 1250, ties Maya
  expect(s1.all.ravi).toEqual({ score: 1250, at: s0.seq });
  expect(s1.daily.ravi).toEqual({ score: 150, at: s0.seq });
  const flash = (pid: string) => s1.flashes.find((f) => f.board === "all" && f.pid === pid);
  expect(flash("ravi")?.delta).toBe(3); // #4 → #1 (shared with Maya)
  expect(flash("leo")?.delta).toBe(-1); // #2 → #3
  expect(flash("maya")).toBeUndefined(); // still #1
  expect(s1.flashes.find((f) => f.board === "daily" && f.pid === "ravi")?.isNew).toBe(true);
  expect(s1.last).toMatchObject({ pid: "ravi", points: 150, prevAll: { score: 1100, at: 1 }, prevDaily: null });
});

test("first to reach: equal points go to whoever reached them earlier", () => {
  const s0: Sim = { ...initSim(), all: { ...board }, daily: {} };
  const s1 = applyEvent(s0, { pid: "ravi", points: 150 }, "first"); // reaches 1,250 after Maya did
  expect(ranks("first", s1.all).slice(0, 2)).toEqual(["maya:1", "ravi:2"]);
});

test("stepSim applies events at the chosen rate, and floats and flashes fade", () => {
  let s = initSim();
  for (let i = 0; i < 20; i++) s = stepSim(s, 50, 4, "shared"); // 1 s at 4 events/s
  expect(s.seq - initSim().seq).toBe(4);
  expect(s.floats.length).toBeGreaterThan(0);
  for (let i = 0; i < 40; i++) s = stepSim(s, 50, 0.0001, "shared"); // 2 s with no events
  expect(s.floats).toEqual([]);
  expect(s.flashes).toEqual([]);
});

test("daily rollover empties today's board; the all-time board keeps every point", () => {
  const s = played(100);
  const r = rollover(s);
  expect(r.day).toBe(1);
  expect(r.daily).toEqual({});
  expect(r.all).toEqual(s.all);
  expect(r.log.at(-1)).toEqual({ seq: s.seq, kind: "rollover", day: 1 });
  const next = applyEvent(r, { pid: "maya", points: 50 }, "shared");
  expect(next.daily).toEqual({ maya: { score: 50, at: s.seq } });
  expect(next.all.maya.score).toBe(s.all.maya.score + 50);
});

test("+100 to me climbs the board", () => {
  let s = initSim();
  const before = rankBoard(s.all, "shared").find((r) => r.id === ME)!.rank;
  for (let i = 0; i < 6; i++) s = applyEvent(s, { pid: ME, points: 100 }, "shared");
  expect(rankBoard(s.all, "shared").find((r) => r.id === ME)!.rank).toBeLessThan(before);
  expect(s.all[ME].score).toBe(1300);
});

test("composite tie encoding orders earlier-to-reach first and round-trips", () => {
  expect(encodeTie(1200, 3)).toBeGreaterThan(encodeTie(1200, 9));
  expect(encodeTie(1250, 999)).toBeGreaterThan(encodeTie(1200, 0));
  expect(decodeTie(encodeTie(1250, 42))).toEqual({ score: 1250, at: 42 });
  const s = played(250);
  const byComposite = Object.entries(s.all)
    .map(([id, e]) => ({ id, c: encodeTie(e.score, e.at) }))
    .sort((a, b) => b.c - a.c)
    .map((x) => x.id);
  expect(byComposite).toEqual(rankBoard(s.all, "first").map((r) => r.id));
  expect(
    Object.entries(s.all)
      .map(([id, e]) => ({ id, ...e }))
      .sort(byScoreThenTime)
      .map((e) => e.id),
  ).toEqual(byComposite);
});

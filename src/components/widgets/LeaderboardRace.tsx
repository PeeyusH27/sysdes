"use client";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarClock } from "lucide-react";
import { hash32, mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- ranking (pure, tested)
export type TieRule = "shared" | "dense" | "first";
export type BoardId = "all" | "daily";
/** `at` is when the player reached this score (an event sequence number: smaller = earlier). */
export interface Entry {
  score: number;
  at: number;
}
export type Board = Record<string, Entry>;
export interface Ranked extends Entry {
  id: string;
}
export interface Row extends Ranked {
  /** 0-based position in the board (what ZREVRANK returns). */
  pos: number;
  /** The rank shown under the current tie rule. */
  rank: number;
  tied: boolean;
}

export const ME = "you";
export const NAMES: Record<string, string> = {
  maya: "Maya", leo: "Leo", aarav: "Aarav", zoe: "Zoe", kenji: "Kenji", priya: "Priya", omar: "Omar", lena: "Lena",
  diego: "Diego", sofia: "Sofia", ravi: "Ravi", hana: "Hana", ivan: "Ivan", noor: "Noor", eli: "Eli", mei: "Mei",
  tariq: "Tariq", ana: "Ana", yuki: "Yuki", felix: "Felix", zara: "Zara", kofi: "Kofi", sara: "Sara", arjun: "Arjun",
  nia: "Nia", theo: "Theo", mila: "Mila", ola: "Ola", emma: "Emma", you: "You",
};
export const PLAYER_IDS = Object.keys(NAMES);
export const SEED = 2026;
export const TOP_N = 10;

/** Highest score first; among equals, whoever reached it first. The order a composite score gives in Redis. */
export const byScoreThenTime = (a: Ranked, b: Ranked) => b.score - a.score || a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const entriesOf = (board: Board): Ranked[] => Object.entries(board).map(([id, e]) => ({ id, score: e.score, at: e.at }));

/** Sorted rows with ranks: shared "1224" (1 + strictly higher), dense "1223" (1 + distinct higher scores), or first to reach "1234". */
export function rankBoard(board: Board, rule: TieRule): Row[] {
  const list = entriesOf(board).sort(byScoreThenTime);
  const count = new Map<number, number>();
  for (const e of list) count.set(e.score, (count.get(e.score) ?? 0) + 1);
  let shared = 0;
  let dense = 0;
  return list.map((e, i) => {
    if (i === 0 || e.score !== list[i - 1].score) {
      shared = i + 1;
      dense++;
    }
    return { ...e, pos: i, rank: rule === "first" ? i + 1 : rule === "shared" ? shared : dense, tied: (count.get(e.score) ?? 0) > 1 };
  });
}

export const topK = (rows: Row[], k: number) => rows.slice(0, k);

/** 2 × radius + 1 rows around `id`; at either end the window slides instead of shrinking. */
export function aroundMe(rows: Row[], id: string, radius: number): Row[] {
  const pos = rows.findIndex((r) => r.id === id);
  if (pos < 0) return [];
  const size = 2 * radius + 1;
  const start = Math.max(0, Math.min(pos - radius, rows.length - size));
  return rows.slice(start, start + size);
}

export const shardOf = (id: string, shards: number) => (shards <= 1 ? 0 : hash32(id) % shards);

export function splitShards(board: Board, shards: number): Board[] {
  const out: Board[] = Array.from({ length: shards }, () => ({}));
  for (const [id, e] of Object.entries(board)) out[shardOf(id, shards)][id] = e;
  return out;
}

/** Each shard's own top k (ZREVRANGE 0 k-1), merged: the best k overall. */
export const mergeTopK = (lists: Ranked[][], k: number): Ranked[] => lists.flat().sort(byScoreThenTime).slice(0, k);

/**
 * My global rank from per-shard answers only. Shared and first-to-reach ranks are 1 + a sum of per-shard
 * counts (ZCOUNT on the score, or on the composite score). Dense ranks are not a sum: one score can sit on
 * several shards, so they need the union of distinct higher scores.
 */
export function shardRank(board: Board, id: string, shards: number, rule: TieRule): { rank: number; perShard: number[] } | null {
  const mine = board[id];
  if (!mine) return null;
  const me: Ranked = { id, ...mine };
  const parts = splitShards(board, shards).map(entriesOf);
  if (rule === "dense") {
    const sets = parts.map((p) => new Set(p.filter((e) => e.score > me.score).map((e) => e.score)));
    return { rank: 1 + new Set(sets.flatMap((s) => [...s])).size, perShard: sets.map((s) => s.size) };
  }
  const above = (e: Ranked) => (rule === "first" ? byScoreThenTime(e, me) < 0 : e.score > me.score);
  const perShard = parts.map((p) => p.filter(above).length);
  return { rank: 1 + perShard.reduce((a, b) => a + b, 0), perShard };
}

/** Composite score for "first to reach wins": points in the high bits, earliness in the low bits. */
export const AT_BITS = 20;
const AT_SPAN = 2 ** AT_BITS;
export const encodeTie = (score: number, at: number) => score * AT_SPAN + (AT_SPAN - 1 - at);
export function decodeTie(c: number): Entry {
  const score = Math.floor(c / AT_SPAN);
  return { score, at: AT_SPAN - 1 - (c - score * AT_SPAN) };
}

// ---------------------------------------------------------------- simulation (pure, tested)
export interface ScoreEvent {
  pid: string;
  points: number;
}
export interface Flash {
  pid: string;
  board: BoardId;
  /** Ranks gained (positive) or lost (negative). */
  delta: number;
  isNew: boolean;
  seq: number;
  until: number;
}
export interface FloatTag {
  seq: number;
  pid: string;
  points: number;
  born: number;
}
export type LogLine =
  | { seq: number; kind: "score"; pid: string; points: number; all: number; daily: number; day: number }
  | { seq: number; kind: "rollover"; day: number };
export interface LastEvent {
  seq: number;
  pid: string;
  points: number;
  prevAll: Entry | null;
  prevDaily: Entry | null;
}
export interface Sim {
  t: number;
  acc: number;
  /** Next event number; also the "time" a score is reached, for first-to-reach ties. */
  seq: number;
  day: number;
  all: Board;
  daily: Board;
  floats: FloatTag[];
  flashes: Flash[];
  log: LogLine[];
  last: LastEvent | null;
  rolledAt: number | null;
}

export const FLOAT_MS = 1000;
export const FLASH_MS = 1400;
const LOG_N = 4;

/** 30 players, scores in multiples of 50 so ties are common. You start mid-table. */
export function initSim(): Sim {
  const r = mulberry32(SEED);
  const all: Board = {};
  const daily: Board = {};
  PLAYER_IDS.forEach((id, i) => {
    const at = (i * 7) % PLAYER_IDS.length; // a fixed "who got there first" order for the starting ties
    all[id] = { score: id === ME ? 700 : 50 * (6 + Math.floor(r() * 22)), at };
    if (id !== ME && r() < 0.7) daily[id] = { score: 50 * (1 + Math.floor(r() * 6)), at };
  });
  return { t: 0, acc: 0, seq: PLAYER_IDS.length, day: 0, all, daily, floats: [], flashes: [], log: [], last: null, rolledAt: null };
}

/** The match stream: event n is always the same player and points (seeded), whatever the timing. */
export function eventFor(seq: number): ScoreEvent {
  const r = mulberry32(SEED ^ Math.imul(seq + 1, 0x9e3779b1));
  const pid = PLAYER_IDS[Math.floor(r() * PLAYER_IDS.length)];
  const u = r();
  return { pid, points: u < 0.55 ? 50 : u < 0.9 ? 100 : 150 };
}

/** One score event: ZINCRBY on the all-time and today's board, with rank-change flashes under `rule`. */
export function applyEvent(s: Sim, ev: ScoreEvent, rule: TieRule): Sim {
  const seq = s.seq;
  const prevAll = s.all[ev.pid] ?? null;
  const prevDaily = s.daily[ev.pid] ?? null;
  const all: Board = { ...s.all, [ev.pid]: { score: (prevAll?.score ?? 0) + ev.points, at: seq } };
  const daily: Board = { ...s.daily, [ev.pid]: { score: (prevDaily?.score ?? 0) + ev.points, at: seq } };
  const fresh: Flash[] = [];
  const boards: [BoardId, Board, Board][] = [
    ["all", s.all, all],
    ["daily", s.daily, daily],
  ];
  for (const [board, before, after] of boards) {
    const was = new Map(rankBoard(before, rule).map((r) => [r.id, r.rank]));
    for (const r of rankBoard(after, rule)) {
      const old = was.get(r.id);
      if (old === undefined) fresh.push({ pid: r.id, board, delta: 0, isNew: true, seq, until: s.t + FLASH_MS });
      else if (old !== r.rank) fresh.push({ pid: r.id, board, delta: old - r.rank, isNew: false, seq, until: s.t + FLASH_MS });
    }
  }
  const replaced = new Set(fresh.map((f) => `${f.board}:${f.pid}`));
  return {
    ...s,
    seq: seq + 1,
    all,
    daily,
    flashes: [...s.flashes.filter((f) => !replaced.has(`${f.board}:${f.pid}`)), ...fresh],
    floats: [...s.floats, { seq, pid: ev.pid, points: ev.points, born: s.t }],
    log: [...s.log, { seq, kind: "score" as const, pid: ev.pid, points: ev.points, all: all[ev.pid].score, daily: daily[ev.pid].score, day: s.day }].slice(-LOG_N),
    last: { seq, pid: ev.pid, points: ev.points, prevAll, prevDaily },
    rolledAt: s.rolledAt,
  };
}

function prune(s: Sim): Sim {
  const floats = s.floats.filter((f) => s.t - f.born < FLOAT_MS);
  const flashes = s.flashes.filter((f) => f.until > s.t);
  return floats.length === s.floats.length && flashes.length === s.flashes.length ? s : { ...s, floats, flashes };
}

/** Advance `dt` ms at `eps` events per second. */
export function stepSim(s: Sim, dt: number, eps: number, rule: TieRule): Sim {
  const every = 1000 / eps;
  let n: Sim = { ...s, t: s.t + dt, acc: s.acc + dt };
  while (n.acc >= every) n = applyEvent({ ...n, acc: n.acc - every }, eventFor(n.seq), rule);
  return prune(n);
}

/** Jump straight to the next event (the Step button). */
export function nextEvent(s: Sim, eps: number, rule: TieRule): Sim {
  const wait = Math.max(0, 1000 / eps - s.acc);
  return prune(applyEvent({ ...s, t: s.t + wait, acc: 0 }, eventFor(s.seq), rule));
}

/** Midnight: writes move to a new daily key, which starts empty. The all-time board keeps every point. */
export function rollover(s: Sim): Sim {
  return {
    ...s,
    day: s.day + 1,
    daily: {},
    flashes: s.flashes.filter((f) => f.board !== "daily"),
    last: null,
    rolledAt: s.seq,
    log: [...s.log, { seq: s.seq, kind: "rollover" as const, day: s.day + 1 }].slice(-LOG_N),
  };
}

export const dayLabel = (day: number) => new Date(Date.UTC(2026, 9, 13 + day)).toISOString().slice(0, 10);
export function keyFor(board: BoardId, day: number, shards: number, pid?: string) {
  const base = board === "all" ? "lb:all" : `lb:daily:${dayLabel(day)}`;
  return shards > 1 && pid !== undefined ? `${base}:s${shardOf(pid, shards)}` : base;
}

// ---------------------------------------------------------------- picture
const W = 360;
const ROW_H = 28;
const TOP_Y = 22;
const SEP_Y = TOP_Y + TOP_N * ROW_H + 8;
const AROUND_Y = SEP_Y + 30;
const H = AROUND_Y + 5 * ROW_H + 6;
const BAR_X = 122;
const BAR_W = 150;
const MAX_W = 460;
const SHARD_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const name = (id: string) => NAMES[id] ?? id;

function BarRow({ row, y, max, shards, flash, float, t, reduce }: { row: Row; y: number; max: number; shards: number; flash?: Flash; float?: FloatTag; t: number; reduce: boolean }) {
  const isMe = row.id === ME;
  const w = Math.max(3, (row.score / max) * BAR_W);
  const shard = shardOf(row.id, shards);
  const color = shards > 1 ? SHARD_COLORS[shard] : "var(--series-1)";
  const age = float ? t - float.born : 0;
  return (
    <m.g
      initial={reduce ? false : { y: y + 16, opacity: 0 }}
      animate={{ y, opacity: 1 }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
    >
      {isMe && <rect x={1} y={1} width={W - 2} height={ROW_H - 2} rx={7} fill="var(--card-2)" stroke="var(--accent)" strokeWidth={1.6} />}
      {flash && !reduce && (
        <m.rect key={flash.seq} x={1} y={1} width={W - 2} height={ROW_H - 2} rx={7} fill={flash.delta < 0 ? "var(--critical)" : "var(--good)"} initial={{ opacity: 0.26 }} animate={{ opacity: 0 }} transition={{ duration: FLASH_MS / 1000, ease: "easeOut" }} />
      )}
      <text x={14} y={18.5} textAnchor="middle" style={{ fontSize: 13.5, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
        {row.rank}
      </text>
      {flash && (
        <text x={38} y={18} textAnchor="middle" style={{ fontSize: 11, fontWeight: 750, fill: flash.isNew ? "var(--accent)" : flash.delta > 0 ? "var(--good-ink)" : "var(--critical-ink)" }}>
          {flash.isNew ? "new" : flash.delta > 0 ? `▲${flash.delta}` : `▼${-flash.delta}`}
        </text>
      )}
      <text x={54} y={18.5} style={{ fontSize: 13.5, fontWeight: isMe ? 800 : 550 }}>
        {name(row.id)}
      </text>
      {shards > 1 && (
        <g>
          <rect x={100} y={9} width={9} height={10} rx={2} fill={color} />
          <text x={114} y={18} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5, fontWeight: 700 }}>
            {shard}
          </text>
        </g>
      )}
      <rect x={BAR_X} y={7} width={BAR_W} height={14} rx={4} fill="var(--border)" opacity={0.4} />
      <m.rect x={BAR_X} y={7} height={14} rx={4} fill={color} initial={false} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }} />
      {row.tied && (
        <text x={BAR_X + BAR_W + 4} y={18} style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--warning-ink)" }}>
          tie
        </text>
      )}
      <text x={W - 5} y={18.5} textAnchor="end" style={{ fontSize: 13.5, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
        {fmt(row.score)}
      </text>
      {float && (
        <m.g initial={false} animate={{ x: BAR_X + w - 4, y: reduce ? 3 : 3 - (age / FLOAT_MS) * 14, opacity: reduce ? 1 : Math.max(0, 1 - age / FLOAT_MS) }} transition={{ duration: reduce ? 0 : 0.06, ease: "linear" }}>
          <text textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 800, fill: "var(--good-ink)" }}>
            +{float.points}
          </text>
        </m.g>
      )}
    </m.g>
  );
}

function ShardPanel({ board, rows, shards, rule, reduce }: { board: Board; rows: Row[]; shards: number; rule: TieRule; reduce: boolean }) {
  const K = 5;
  const parts = splitShards(board, shards).map((b) => entriesOf(b).sort(byScoreThenTime));
  const lists = parts.map((p) => p.slice(0, K));
  const merged = mergeTopK(lists, K);
  const rankOf = new Map(rows.map((r) => [r.id, r.rank]));
  const colX = (s: number) => 2 + s * 119;
  const rowY = (i: number) => 48 + i * 24;
  const label = `Three shards each return their top ${K}; merged, the global top ${K} is ${merged.map((e) => `${name(e.id)} ${fmt(e.score)}`).join(", ")}.`;
  return (
    <svg viewBox={`0 0 ${W} 336`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: MAX_W, margin: "6px auto 0" }}>
      <text x={W / 2} y={13} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5 }}>
        Each shard: ZREVRANGE 0 {K - 1} · the merge keeps the best {K}
      </text>
      {lists.map((list, s) => (
        <g key={s}>
          <rect x={colX(s)} y={20} width={116} height={152} rx={10} fill="var(--card-2)" stroke="var(--border)" />
          <rect x={colX(s) + 7} y={29} width={10} height={10} rx={2} fill={SHARD_COLORS[s]} />
          <text x={colX(s) + 22} y={38} style={{ fontSize: 12, fontWeight: 700 }}>
            Shard {s} ({parts[s].length})
          </text>
          {list.map((e, i) => (
            <m.g key={e.id} initial={false} animate={{ x: colX(s) + 5, y: rowY(i) }} transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}>
              <rect width={106} height={20} rx={5} fill="var(--card)" stroke={SHARD_COLORS[s]} strokeWidth={e.id === ME ? 2.4 : 1.2} />
              <text x={6} y={14} style={{ fontSize: 12, fontWeight: e.id === ME ? 800 : 550 }}>
                {name(e.id)}
              </text>
              <text x={101} y={14} textAnchor="end" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                {fmt(e.score)}
              </text>
            </m.g>
          ))}
        </g>
      ))}
      {lists.map((_, s) => (
        <line key={s} x1={colX(s) + 58} y1={176} x2={W / 2} y2={194} stroke={SHARD_COLORS[s]} strokeWidth={1.6} strokeDasharray="3 3" />
      ))}
      <text x={W / 2} y={208} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 750 }}>
        ▼ Global top {K} ({rule === "first" ? "unique ranks" : rule === "shared" ? "shared ranks" : "dense ranks"})
      </text>
      <AnimatePresence>
        {merged.map((e, i) => {
          const s = shardOf(e.id, shards);
          const from = lists[s].findIndex((x) => x.id === e.id);
          return (
            <m.g
              key={e.id}
              initial={reduce ? false : { x: colX(s) + 5, y: rowY(Math.max(0, from)), opacity: 0.4 }}
              animate={{ x: 80, y: 216 + i * 24, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
              transition={{ duration: reduce ? 0 : 0.6, ease: "easeInOut" }}
            >
              <rect width={200} height={20} rx={5} fill="var(--card)" stroke={SHARD_COLORS[s]} strokeWidth={e.id === ME ? 2.4 : 1.4} />
              <rect width={6} height={20} rx={2} fill={SHARD_COLORS[s]} />
              <text x={14} y={14} style={{ fontSize: 12, fontWeight: 750 }}>
                #{rankOf.get(e.id)}
              </text>
              <text x={44} y={14} style={{ fontSize: 12, fontWeight: e.id === ME ? 800 : 550 }}>
                {name(e.id)}
              </text>
              <text x={150} y={14} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
                shard {s}
              </text>
              <text x={194} y={14} textAnchor="end" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                {fmt(e.score)}
              </text>
            </m.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

const RULE_WORD: Record<TieRule, string> = { shared: "shared", dense: "dense", first: "first-to-reach" };

function writeLine(l: LogLine, view: BoardId, shards: number, rule: TieRule) {
  if (l.kind === "rollover") return `— new day: writes now go to lb:daily:${dayLabel(l.day)} —`;
  const key = keyFor(view, l.day, shards, l.pid);
  const total = view === "all" ? l.all : l.daily;
  return rule === "first" ? `ZADD ${key} enc(${total}, t${l.seq}) "${l.pid}"` : `ZINCRBY ${key} ${l.points} "${l.pid}" → ${total}`;
}

function readLine(me: Row | undefined, board: Board, view: BoardId, day: number, shards: number, rule: TieRule) {
  const key = keyFor(view, day, 1);
  if (!me) return `ZSCORE ${keyFor(view, day, shards, ME)} "you" → (nil)`;
  if (shards === 1) {
    if (rule === "shared") return `ZCOUNT ${key} (${me.score} +inf → ${me.rank - 1}`;
    if (rule === "dense") return `ZCOUNT ${key}:scores (${me.score} +inf → ${me.rank - 1}  (a set of distinct scores)`;
    return `ZREVRANK ${key} "you" → ${me.pos}  (0-based, composite score)`;
  }
  const sr = shardRank(board, ME, shards, rule)!;
  if (rule === "dense") return `distinct scores above you on ${shards} shards → ${sr.rank - 1}  (a union, not a sum)`;
  const bound = rule === "first" ? `enc(${me.score}, t${me.at})` : String(me.score);
  return `ZCOUNT ×${shards} shards (${bound} +inf → ${sr.perShard.join(" + ")} = ${sr.rank - 1}`;
}

function listNames(ids: string[]) {
  const n = ids.map(name);
  return n.length <= 2 ? n.join(" and ") : `${n.slice(0, 2).join(", ")} and ${n.length - 2} more`;
}

function describe(s: Sim, rows: Row[], board: Board, view: BoardId, shards: number, rule: TieRule) {
  const me = rows.find((r) => r.id === ME);
  let why = "";
  if (me && shards > 1) {
    const sr = shardRank(board, ME, shards, rule)!;
    why = rule === "dense" ? `${plural(sr.rank - 1, "distinct higher score", "distinct higher scores")} across ${shards} shards: a union, not a sum` : `Σ above you across ${shards} shards = ${sr.perShard.join(" + ")} = ${sr.rank - 1}`;
  } else if (me) why = rule === "dense" ? plural(me.rank - 1, "distinct higher score", "distinct higher scores") : `${plural(me.rank - 1, "player", "players")} above you`;
  const you = me ? `you are #${me.rank} (${why})` : "you haven't scored today";
  if (s.rolledAt === s.seq) return `New day: writes now go to lb:daily:${dayLabel(s.day)}, which starts empty, while lb:all keeps every point. Yesterday's key lives on until its TTL, for late results and prizes.`;
  const last = s.last;
  if (!last) return `Press Run (or Step) to stream match results, or +100 to me. On ${keyFor(view, s.day, 1)}, ${you}.`;
  const prev = view === "all" ? last.prevAll : last.prevDaily;
  const before: Board = { ...board };
  if (prev) before[last.pid] = prev;
  else delete before[last.pid];
  const from = rankBoard(before, rule).find((r) => r.id === last.pid)?.rank;
  const row = rows.find((r) => r.id === last.pid);
  if (!row) return `On ${keyFor(view, s.day, 1)}, ${you}.`;
  const mine = last.pid === ME;
  const verb = (v: string) => (mine ? v : `${v}s`);
  const move = from === undefined ? `${verb("enter")} today's board at #${row.rank}` : from > row.rank ? `${verb("move")} from #${from} to #${row.rank}` : `${verb("stay")} #${row.rank}`;
  const tiedWith = rows.filter((r) => r.score === row.score && r.id !== row.id).map((r) => r.id);
  let tie = "";
  if (tiedWith.length) tie = rule === "first" ? `, level on points with ${listNames(tiedWith)}, who got there first` : `, tied with ${listNames(tiedWith)} (${RULE_WORD[rule]} rank #${row.rank})`;
  const head = `${mine ? "You" : name(last.pid)} +${last.points} → ${fmt(row.score)}, ${move}${tie}`;
  return mine ? `${head} (${why}).` : `${head}; ${you}.`;
}

// ---------------------------------------------------------------- widget
export function LeaderboardRace() {
  const [rule, setRule] = useState<TieRule>("shared");
  const [view, setView] = useState<BoardId>("all");
  const [shards, setShards] = useState(1);
  const [eps, setEps] = useState(3);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();

  const step = useCallback((s: Sim, dt: number) => stepSim(s, dt, eps, rule), [eps, rule]);
  const [state, reset] = useFixedStep<Sim>(initSim, step, running && inView && !reduce);

  const board = view === "all" ? state.all : state.daily;
  const rows = useMemo(() => rankBoard(board, rule), [board, rule]);
  const top = topK(rows, TOP_N);
  const me = rows.find((r) => r.id === ME);
  const around = me && me.pos >= TOP_N ? aroundMe(rows, ME, 2) : [];
  const max = Math.max(50, rows[0]?.score ?? 50);
  const latest = state.seq - 1;
  const flashOf = (id: string) => state.flashes.find((f) => f.pid === id && f.board === view && (reduce ? f.seq === latest : f.until > state.t));
  const floatOf = (id: string) => state.floats.filter((f) => f.pid === id && (!reduce || f.seq === latest)).at(-1);
  const key = keyFor(view, state.day, 1);

  const sentence = describe(state, rows, board, view, shards, rule);
  const said = useThrottled(sentence, 900);

  const label = `${view === "all" ? "All-time" : "Today's"} leaderboard, ${RULE_WORD[rule]} ranks. ${
    top.length ? top.slice(0, 3).map((r) => `#${r.rank} ${name(r.id)} ${fmt(r.score)}`).join(", ") : "No scores yet"
  }. ${me ? `You are #${me.rank} with ${fmt(me.score)}.` : "You have no score on this board."}`;

  const rowProps = (r: Row) => ({ row: r, max, shards, flash: flashOf(r.id), float: floatOf(r.id), t: state.t, reduce });

  let aroundTitle = "";
  if (!me) aroundTitle = "You haven't scored today: ZREVRANK returns nil.";
  else if (me.pos < TOP_N) aroundTitle = `You're #${me.rank}, inside the top ${TOP_N}: no extra query.`;
  const aroundHint = !me ? "Press +100 to me to join today's board." : me.pos < TOP_N ? "Outside it: ZREVRANK, then ZREVRANGE ±2." : "";
  const aroundStart = around[0]?.pos ?? 0;

  const lines = [...state.log].reverse();

  return (
    <WidgetFrame
      title="Leaderboard race"
      sub="A live match stream feeding Redis sorted sets. Watch ranks change, change how ties are numbered, roll over the daily board, and split the board across shards."
    >
      <div className="controls">
        <SimButtons
          running={running && !reduce}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(nextEvent(state, eps, rule))}
          stepHint="Apply the next match result"
          onReset={() => reset(initSim())}
        />
        <Slider label="Events per second" value={eps} min={1} max={10} onChange={setEps} />
        <button type="button" className="wbtn primary" onClick={() => reset(applyEvent(state, { pid: ME, points: 100 }, rule))}>
          +100 to me
        </button>
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <Seg<TieRule>
          label="Ties"
          value={rule}
          onChange={setRule}
          options={[
            { value: "shared", label: "Shared rank 1224" },
            { value: "dense", label: "Dense 1223" },
            { value: "first", label: "First to reach wins" },
          ]}
        />
        <Seg<BoardId>
          label="Board"
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "All-time" },
            { value: "daily", label: "Today" },
          ]}
        />
        {view === "daily" && (
          <button type="button" className="wbtn" onClick={() => reset(rollover(state))} title="Start a new day: the daily board resets">
            <CalendarClock size={14} aria-hidden /> New day
          </button>
        )}
        <Seg<number>
          label="Shards"
          value={shards}
          onChange={setShards}
          options={[
            { value: 1, label: "1" },
            { value: 3, label: "3" },
          ]}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: MAX_W, margin: "0 auto" }}>
          <text x={14} y={12} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
            #
          </text>
          <text x={54} y={12} className="muted-text" style={{ fontSize: 11 }}>
            Player
          </text>
          <text x={BAR_X} y={12} className="muted-text" style={{ fontSize: 11 }}>
            {key}
            {shards > 1 ? ` (×${shards} shards)` : ""}
          </text>
          <text x={W - 5} y={12} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>
            Score
          </text>
          <g transform={`translate(0 ${TOP_Y})`}>
            <AnimatePresence initial={false}>
              {top.map((r, i) => (
                <BarRow key={r.id} y={i * ROW_H} {...rowProps(r)} />
              ))}
            </AnimatePresence>
          </g>
          {top.length === 0 && (
            <text x={W / 2} y={TOP_Y + 80} textAnchor="middle" className="muted-text">
              No scores yet: the first ZINCRBY creates the key.
            </text>
          )}
          <line x1={4} x2={W - 4} y1={SEP_Y} y2={SEP_Y} stroke="var(--border-strong)" strokeDasharray="4 4" />
          <text x={6} y={SEP_Y + 19} style={{ fontSize: 12.5, fontWeight: 750 }}>
            Around me
          </text>
          <text x={W - 5} y={SEP_Y + 19} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            {around.length ? `ZREVRANGE ${key} ${aroundStart} ${aroundStart + around.length - 1}` : "pinned below the top 10"}
          </text>
          {aroundTitle && (
            <text x={W / 2} y={AROUND_Y + 2 * ROW_H} textAnchor="middle" className="muted-text" style={{ fontSize: 12 }}>
              {aroundTitle}
            </text>
          )}
          {aroundHint && (
            <text x={W / 2} y={AROUND_Y + 2 * ROW_H + 20} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
              {aroundHint}
            </text>
          )}
          <g transform={`translate(0 ${AROUND_Y})`}>
            <AnimatePresence initial={false}>
              {around.map((r, i) => (
                <BarRow key={`am-${r.id}`} y={i * ROW_H} {...rowProps(r)} />
              ))}
            </AnimatePresence>
          </g>
        </svg>

        {shards > 1 && <ShardPanel board={board} rows={rows} shards={shards} rule={rule} reduce={reduce} />}
        {shards > 1 && (
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
            {(() => {
              const sr = shardRank(board, ME, shards, rule);
              if (!sr || !me) return "You have no score on this board, so there's nothing to count.";
              if (rule === "dense")
                return `You live on shard ${shardOf(ME, shards)}. Distinct higher scores per shard: ${sr.perShard.join(", ")}, but the same score can sit on several shards, so the global count is the union (${sr.rank - 1}), not the sum: #${sr.rank}.`;
              return `You live on shard ${shardOf(ME, shards)}. My global rank = 1 + Σ ZCOUNT above me = 1 + (${sr.perShard.join(" + ")}) = ${sr.rank}.`;
            })()}
          </p>
        )}

        <div
          role="group"
          aria-label="Redis commands for the latest events"
          style={{ marginTop: 10, padding: "6px 10px", background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, display: "grid", gap: 2, overflowWrap: "anywhere" }}
        >
          <span className="muted" style={{ fontSize: 11 }}>
            Redis commands (newest first, every event is also written to the other board)
          </span>
          {lines.length === 0 && <span className="muted">No events yet.</span>}
          {lines.map((l) => (
            <m.span key={`${l.kind}-${l.seq}`} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
              {writeLine(l, view, shards, rule)}
            </m.span>
          ))}
          <span style={{ color: "var(--accent)" }}>read: {readLine(me, board, view, state.day, shards, rule)}</span>
        </div>
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step applies one match result at a time." />
      </p>
    </WidgetFrame>
  );
}

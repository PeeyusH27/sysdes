"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarClock } from "lucide-react";
import { hash32, mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

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
/** Rows shown at the top of the board; the "around me" window covers everyone below them. */
const SHOW_TOP = 6;
const ROW_H = 26;
const HEAD_Y = 22;
const SHARD_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const name = (id: string) => NAMES[id] ?? id;

/** One board column: its width, and where the score bar sits in it. */
interface Col {
  w: number;
  barX: number;
  barW: number;
}
/** Landscape (desktop pane): top rows on the left, "around me" (±2) on the right. Stacked (phone): one column, ±1. */
const WIDE = { W: 640, col: { w: 312, barX: 122, barW: 118 } as Col, radius: 2 };
const TALL = { W: 360, col: { w: 360, barX: 122, barW: 150 } as Col, radius: 1 };
type Layout = typeof WIDE;

/** The widget's width in px (0 until measured), to pick the landscape or the stacked board. */
function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function BarRow({ col, row, y, max, shards, flash, float, t, reduce }: { col: Col; row: Row; y: number; max: number; shards: number; flash?: Flash; float?: FloatTag; t: number; reduce: boolean }) {
  const isMe = row.id === ME;
  const w = Math.max(3, (row.score / max) * col.barW);
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
      {isMe && <rect x={1} y={1} width={col.w - 2} height={ROW_H - 2} rx={7} fill="var(--card-2)" stroke="var(--accent)" strokeWidth={1.6} />}
      {flash && !reduce && (
        <m.rect key={flash.seq} x={1} y={1} width={col.w - 2} height={ROW_H - 2} rx={7} fill={flash.delta < 0 ? "var(--critical)" : "var(--good)"} initial={{ opacity: 0.26 }} animate={{ opacity: 0 }} transition={{ duration: FLASH_MS / 1000, ease: "easeOut" }} />
      )}
      <text x={14} y={18} textAnchor="middle" style={{ fontSize: 13.5, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
        {row.rank}
      </text>
      {flash && (
        <text x={38} y={17.5} textAnchor="middle" style={{ fontSize: 11, fontWeight: 750, fill: flash.isNew ? "var(--accent)" : flash.delta > 0 ? "var(--good-ink)" : "var(--critical-ink)" }}>
          {flash.isNew ? "new" : flash.delta > 0 ? `▲${flash.delta}` : `▼${-flash.delta}`}
        </text>
      )}
      <text x={54} y={18} style={{ fontSize: 13.5, fontWeight: isMe ? 800 : 550 }}>
        {name(row.id)}
      </text>
      {shards > 1 && (
        <g>
          <rect x={100} y={8} width={9} height={10} rx={2} fill={color} />
          <text x={114} y={17.5} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5, fontWeight: 700 }}>
            {shard}
          </text>
        </g>
      )}
      <rect x={col.barX} y={6} width={col.barW} height={14} rx={4} fill="var(--border)" opacity={0.4} />
      <m.rect x={col.barX} y={6} height={14} rx={4} fill={color} initial={false} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }} />
      {row.tied && (
        <text x={col.barX + col.barW + 4} y={17.5} style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--warning-ink)" }}>
          tie
        </text>
      )}
      <text x={col.w - 5} y={18} textAnchor="end" style={{ fontSize: 13.5, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
        {fmt(row.score)}
      </text>
      {float && (
        <m.g initial={false} animate={{ x: col.barX + w - 4, y: reduce ? 3 : 3 - (age / FLOAT_MS) * 14, opacity: reduce ? 1 : Math.max(0, 1 - age / FLOAT_MS) }} transition={{ duration: reduce ? 0 : 0.06, ease: "linear" }}>
          <text textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 800, fill: "var(--good-ink)" }}>
            +{float.points}
          </text>
        </m.g>
      )}
    </m.g>
  );
}

/**
 * Three shards each return their top K; the merge keeps the best K. Landscape: shard columns side by side with the
 * merged list on their right. Stacked: shard columns on top, the merged list under them.
 */
function ShardPanel({ L, board, rows, shards, rule, reduce, note }: { L: Layout; board: Board; rows: Row[]; shards: number; rule: TieRule; reduce: boolean; note: string }) {
  const K = 5;
  const wide = L === WIDE;
  const parts = splitShards(board, shards).map((b) => entriesOf(b).sort(byScoreThenTime));
  const lists = parts.map((p) => p.slice(0, K));
  const merged = mergeTopK(lists, K);
  const rankOf = new Map(rows.map((r) => [r.id, r.rank]));
  const RH = 19;
  const colW = wide ? 124 : 116;
  const colX = (s: number) => (wide ? s * 132 : 2 + s * 119);
  const top = 36;
  const rowY = (i: number) => top + 8 + i * RH;
  const colH = 8 + K * RH + 6;
  const mx = wide ? 418 : 70;
  const mw = wide ? L.W - 418 : 220;
  const mTop = wide ? top : top + colH + 30;
  const H = wide ? top + colH + 2 : mTop + 8 + K * RH + 8;
  const label = `Three shards each return their top ${K}; merged, the global top ${K} is ${merged.map((e) => `${name(e.id)} ${fmt(e.score)}`).join(", ")}. ${note}`;
  return (
    <svg viewBox={`0 0 ${L.W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 640 : 460, margin: "8px auto 0" }}>
      <text x={0} y={12} className="muted-text" style={{ fontSize: 11 }}>
        Each shard: ZREVRANGE 0 {K - 1}; the merge keeps the best {K}
      </text>
      <text x={wide ? L.W : 0} y={wide ? 12 : 28} textAnchor={wide ? "end" : "start"} style={{ fontSize: 11, fontWeight: 700, fill: "var(--accent)" }}>
        {note}
      </text>
      {lists.map((list, s) => (
        <g key={s}>
          <rect x={colX(s)} y={top - 16} width={colW} height={colH + 16} rx={9} fill="var(--card-2)" stroke="var(--border)" />
          <rect x={colX(s) + 7} y={top - 9} width={9} height={9} rx={2} fill={SHARD_COLORS[s]} />
          <text x={colX(s) + 21} y={top - 1} style={{ fontSize: 11.5, fontWeight: 700 }}>
            Shard {s} ({parts[s].length})
          </text>
          {list.map((e, i) => (
            <m.g key={e.id} initial={false} animate={{ x: colX(s) + 5, y: rowY(i) }} transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}>
              <rect width={colW - 10} height={RH - 3} rx={5} fill="var(--card)" stroke={SHARD_COLORS[s]} strokeWidth={e.id === ME ? 2.4 : 1.2} />
              <text x={6} y={12} style={{ fontSize: 11.5, fontWeight: e.id === ME ? 800 : 550 }}>
                {name(e.id)}
              </text>
              <text x={colW - 15} y={12} textAnchor="end" style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                {fmt(e.score)}
              </text>
            </m.g>
          ))}
        </g>
      ))}
      {wide ? (
        <text x={404} y={top + colH / 2} textAnchor="middle" className="muted-text" style={{ fontSize: 16 }}>
          ▶
        </text>
      ) : (
        lists.map((_, s) => <line key={s} x1={colX(s) + colW / 2} y1={top + colH + 2} x2={L.W / 2} y2={mTop - 14} stroke={SHARD_COLORS[s]} strokeWidth={1.6} strokeDasharray="3 3" />)
      )}
      <text x={mx + mw / 2} y={mTop - 1} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 750 }}>
        Global top {K} ({rule === "first" ? "unique ranks" : rule === "shared" ? "shared ranks" : "dense ranks"})
      </text>
      <AnimatePresence>
        {merged.map((e, i) => {
          const s = shardOf(e.id, shards);
          const from = lists[s].findIndex((x) => x.id === e.id);
          return (
            <m.g
              key={e.id}
              initial={reduce ? false : { x: colX(s) + 5, y: rowY(Math.max(0, from)), opacity: 0.4 }}
              animate={{ x: mx, y: mTop + 8 + i * RH, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
              transition={{ duration: reduce ? 0 : 0.6, ease: "easeInOut" }}
            >
              <rect width={mw} height={RH - 3} rx={5} fill="var(--card)" stroke={SHARD_COLORS[s]} strokeWidth={e.id === ME ? 2.4 : 1.4} />
              <rect width={6} height={RH - 3} rx={2} fill={SHARD_COLORS[s]} />
              <text x={13} y={12} style={{ fontSize: 11.5, fontWeight: 750 }}>
                #{rankOf.get(e.id)}
              </text>
              <text x={42} y={12} style={{ fontSize: 11.5, fontWeight: e.id === ME ? 800 : 550 }}>
                {name(e.id)}
              </text>
              <text x={mw - 52} y={12} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
                shard {s}
              </text>
              <text x={mw - 6} y={12} textAnchor="end" style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                {fmt(e.score)}
              </text>
            </m.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}

/** A segmented control with its label inline, so a toolbar row stays one button tall. */
function InlineSeg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="lb-seg">
      <span aria-hidden>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.lb-seg { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); min-width: 0; max-width: 100%; }
.lb-seg .seg { min-width: 0; flex: 0 1 auto; }
.lb-seg .seg button { padding: 4px 9px; }
.lb-read { margin: 6px 0 0; font: 12px/1.45 var(--font-mono); color: var(--accent); overflow-wrap: anywhere; }
.lb-log { display: grid; gap: 2px; font: 12px/1.45 var(--font-mono); overflow-wrap: anywhere; }
`;

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
  const width = useWidth(ref);
  const L: Layout = width && width < 500 ? TALL : WIDE;
  const wide = L === WIDE;

  const step = useCallback((s: Sim, dt: number) => stepSim(s, dt, eps, rule), [eps, rule]);
  const [state, reset] = useFixedStep<Sim>(initSim, step, running && inView && !reduce);

  const board = view === "all" ? state.all : state.daily;
  const rows = useMemo(() => rankBoard(board, rule), [board, rule]);
  const top = topK(rows, SHOW_TOP);
  const me = rows.find((r) => r.id === ME);
  const around = me && me.pos >= SHOW_TOP ? aroundMe(rows, ME, L.radius) : [];
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

  const rowProps = (r: Row) => ({ col: L.col, row: r, max, shards, flash: flashOf(r.id), float: floatOf(r.id), t: state.t, reduce });

  let aroundTitle = "";
  if (!me) aroundTitle = "You haven't scored today: ZREVRANK returns nil.";
  else if (me.pos < SHOW_TOP) aroundTitle = `You're #${me.rank}, inside the top ${SHOW_TOP}: no extra query.`;
  const aroundHint = !me ? "Press +100 to me to join today's board." : me.pos < SHOW_TOP ? `Below it: ZREVRANK, then ZREVRANGE ±${L.radius}.` : "";
  const aroundStart = around[0]?.pos ?? 0;

  // Landscape: the top rows on the left, "around me" on the right. Stacked: "around me" under the top rows.
  const topH = SHOW_TOP * ROW_H;
  const ax = wide ? L.W - L.col.w : 0;
  const ay = wide ? HEAD_Y : HEAD_Y + topH + 34;
  const H = wide ? HEAD_Y + topH + 4 : ay + (2 * L.radius + 1) * ROW_H + 4;
  const aroundHead = wide ? HEAD_Y - 10 : ay - 12;

  const shardNote = (() => {
    const sr = shardRank(board, ME, shards, rule);
    if (shards === 1) return "";
    if (!sr || !me) return "You have no score on this board.";
    if (rule === "dense") return `You: shard ${shardOf(ME, shards)}. Distinct scores above, union not sum: #${sr.rank}`;
    return `You: shard ${shardOf(ME, shards)}. Rank = 1 + (${sr.perShard.join(" + ")}) = ${sr.rank}`;
  })();

  const lines = [...state.log].reverse();

  return (
    <WidgetFrame title="Leaderboard race" sub="Match results stream into Redis sorted sets. Watch ranks move.">
      <style href="w-leaderboard-race" precedence="widgets">
        {CSS}
      </style>
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !reduce}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(nextEvent(state, eps, rule))}
          stepHint="Apply the next match result"
          onReset={() => reset(initSim())}
        />
        <button type="button" className="wbtn primary" onClick={() => reset(applyEvent(state, { pid: ME, points: 100 }, rule))}>
          +100 to me
        </button>
        <InlineSeg<number>
          label="Shards"
          value={shards}
          onChange={setShards}
          options={[
            { value: 1, label: "1" },
            { value: 3, label: "3" },
          ]}
        />
        {view === "daily" && (
          <button type="button" className="wbtn" onClick={() => reset(rollover(state))} title="Start a new day: the daily board resets">
            <CalendarClock size={14} aria-hidden /> New day
          </button>
        )}
      </div>
      <div className="controls" style={{ marginTop: 0, alignItems: "center" }}>
        <InlineSeg<TieRule>
          label="Ties"
          value={rule}
          onChange={setRule}
          options={[
            { value: "shared", label: "Shared 1224" },
            { value: "dense", label: "Dense 1223" },
            { value: "first", label: "First to reach" },
          ]}
        />
        <InlineSeg<BoardId>
          label="Board"
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "All-time" },
            { value: "daily", label: "Today" },
          ]}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 640 : 460, margin: "0 auto" }}>
          <text x={14} y={12} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
            #
          </text>
          <text x={54} y={12} className="muted-text" style={{ fontSize: 11 }}>
            Player
          </text>
          <text x={L.col.barX} y={12} className="muted-text" style={{ fontSize: 11 }}>
            {key}
            {shards > 1 ? ` ×${shards}` : ""}
          </text>
          <text x={L.col.w - 5} y={12} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>
            Score
          </text>
          <g transform={`translate(0 ${HEAD_Y})`}>
            <AnimatePresence initial={false}>
              {top.map((r, i) => (
                <BarRow key={r.id} y={i * ROW_H} {...rowProps(r)} />
              ))}
            </AnimatePresence>
          </g>
          {top.length === 0 && (
            <text x={L.col.w / 2} y={HEAD_Y + 60} textAnchor="middle" className="muted-text">
              No scores yet: the first ZINCRBY creates the key.
            </text>
          )}
          {wide ? (
            <line x1={L.col.w + 8} x2={L.col.w + 8} y1={4} y2={H - 4} stroke="var(--border-strong)" strokeDasharray="4 4" />
          ) : (
            <line x1={4} x2={L.W - 4} y1={HEAD_Y + topH + 6} y2={HEAD_Y + topH + 6} stroke="var(--border-strong)" strokeDasharray="4 4" />
          )}
          <text x={ax + 6} y={aroundHead} style={{ fontSize: 12.5, fontWeight: 750 }}>
            Around me
          </text>
          <text x={ax + L.col.w - 5} y={aroundHead} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            {around.length ? `ZREVRANGE ${key} ${aroundStart} ${aroundStart + around.length - 1}` : `below the top ${SHOW_TOP}`}
          </text>
          {aroundTitle && (
            <text x={ax + L.col.w / 2} y={ay + L.radius * ROW_H + 6} textAnchor="middle" className="muted-text" style={{ fontSize: 12 }}>
              {aroundTitle}
            </text>
          )}
          {aroundHint && (
            <text x={ax + L.col.w / 2} y={ay + L.radius * ROW_H + 25} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
              {aroundHint}
            </text>
          )}
          <g transform={`translate(${ax} ${ay})`}>
            <AnimatePresence initial={false}>
              {around.map((r, i) => (
                <BarRow key={`am-${r.id}`} y={i * ROW_H} {...rowProps(r)} />
              ))}
            </AnimatePresence>
          </g>
        </svg>

        {shards > 1 && wide && <ShardPanel L={L} board={board} rows={rows} shards={shards} rule={rule} reduce={reduce} note={shardNote} />}
        {shards === 1 && <p className="lb-read">read: {readLine(me, board, view, state.day, shards, rule)}</p>}
      </div>
      {shards > 1 && !wide && (
        <More label="Shard merge: each shard's top 5">
          <ShardPanel L={L} board={board} rows={rows} shards={shards} rule={rule} reduce={reduce} note={shardNote} />
        </More>
      )}

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step applies one match result at a time." />
      </p>
      <More label="Speed and Redis commands">
        <div className="controls">
          <Slider label="Events per second" value={eps} min={1} max={10} onChange={setEps} />
        </div>
        <div role="group" aria-label="Redis commands for the latest events" className="lb-log">
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
      </More>
    </WidgetFrame>
  );
}

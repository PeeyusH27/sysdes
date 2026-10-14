"use client";
import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Undo2 } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- pointer machine (pure, tested)
export type Var = "dummy" | "before" | "first" | "prev" | "curr" | "next";
export type Op = "save" | "flip" | "prev" | "curr" | "linkBefore" | "linkFirst";
export const MAX_CARS = 6;
export const OP_CODE: Record<Op, string> = {
  save: "next = curr.next",
  flip: "curr.next = prev",
  prev: "prev = curr",
  curr: "curr = next",
  linkBefore: "before.next = prev",
  linkFirst: "first.next = curr",
};

/** Node ids are car indexes; in "cars m to n" mode a dummy node sits in front with id = labels.length. */
export interface Machine {
  labels: string[];
  next: (number | null)[];
  /** The couplings before any move, to tell flipped arrows from original ones. */
  orig: (number | null)[];
  /** undefined = not assigned yet (the `const next` that doesn't exist until the first save). */
  vars: Partial<Record<Var, number | null>>;
  /** 0-based inclusive segment, or null for the whole train. */
  range: [number, number] | null;
  moves: number;
  /** The node whose link was written last. */
  last: number | null;
}

export function parseCars(text: string, max = MAX_CARS): string[] {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, max)
    .map((t) => t.slice(0, 3));
}

export function initMachine(labels: string[], range: [number, number] | null = null): Machine {
  const n = labels.length;
  const next = labels.map((_, i) => (i + 1 < n ? i + 1 : null));
  if (!range || n === 0) return { labels, next, orig: [...next], vars: { prev: null, curr: n ? 0 : null }, range: null, moves: 0, last: null };
  const l = Math.max(0, Math.min(range[0], n - 1));
  const r = Math.max(l, Math.min(range[1], n - 1));
  next.push(0); // dummy → car 0
  const before = l === 0 ? n : l - 1;
  return { labels, next, orig: [...next], vars: { dummy: n, before, first: l, prev: null, curr: l }, range: [l, r], moves: 0, last: null };
}

export function applyOp(mc: Machine, op: Op): { m: Machine; error?: string } {
  const v = mc.vars;
  const fail = (why: string) => ({ m: mc, error: `${OP_CODE[op]}: ${why}` });
  const set = (patch: Partial<Record<Var, number | null>>) => ({ m: { ...mc, vars: { ...v, ...patch }, moves: mc.moves + 1 } });
  const link = (from: Var, to: Var) => {
    const a = v[from];
    const b = v[to];
    if (a === undefined) return fail(`${from} doesn't exist in this mode.`);
    if (a === null) return fail(`${from} is null, and null has no .next.`);
    if (b === undefined) return fail(`${to} hasn't been set yet.`);
    const next = [...mc.next];
    next[a] = b;
    return { m: { ...mc, next, moves: mc.moves + 1, last: a } };
  };
  switch (op) {
    case "save":
      if (v.curr === null || v.curr === undefined) return fail("curr is null, so there is nothing left to save.");
      return set({ next: mc.next[v.curr] });
    case "flip":
      return link("curr", "prev");
    case "prev":
      return set({ prev: v.curr });
    case "curr":
      if (v.next === undefined) return fail("next hasn't been saved yet.");
      return set({ curr: v.next });
    case "linkBefore":
      return link("before", "prev");
    case "linkFirst":
      return link("first", "curr");
  }
}

/** Follows next from `start`; stops at null or at a node seen before (a cycle). */
export function readFrom(mc: Machine, start: number | null | undefined) {
  const ids: number[] = [];
  const seen = new Set<number>();
  let x = start;
  while (x !== null && x !== undefined) {
    if (seen.has(x)) return { ids, cycle: true };
    seen.add(x);
    ids.push(x);
    x = mc.next[x];
  }
  return { ids, cycle: false };
}

/** Cars no variable can reach any more: in a real program they are gone. */
export function lostCars(mc: Machine): number[] {
  const seen = new Set<number>();
  for (const id of Object.values(mc.vars)) for (const x of readFrom(mc, id).ids) seen.add(x);
  return mc.labels.map((_, i) => i).filter((i) => !seen.has(i));
}

export function expectedOrder(n: number, range: [number, number] | null): number[] {
  const ids = Array.from({ length: n }, (_, i) => i);
  if (!range) return ids.reverse();
  const [l, r] = range;
  return [...ids.slice(0, l), ...ids.slice(l, r + 1).reverse(), ...ids.slice(r + 1)];
}

/** The train read from its head: dummy.next for a segment, prev once curr has run off the end. */
export function result(mc: Machine) {
  if (mc.range) return readFrom(mc, mc.next[mc.labels.length]);
  return mc.vars.curr === null ? readFrom(mc, mc.vars.prev) : { ids: [] as number[], cycle: true };
}

export function isDone(mc: Machine) {
  const want = expectedOrder(mc.labels.length, mc.range);
  const got = result(mc);
  return !got.cycle && got.ids.length === want.length && got.ids.every((x, i) => x === want[i]);
}

/** The textbook sequence: save, flip, advance prev, advance curr, k times (then the two splice links). */
export function autoOps(n: number, range: [number, number] | null): Op[] {
  const k = range ? range[1] - range[0] + 1 : n;
  const ops: Op[] = [];
  for (let i = 0; i < k; i++) ops.push("save", "flip", "prev", "curr");
  if (range) ops.push("linkBefore", "linkFirst");
  return ops;
}

const VARS: Var[] = ["dummy", "before", "first", "prev", "curr", "next"];
export const sameState = (a: Machine, b: Machine) => a.next.every((x, i) => x === b.next[i]) && VARS.every((k) => a.vars[k] === b.vars[k]);

/** The next textbook move from here, or onPath = false when the reader's moves left the safe sequence. */
export function nextMove(mc: Machine): { op: Op | null; onPath: boolean } {
  const ops = autoOps(mc.labels.length, mc.range);
  let s = initMachine(mc.labels, mc.range);
  for (let i = 0; i <= ops.length; i++) {
    if (sameState(s, mc)) return { op: i < ops.length ? ops[i] : null, onPath: true };
    if (i < ops.length) s = applyOp(s, ops[i]).m;
  }
  return { op: null, onPath: false };
}

// ---------------------------------------------------------------- sentences
const carName = (mc: Machine, id: number | null | undefined) => (id === null || id === undefined ? "null" : id === mc.labels.length ? "the dummy" : `car ${mc.labels[id]}`);
const listNames = (mc: Machine, ids: number[]) => ids.map((i) => mc.labels[i]).join(", ");

export function describe(before: Machine, op: Op, after: Machine): string {
  const lost = lostCars(after);
  if (lost.length > lostCars(before).length)
    return `${OP_CODE[op]} cut the last link to car${lost.length > 1 ? "s" : ""} ${listNames(after, lost)}: nothing points there now, so ${lost.length > 1 ? "they are" : "it is"} lost. Undo, and save curr.next before you overwrite it.`;
  const v = after.vars;
  if (isDone(after)) return `Done in ${after.moves} moves: ${result(after).ids.map((i) => after.labels[i]).join(" → ")} → null. Extra memory: a few pointers, O(1). Copying into an array would need ${after.labels.length} slots.`;
  switch (op) {
    case "save":
      return `next = ${carName(after, v.next)}. The rest of the train is safe before anything is cut.`;
    case "flip":
      if (v.curr !== null && v.curr !== undefined && after.next[v.curr] === v.curr) return `${carName(after, v.curr)} now points at itself: prev moved before the flip. Undo.`;
      return `${carName(after, v.curr)} now points back at ${carName(after, v.prev)}.`;
    case "prev":
      return `prev moves to ${carName(after, v.prev)}: the reversed part starts there.`;
    case "curr":
      return v.curr === null ? "curr moves to the saved next, which is null: every coupling in reach is flipped." : `curr moves to the saved next, ${carName(after, v.curr)}.`;
    case "linkBefore":
      return `before.next = prev: ${carName(after, v.before)} now leads into the reversed part at ${carName(after, v.prev)}.`;
    case "linkFirst":
      return `first.next = curr: ${carName(after, v.first)}, now last in the segment, reconnects to ${carName(after, v.curr)}.`;
  }
}

// ---------------------------------------------------------------- widget
const STEP_MS = 850;
const VAR_COLOR: Record<Var, string> = {
  dummy: "var(--muted)",
  before: "var(--k-gateway)",
  first: "var(--k-cache)",
  prev: "var(--series-1)",
  curr: "var(--series-3)",
  next: "var(--series-2)",
};

/**
 * Geometry in train coordinates: u runs along the train, v across it. A desktop pane gets roomy cars; a phone gets
 * compact ones, so the whole train still fits across 360 px (landscape) instead of turning into a tall column.
 */
function geometry(compact: boolean) {
  const L = compact ? 36 : 46; // car length along the train
  const T = compact ? 28 : 32; // car thickness across it
  const PITCH = compact ? 52 : 76;
  const V0 = compact ? 46 : 50; // room for arcs and self-loops before the cars
  const GL = compact ? 28 : 42;
  const U0 = 6 + GL + 20;
  const P = (u: number, v: number): [number, number] => [u, v];
  const rect = (u: number, v: number, lu: number, lv: number) => ({ x: u, y: v, width: lu, height: lv });
  const path = (pts: [number, number][], cmd: string[]) => pts.map((p, i) => `${cmd[i]}${P(...p).join(" ")}`).join(" ");
  const ptrV = (row: number) => V0 + T + (compact ? 25 : 26) + row * (compact ? 14 : 15);
  return { compact, L, T, PITCH, V0, GL, U0, P, rect, path, ptrV, U: (slot: number) => U0 + slot * PITCH };
}

interface S {
  mc: Machine;
  past: Machine[];
  acc: number;
  msg: string;
}
const INTRO = "Each car points at the next one. Press the moves in the right order to reverse the train, or Step to watch the textbook move.";
const fresh = (labels: string[], range: [number, number] | null): S => ({ mc: initMachine(labels, range), past: [], acc: 0, msg: labels.length ? INTRO : "No cars: an empty list is already reversed (return prev, which is null)." });

function act(s: S, op: Op): S {
  const r = applyOp(s.mc, op);
  if (r.error) return { ...s, acc: 0, msg: r.error };
  return { mc: r.m, past: [...s.past.slice(-60), s.mc], acc: 0, msg: describe(s.mc, op, r.m) };
}
function tick(s: S, dt: number): S {
  if (s.acc + dt < STEP_MS) return { ...s, acc: s.acc + dt };
  const h = nextMove(s.mc);
  return h.op ? act(s, h.op) : { ...s, acc: 0 };
}

type Part = "all" | "range";
const rangeFor = (labels: string[], p: Part, l: number, h: number): [number, number] | null =>
  p === "range" && labels.length ? [Math.min(l, labels.length) - 1, Math.min(Math.max(l, h), labels.length) - 1] : null;

export function ListReversalLab() {
  const [text, setText] = useState("1 2 3 4 5");
  const [part, setPart] = useState<Part>("all");
  const [lo, setLo] = useState(2);
  const [hi, setHi] = useState(4);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const g = geometry(useNarrow(ref, 470));
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const freshFor = (o: { text?: string; part?: Part; lo?: number; hi?: number } = {}) => {
    const ls = parseCars(o.text ?? text);
    return fresh(ls, rangeFor(ls, o.part ?? part, o.lo ?? lo, o.hi ?? hi));
  };
  const [s, reset] = useFixedStep<S>(() => freshFor(), tick, running && inView && !reduce);
  const mc = s.mc;
  const done = isDone(mc);
  const hint = nextMove(mc);
  // Stop the loop once the train is reversed or the reader has left the textbook path.
  if (running && (done || !hint.onPath)) setRunning(false);
  const restart = (o: Parameters<typeof freshFor>[0] = {}) => {
    setRunning(false);
    reset(freshFor(o));
  };
  const said = useThrottled(s.msg, 700);

  // ---- layout
  const n = mc.labels.length;
  const D = n;
  const hasDummy = !!mc.range;
  const count = n + (hasDummy ? 1 : 0);
  const order = done ? result(mc).ids : null;
  const slotOf = (id: number) => (hasDummy && id === D ? 0 : (hasDummy ? 1 : 0) + (order ? order.indexOf(id) : id));
  const { L, T, V0, U, P, path, ptrV, compact } = g;
  const lost = new Set(lostCars(mc));
  const ids = [...mc.labels.keys(), ...(hasDummy ? [D] : [])];
  const fwd = V0 + (compact ? 9 : 11);
  const back = V0 + T - (compact ? 8 : 10);
  const arrows: { key: string; d: string; changed: boolean; hot: boolean; nul?: [number, number] }[] = [];
  for (const id of ids) {
    if (lost.has(id)) continue;
    const t = mc.next[id];
    const a = slotOf(id);
    const changed = t !== mc.orig[id];
    const hot = mc.last === id;
    if (t === null) {
      const ahead = !changed || a === count - 1;
      const v = ahead ? fwd : back;
      const u1 = ahead ? U(a) + L : U(a);
      const u2 = ahead ? u1 + 12 : u1 - 12;
      arrows.push({ key: `${id}>null:${a}:${ahead}`, d: path([[u1, v], [u2, v]], ["M", "L"]), changed, hot, nul: P(u2 + (ahead ? 8 : -8), v) });
      continue;
    }
    const b = slotOf(t);
    let d: string;
    if (b === a + 1) d = path([[U(a) + L, fwd], [U(b) - 3, fwd]], ["M", "L"]);
    else if (b === a - 1) d = path([[U(a), back], [U(b) + L + 3, back]], ["M", "L"]);
    else if (b === a) d = path([[U(a) + L - 8, V0], [U(a) + L + 14, V0 - 32], [U(a) - 14, V0 - 32], [U(a) + 8, V0 - 3]], ["M", "C", ",", ","]);
    else {
      const h = Math.min(44, 16 + Math.abs(b - a) * 8);
      const ua = U(a) + L / 2 + (b > a ? 5 : -5);
      const ub = U(b) + L / 2 + (b > a ? -5 : 5);
      d = path([[ua, V0], [ua, V0 - h], [ub, V0 - h], [ub, V0 - 3]], ["M", "C", ",", ","]);
    }
    arrows.push({ key: `${id}>${t}:${a}>${b}`, d, changed, hot });
  }
  const rowAt = new Map<number, number>();
  const ptrs = VARS.filter((k) => mc.vars[k] !== undefined).map((k) => {
    const t = mc.vars[k] as number | null;
    const slot = t === null ? -1 : slotOf(t);
    const stack = rowAt.get(slot) ?? 0;
    rowAt.set(slot, stack + 1);
    // Compact cars sit closer than a label is wide, so neighbouring cars put their labels on alternate rows.
    const row = stack + (compact ? (slot + 2) % 2 : 0);
    const u = slot === -1 ? 6 + g.GL / 2 : U(slot) + L / 2;
    const [x, y] = P(u, ptrV(row));
    return { k, x, y, row };
  });
  const uEnd = U(count - 1) + L + 30;
  const [W, H] = [uEnd, ptrV(Math.max(3, ...ptrs.map((p) => p.row + 1))) + 6];
  const seg = mc.range;
  const k = seg ? seg[1] - seg[0] + 1 : n;
  const flipped = mc.labels.filter((_, i) => (!seg || (i >= seg[0] && i <= seg[1])) && mc.next[i] !== mc.orig[i]).length;
  const tween = { duration: reduce ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] as const };
  const ops: Op[] = seg ? ["save", "flip", "prev", "curr", "linkBefore", "linkFirst"] : ["save", "flip", "prev", "curr"];
  const label = `Train of ${n} cars. Couplings: ${ids.map((id) => `${id === D && hasDummy ? "dummy" : mc.labels[id]} → ${mc.next[id] === null ? "null" : carName(mc, mc.next[id]).replace("car ", "")}`).join(", ") || "none"}. ${ptrs.map((p) => `${p.k} on ${carName(mc, mc.vars[p.k])}`).join(", ")}.${lost.size ? ` Lost: ${listNames(mc, [...lost])}.` : ""}`;
  const ghost = g.rect(6, V0 + 4, g.GL, T - 8);
  const gc = P(6 + g.GL / 2, V0 + T / 2);

  return (
    <WidgetFrame title="Flip the train" sub="Couplings are next pointers. Press the four moves in order, or cars derail.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !reduce}
          reduce={reduce}
          onToggle={() => {
            if (done || !hint.onPath) {
              reset(freshFor());
              setRunning(true);
            } else setRunning((r) => !r);
          }}
          onStep={() => {
            if (hint.op) reset(act(s, hint.op));
            else reset({ ...s, msg: done ? "Already reversed. Reset to play again." : "You're off the textbook path: Undo back to a good state, or Reset." });
          }}
          stepHint="Make the next textbook move"
          onReset={() => restart()}
        />
        <button type="button" className="wbtn" disabled={!s.past.length} onClick={() => s.past.length && reset({ ...s, mc: s.past[s.past.length - 1], past: s.past.slice(0, -1), acc: 0, msg: "Undone: back one move." })}>
          <Undo2 size={14} aria-hidden /> Undo
        </button>
        <Seg<Part> labelMode="hidden" compact
          label="Reverse"
          value={part}
          onChange={(v) => {
            setPart(v);
            restart({ part: v });
          }}
          options={[
            { value: "all", label: "Whole train" },
            { value: "range", label: "Cars m to n" },
          ]}
        />
      </div>
      <div className="controls" style={{ marginTop: 0, gap: 6 }} role="group" aria-label="Your pointer moves">
        {ops.map((op) => (
          <button key={op} type="button" className="wbtn" style={{ fontFamily: "var(--font-mono)", fontSize: compact ? 11.5 : 12.5, fontWeight: 600, padding: compact ? "0 8px" : "0 10px" }} onClick={() => reset(act(s, op))}>
            {OP_CODE[op]}
          </button>
        ))}
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: compact ? 520 : Math.min(680, Math.max(W, 560)), margin: "0 auto" }}>
          <defs>
            {(["m", "a"] as const).map((c) => (
              <marker key={c} id={`${uid}${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={c === "a" ? "var(--accent)" : "var(--muted)"} />
              </marker>
            ))}
          </defs>
          {seg && (
            <g aria-hidden>
              <rect {...g.rect(U(slotOf(seg[0])) - 7, V0 - 7, (seg[1] - seg[0]) * g.PITCH + L + 14, T + 14)} rx={10} fill="color-mix(in srgb, var(--accent) 9%, transparent)" stroke="var(--accent)" strokeOpacity={0.4} strokeDasharray="4 4" />
              <text x={U(slotOf(seg[0])) - 4} y={V0 - 13} className="muted-text" style={{ fontSize: 10.5 }}>
                reverse these
              </text>
            </g>
          )}
          <line x1={g.U0 - 8} x2={W - 8} y1={V0 + T + 9} y2={V0 + T + 9} stroke="var(--border-strong)" strokeWidth={1.5} aria-hidden />
          <g aria-hidden>
            <rect {...ghost} rx={8} fill="none" stroke="var(--border-strong)" strokeDasharray="3 3" />
            <text x={gc[0]} y={gc[1] + 4} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5 }}>
              null
            </text>
          </g>
          <AnimatePresence initial={false}>
            {arrows.map((a) => (
              <m.g key={a.key} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }} transition={{ duration: reduce ? 0 : 0.3 }}>
                <m.path
                  d={a.d}
                  fill="none"
                  stroke={a.changed ? "var(--accent)" : "var(--muted)"}
                  strokeWidth={a.hot ? 2.6 : 1.8}
                  markerEnd={a.nul ? undefined : `url(#${uid}${a.changed ? "a" : "m"})`}
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.45 }}
                />
                {a.nul && (
                  <text x={a.nul[0]} y={a.nul[1] + 4} textAnchor="middle" className="muted-text" style={{ fontSize: 12 }}>
                    ∅
                  </text>
                )}
              </m.g>
            ))}
          </AnimatePresence>
          {ids.map((id) => {
            const gone = lost.has(id);
            const dummy = hasDummy && id === D;
            const inSeg = seg && !dummy && id >= seg[0] && id <= seg[1];
            const [x, y] = P(U(slotOf(id)), gone ? 30 : 0);
            const body = g.rect(0, V0, L, T);
            const mid = P(L / 2, V0 + T / 2);
            const tag = P(L / 2, V0 + T + 24);
            return (
              <m.g key={id} initial={false} animate={{ x, y, rotate: gone ? 8 : 0, opacity: gone ? 0.6 : 1 }} transition={{ duration: reduce ? 0 : order ? 0.6 : 0.35, ease: "easeInOut" }}>
                <rect {...body} rx={8} fill="var(--card-2)" stroke={gone ? "var(--critical)" : inSeg ? "var(--accent)" : "var(--border-strong)"} strokeWidth={mc.vars.curr === id ? 2.4 : 1.4} strokeDasharray={gone || dummy ? "4 3" : undefined} />
                {[9, L - 9].map((cx) => (
                  <circle key={cx} cx={cx} cy={V0 + T + 4} r={compact ? 4 : 4.5} fill="var(--card)" stroke="var(--muted)" strokeWidth={1.4} />
                ))}
                <text x={mid[0]} y={mid[1] + 5} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700 }}>
                  {dummy ? "D" : mc.labels[id]}
                </text>
                {gone && (
                  <text x={tag[0]} y={tag[1]} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 750, fill: "var(--critical-ink)" }}>
                    ✕ lost
                  </text>
                )}
              </m.g>
            );
          })}
          {ptrs.map((p) => (
            <m.text key={p.k} textAnchor="middle" initial={false} animate={{ x: p.x, y: p.y }} transition={tween} style={{ fontSize: compact ? 13 : 12, fontWeight: 750, fill: VAR_COLOR[p.k] }}>
              ▲ {p.k}
            </m.text>
          ))}
        </svg>
      </div>
      <div role="group" aria-label="Counters" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
        <span>
          Moves <b>{mc.moves}</b>
        </span>
        <span>
          Couplings flipped{" "}
          <b>
            {flipped}/{k}
          </b>
        </span>
        <span>
          Extra memory <b>{seg ? 6 : 3} pointers</b> <span className="muted">(an array copy: {n} slots)</span>
        </span>
        {lost.size > 0 && <span className="bad-ink">✕ {lost.size} lost</span>}
        {!hint.onPath && <span className="pill warn-ink">⚠ Off the safe path: Undo</span>}
        {done && n > 0 && <span className="pill ok-ink">✓ Reversed</span>}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step makes one move." />
      </p>
      <More label={part === "range" ? "Your train and segment" : "Your train"}>
        <div className="controls">
          <label className="control" htmlFor={`${uid}c`} style={{ minWidth: 140, flex: "1 1 140px", maxWidth: 260 }}>
            <span>Cars (up to {MAX_CARS})</span>
            <input
              id={`${uid}c`}
              type="text"
              value={text}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setText(e.target.value);
                restart({ text: e.target.value });
              }}
            />
          </label>
          {part === "range" && n > 0 && (
            <>
              <Slider
                label="m (from position)"
                value={Math.min(lo, n)}
                min={1}
                max={n}
                onChange={(v) => {
                  const h2 = Math.max(hi, v);
                  setLo(v);
                  setHi(h2);
                  restart({ lo: v, hi: h2 });
                }}
              />
              <Slider
                label="n (to position)"
                value={Math.min(Math.max(lo, hi), n)}
                min={1}
                max={n}
                onChange={(v) => {
                  const l2 = Math.min(lo, v);
                  setHi(v);
                  setLo(l2);
                  restart({ lo: l2, hi: v });
                }}
              />
            </>
          )}
        </div>
      </More>
    </WidgetFrame>
  );
}

"use client";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";
import { SLOTS, TREE_W, depthOf, has, isLeaf, left, nodesOf, parseTree, randomTree, right, type Slots } from "./TreeDfsLab";

// ---------------------------------------------------------------- BFS frames (pure, tested)
export type BfsMode = "levels" | "right" | "min";
export interface BFrame {
  kind: "start" | "level" | "deq" | "stop" | "done";
  /** Waiting nodes, front first. */
  queue: number[];
  cur: number | null;
  /** Children enqueued at this step. */
  enq: number[];
  /** The level number as the code counts it. */
  level: number;
  /** Snapshot: nodes still to dequeue in this level. Live-length bug: the queue length the loop reads. */
  left: number;
  levels: number[][];
  right: number[];
  dequeued: number;
}

/**
 * The level-size loop. With `snapshot` off it reproduces the classic bug: the inner loop reads the live
 * queue length, which grows as children join, so a "level" only ends when the queue is empty.
 */
export function bfsFrames(t: Slots, mode: BfsMode, snapshot = true): BFrame[] {
  const frames: BFrame[] = [];
  const queue = has(t, 0) ? [0] : [];
  const levels: number[][] = [];
  const rightView: number[] = [];
  let level = 0;
  let leftN = 0;
  let dequeued = 0;
  const snap = (kind: BFrame["kind"], cur: number | null = null, enq: number[] = []) =>
    frames.push({ kind, queue: [...queue], cur, enq, level, left: snapshot ? leftN : queue.length, levels: levels.map((l) => [...l]), right: [...rightView], dequeued });
  snap("start");
  while (queue.length) {
    leftN = queue.length; // the snapshot: exactly this level's nodes
    levels.push([]);
    snap("level");
    while (snapshot ? leftN > 0 : queue.length > 0) {
      const node = queue.shift()!;
      dequeued++;
      leftN--;
      levels[level].push(node);
      if (mode === "min" && isLeaf(t, node)) {
        snap("stop", node);
        return frames;
      }
      const enq = [left(node), right(node)].filter((c) => has(t, c));
      queue.push(...enq);
      if (snapshot ? leftN === 0 : queue.length === 0) rightView.push(node);
      snap("deq", node, enq);
    }
    level++;
  }
  snap("done");
  return frames;
}

/** Brute force by depth (no queue): what BFS must find. */
export const levelsByDepth = (t: Slots) => nodesOf(t).reduce<number[][]>((acc, i) => ((acc[depthOf(i)] ??= []).push(i), acc), []);
export const rightView = (t: Slots) => levelsByDepth(t).map((l) => l[l.length - 1]);
export const minDepth = (t: Slots) => nodesOf(t).filter((i) => isLeaf(t, i)).reduce((d, i) => Math.min(d, depthOf(i) + 1), has(t, 0) ? Infinity : 0);

/** Click-to-edit: prune a node with its whole subtree, or grow one under an existing parent. */
export function prune(t: Slots, i: number): Slots {
  const out = [...t];
  const kill = (j: number) => {
    if (j >= SLOTS) return;
    out[j] = null;
    kill(left(j));
    kill(right(j));
  };
  kill(i);
  return out;
}
export function grow(t: Slots, i: number, v: number): Slots {
  if (i >= SLOTS || has(t, i) || (i > 0 && !has(t, (i - 1) >> 1))) return t;
  const out = [...t];
  out[i] = v;
  return out;
}

// ---------------------------------------------------------------- widget
const STEP_MS = 800;
const R = 18;
/**
 * Wide (desktop pane): a flatter, wider tree (levels 50 apart across 600 units) over the queue strip, drawn at about
 * 1:1. Narrow (phones): the 420-unit tree from TreeDfsLab with 1.2× nodes and type, since it is drawn at about 0.6×.
 */
const WIDE = { W: 600, top: 24, gap: 50, qy: 226, qx: 66, k: 1 };
const NARROW = { W: TREE_W, top: 30, gap: 62, qy: 30 + 3 * 62 + 48, qx: 58, k: 1.2 };
type Lay = typeof WIDE;
const LEVEL_COLORS = ["var(--series-1)", "var(--series-3)", "var(--series-2)", "var(--k-gateway)"];
const DEFAULT = parseTree("8 3 10 1 6 null 14 null null 4 7").slots;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const xy = (L: Lay, i: number) => {
  const d = depthOf(i);
  return { x: ((i - (2 ** d - 1) + 0.5) * L.W) / 2 ** d, y: L.top + d * L.gap };
};

function describe(t: Slots, mode: BfsMode, snapshot: boolean, f: BFrame, n: number): string {
  const v = (i: number | null) => (i === null ? "" : String(t[i]));
  const list = (ids: number[]) => ids.map((i) => t[i]).join(", ");
  const levelsText = f.levels.map((l) => `[${list(l)}]`).join(", ");
  switch (f.kind) {
    case "start":
      return has(t, 0) ? "The queue starts with the root. Press Run or Step." : "Empty tree: return [] without touching the queue. Click + to plant a root.";
    case "level":
      return snapshot
        ? `Level ${f.level} starts: the queue holds exactly its ${f.left} node${f.left === 1 ? "" : "s"}, so size = ${f.left}.`
        : `Level ${f.level} starts, but the loop reads the live queue length (${f.left} now), which grows as children join.`;
    case "deq": {
      const kids = f.enq.length ? `, enqueue ${list(f.enq)}` : " (no children)";
      const seen = mode === "right" && f.right.at(-1) === f.cur ? ` ${v(f.cur)} is last on its level: visible from the right.` : "";
      if (!snapshot) return `Dequeue ${v(f.cur)}${kids}.${seen}`;
      return `Dequeue ${v(f.cur)}${kids}. ${f.left ? `${f.left} more on level ${f.level}.` : `Level ${f.level} done: [${list(f.levels[f.level])}].`}${seen}`;
    }
    case "stop": {
      const real = minDepth(t);
      const head = `Dequeue ${v(f.cur)}: the first leaf. Nothing shallower can come later, so stop: ${n - f.dequeued} of ${n} nodes never dequeued.`;
      return f.level + 1 === real ? `${head} Minimum depth = ${real} ✓.` : `${head} But the code says depth ${f.level + 1}, and the real minimum depth is ${real} ✕: without the snapshot, it lost count of levels.`;
    }
    case "done":
      if (!has(t, 0)) return "Empty tree: nothing to do.";
      if (!snapshot) return `Done, but every node landed in one "level": ${levelsText} ✕. Without the size snapshot, the levels run together.`;
      return mode === "right" ? `Right side view: ${list(f.right)}. Each is the last node of its level.` : `Done: ${f.levels.length} levels, ${levelsText}. Each node was enqueued and dequeued once: O(n).`;
  }
}

export function TreeBfsLab() {
  const [t, setT] = useState<Slots>(DEFAULT);
  const [mode, setMode] = useState<BfsMode>("levels");
  const [snapshot, setSnapshot] = useState(true);
  const [seed, setSeed] = useState(11);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L = useNarrow(ref, 480) ? NARROW : WIDE;
  const { k } = L;
  const H = L.qy + 40 * k + 4;
  const chip = 34 * k;
  const pitch = chip + 5;

  const frames = useMemo(() => bfsFrames(t, mode, snapshot), [t, mode, snapshot]);
  const last = frames.length - 1;
  const tick = useCallback((s: { i: number; acc: number }, dt: number) => (s.i >= last ? s : s.acc + dt < STEP_MS ? { ...s, acc: s.acc + dt } : { i: s.i + 1, acc: 0 }), [last]);
  const [s, reset] = useFixedStep(() => ({ i: 0, acc: 0 }), tick, running && inView && !reduce);
  if (running && s.i >= last) setRunning(false);
  const f = frames[Math.min(s.i, last)];
  const restart = (run = true) => {
    reset({ i: 0, acc: 0 });
    setRunning(run);
  };
  const edit = (next: Slots) => {
    setT(next);
    restart(false);
  };

  const nodes = nodesOf(t);
  const n = nodes.length;
  const levelOf = new Map(f.levels.flatMap((l, j) => l.map((i) => [i, j] as const)));
  const ghosts = Array.from({ length: SLOTS }, (_, i) => i).filter((i) => !has(t, i) && (i === 0 ? true : has(t, (i - 1) >> 1)));
  const stopped = f.kind === "stop";
  const sentence = describe(t, mode, snapshot, f, n);
  const said = useThrottled(sentence, 650);
  const tween = { duration: reduce ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] as const };
  const label = `Binary tree with ${n} nodes. Queue, front first: ${f.queue.map((i) => t[i]).join(", ") || "empty"}. Levels so far: ${f.levels.map((l) => l.map((i) => t[i]).join(" ")).join(" | ") || "none"}.`;
  const bracket = snapshot && f.kind !== "start" && f.kind !== "done" && f.left > 0 ? f.left : 0;
  const QY = L.qy;
  const QX = L.qx;

  return (
    <WidgetFrame title="Level-by-level ripple" sub="A queue hands out nodes in the order they joined, so the tree is read one level at a time. Click + to grow a node, or a node to prune it.">
      <div className="controls">
        <SimButtons
          running={running && !reduce}
          reduce={reduce}
          onToggle={() => (s.i >= last ? restart() : setRunning((r) => !r))}
          onStep={() => reset({ i: Math.min(s.i + 1, last), acc: 0 })}
          stepHint="One level start or one dequeue"
          onReset={() => restart(false)}
        />
        <Seg<BfsMode>
          labelMode="hidden"
          label="Show"
          value={mode}
          onChange={(v) => {
            setMode(v);
            restart();
          }}
          options={[
            { value: "levels", label: "Levels" },
            { value: "right", label: "Right view" },
            { value: "min", label: "Min depth" },
          ]}
        />
        {/* One toggle: pressed = the inner loop reads the live queue length instead of a size snapshot. */}
        <div className="seg">
          <button
            type="button"
            aria-pressed={!snapshot}
            title="The inner loop reads the live queue length instead of a size snapshot"
            onClick={() => {
              setSnapshot(!snapshot);
              restart();
            }}
          >
            {snapshot ? "" : "⚠ "}Live-length bug
          </button>
        </div>
      </div>

      <div ref={ref} style={{ position: "relative", maxWidth: L === WIDE ? 640 : 540, margin: "0 auto" }}>
        <svg viewBox={`0 0 ${L.W} ${H}`} className="sim-svg" role="img" aria-label={label}>
          {nodes
            .filter((i) => i > 0)
            .map((i) => {
              const a = xy(L, (i - 1) >> 1);
              const b = xy(L, i);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border-strong)" strokeWidth={1.6} />;
            })}
          {ghosts.map((i) => {
            const { x, y } = xy(L, i);
            const p = xy(L, (i - 1) >> 1);
            return (
              <g key={`g${i}`} aria-hidden opacity={0.75}>
                {i > 0 && <line x1={p.x} y1={p.y} x2={x} y2={y} stroke="var(--border)" strokeDasharray="3 4" />}
                <circle cx={x} cy={y} r={11 * k} fill="var(--card)" stroke="var(--border-strong)" strokeDasharray="3 3" />
                <text x={x} y={y + 4.5 * k} textAnchor="middle" className="muted-text" style={{ fontSize: 13 * k }}>
                  +
                </text>
              </g>
            );
          })}
          {mode === "right" &&
            f.right.map((i) => {
              const { x, y } = xy(L, i);
              return (
                <m.g key={`r${i}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} aria-hidden>
                  <line x1={x + R * k + 3} y1={y} x2={L.W - 44 * k} y2={y} stroke="var(--accent)" strokeDasharray="4 4" />
                  <text x={L.W - 2} y={y + 4} textAnchor="end" style={{ fontSize: 11 * k, fontWeight: 750, fill: "var(--accent)" }}>
                    ◀ seen
                  </text>
                </m.g>
              );
            })}
          {nodes.map((i) => {
            const { x, y } = xy(L, i);
            const lv = levelOf.get(i);
            const col = lv === undefined ? undefined : LEVEL_COLORS[lv % LEVEL_COLORS.length];
            const cur = f.cur === i;
            const dim = stopped && lv === undefined;
            return (
              <g key={i} transform={`translate(${x} ${y})`} opacity={dim ? 0.4 : 1}>
                {cur && !reduce && <m.circle key={`p${s.i}`} initial={{ r: R * k, opacity: 0.8 }} animate={{ r: R * k + 14, opacity: 0 }} transition={{ duration: 0.6 }} fill="none" stroke={col} strokeWidth={2.5} />}
                <circle r={R * k} fill={col ? `color-mix(in srgb, ${col} 30%, var(--card))` : "var(--card-2)"} stroke={cur ? "var(--fg)" : (col ?? "var(--border-strong)")} strokeWidth={cur ? 2.6 : col ? 2 : 1.4} />
                <text y={5 * k} textAnchor="middle" style={{ fontSize: 15 * k, fontWeight: 700 }}>
                  {t[i]}
                </text>
                {stopped && cur && (
                  <text y={(R + 14) * k} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 750, fill: "var(--good-ink)" }}>
                    ✓ first leaf
                  </text>
                )}
              </g>
            );
          })}
          <text x={4} y={QY + 12 * k} className="muted-text" style={{ fontSize: 12.5 * k, fontWeight: 700 }}>
            queue
          </text>
          <text x={4} y={QY + 26 * k} className="muted-text" style={{ fontSize: 11.5 * k }}>
            front →
          </text>
          {bracket > 0 && (
            <m.g initial={false} animate={{ opacity: 1 }} aria-hidden>
              <m.rect x={QX - 4} y={QY - 4} height={chip + 4} rx={8} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="4 3" initial={false} animate={{ width: bracket * pitch + 3 }} transition={tween} />
              <m.text y={QY - 8} style={{ fontSize: 10.5 * k, fontWeight: 700, fill: "var(--accent)" }} initial={false} animate={{ x: QX }} transition={tween}>
                rest of level {f.level}: {bracket}
              </m.text>
            </m.g>
          )}
          <AnimatePresence initial={false}>
            {f.queue.map((i, j) => (
              <m.g
                key={i}
                initial={reduce ? false : { x: QX + (j + 2) * pitch, y: QY, opacity: 0 }}
                animate={{ x: QX + j * pitch, y: QY, opacity: 1 }}
                exit={{ x: QX - pitch, opacity: 0, transition: { duration: reduce ? 0 : 0.3 } }}
                transition={tween}
              >
                <rect width={chip} height={chip - 4} rx={7} fill="var(--card-2)" stroke={f.enq.includes(i) ? "var(--accent)" : "var(--border-strong)"} strokeWidth={f.enq.includes(i) ? 2 : 1.2} />
                <text x={chip / 2} y={chip / 2 + 3 * k} textAnchor="middle" style={{ fontSize: 13.5 * k, fontWeight: 700 }}>
                  {t[i]}
                </text>
              </m.g>
            ))}
          </AnimatePresence>
          {!f.queue.length && (
            <text x={QX} y={QY + 19 * k} className="muted-text" style={{ fontSize: 12 * k }}>
              empty
            </text>
          )}
        </svg>
        {nodes.map((i) => {
          const { x, y } = xy(L, i);
          return <button key={i} type="button" onClick={() => edit(prune(t, i))} aria-label={`Prune node ${t[i]} and its subtree`} title="Prune" style={{ position: "absolute", left: pct(x, L.W), top: pct(y, H), transform: "translate(-50%, -50%)", width: 36, height: 36, borderRadius: "50%", border: 0, background: "transparent", cursor: "pointer" }} />;
        })}
        {ghosts.map((i) => {
          const { x, y } = xy(L, i);
          return (
            <button
              key={`g${i}`}
              type="button"
              onClick={() => {
                setSeed(seed + 1);
                edit(grow(t, i, 1 + Math.floor(mulberry32(seed * 31 + i)() * 20)));
              }}
              aria-label={i === 0 ? "Plant a root" : `Grow a ${i % 2 ? "left" : "right"} child under ${t[(i - 1) >> 1]}`}
              title="Grow a node"
              style={{ position: "absolute", left: pct(x, L.W), top: pct(y, H), transform: "translate(-50%, -50%)", width: 28, height: 28, borderRadius: "50%", border: 0, background: "transparent", cursor: "pointer" }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 6, minHeight: 24 }}>
        <span className="muted" style={{ fontSize: 12.5, marginRight: 4 }}>
          Levels:
        </span>
        {f.levels.map((l, j) => (
          <m.span key={j} className="pill" initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ color: "var(--fg)", borderColor: LEVEL_COLORS[j % LEVEL_COLORS.length], background: `color-mix(in srgb, ${LEVEL_COLORS[j % LEVEL_COLORS.length]} 14%, transparent)` }}>
            L{j}: {l.map((i) => t[i]).join(" ") || "…"}
          </m.span>
        ))}
        {!f.levels.length && <span className="muted" style={{ fontSize: 12.5 }}>none yet</span>}
      </div>
      <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, marginTop: 4 }}>
        <span>
          Dequeued{" "}
          <b style={{ color: "var(--fg)" }}>
            {f.dequeued}/{n}
          </b>
        </span>
        {mode === "min" ? (
          <span>
            DFS without an early exit: <b style={{ color: "var(--fg)" }}>{n}</b> (it must see every leaf)
          </span>
        ) : (
          <span>
            Queue now <b style={{ color: "var(--fg)" }}>{f.queue.length}</b> (at most the widest level: O(w) space)
          </span>
        )}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step moves one dequeue at a time." />
      </p>
      <More label="Other trees">
        <div className="controls">
          <button
            type="button"
            className="wbtn"
            onClick={() => {
              setSeed(seed + 1);
              edit(randomTree(seed + 1, 20));
            }}
          >
            <Shuffle size={14} aria-hidden /> Random tree
          </button>
          <button type="button" className="wbtn" onClick={() => edit(DEFAULT)}>
            Example tree
          </button>
        </div>
      </More>
    </WidgetFrame>
  );
}

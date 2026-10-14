"use client";
import { useCallback, useId, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- trees as heap slots (pure, tested, shared with TreeBfsLab)
/** Slot i has children 2i + 1 and 2i + 2; four levels (15 slots) fit a phone. */
export type Slots = (number | null)[];
export const SLOTS = 15;
export const left = (i: number) => 2 * i + 1;
export const right = (i: number) => 2 * i + 2;
export const depthOf = (i: number) => Math.floor(Math.log2(i + 1));
export const has = (t: Slots, i: number) => i < t.length && t[i] !== null && t[i] !== undefined;
export const isLeaf = (t: Slots, i: number) => has(t, i) && !has(t, left(i)) && !has(t, right(i));
export const nodesOf = (t: Slots) => t.map((_, i) => i).filter((i) => has(t, i));
export const height = (t: Slots) => nodesOf(t).reduce((h, i) => Math.max(h, depthOf(i) + 1), 0);

/** LeetCode-style level order ("8 3 10 1 6 null 14"): each node in the queue takes the next two tokens as children. */
export function parseTree(text: string): { slots: Slots; trimmed: boolean; bad: string[] } {
  const bad: string[] = [];
  const vals = text
    .split(/[\s,[\]]+/)
    .filter(Boolean)
    .map((tok) => {
      if (/^-?\d{1,3}$/.test(tok)) return Number(tok);
      if (!/^(null|x|#|-)$/i.test(tok)) bad.push(tok);
      return null;
    });
  const slots: Slots = Array(SLOTS).fill(null);
  let trimmed = false;
  if (!vals.length || vals[0] === null) return { slots, trimmed, bad };
  slots[0] = vals[0];
  const queue = [0]; // -1 marks a node too deep to draw: it still owns two tokens
  let k = 1;
  for (let h = 0; h < queue.length && k < vals.length; h++) {
    const p = queue[h];
    for (const c of p < 0 ? [-1, -1] : [left(p), right(p)]) {
      if (k >= vals.length) break;
      const v = vals[k++];
      if (v === null) continue;
      if (c >= 0 && c < SLOTS) {
        slots[c] = v;
        queue.push(c);
      } else {
        trimmed = true;
        queue.push(-1);
      }
    }
  }
  return { slots, trimmed, bad };
}

export function serializeTree(t: Slots): string {
  if (!has(t, 0)) return "";
  const out: (number | null)[] = [];
  const queue = [0];
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    if (i < 0) {
      out.push(null);
      continue;
    }
    out.push(t[i]);
    for (const c of [left(i), right(i)]) queue.push(has(t, c) ? c : -1);
  }
  while (out.at(-1) === null) out.pop();
  return out.map((v) => (v === null ? "null" : String(v))).join(" ");
}

/** A random tree with at least five nodes; the same seed always grows the same tree. */
export function randomTree(seed: number, maxVal = 12): Slots {
  for (let s = seed; ; s++) {
    const rnd = mulberry32(s);
    const t: Slots = Array(SLOTS).fill(null);
    t[0] = 1 + Math.floor(rnd() * maxVal);
    for (let i = 1; i < SLOTS; i++) if (has(t, (i - 1) >> 1) && rnd() < [1, 0.85, 0.7, 0.5][depthOf(i)]) t[i] = 1 + Math.floor(rnd() * maxVal);
    if (nodesOf(t).length >= 5) return t;
  }
}

export const TREE_W = 420;
export const treeXY = (i: number) => {
  const d = depthOf(i);
  return { x: ((i - (2 ** d - 1) + 0.5) * TREE_W) / 2 ** d, y: 30 + d * 62 };
};

// ---------------------------------------------------------------- DFS frames (pure, tested)
export type Order = "pre" | "in" | "post";
export type Mode = Order | "sum";
export interface Frame {
  kind: "start" | "enter" | "visit" | "leaf" | "leave" | "done";
  node: number | null;
  /** The call stack after this event (slot indexes, root first). */
  stack: number[];
  /** Path sum: what each frame on the stack still needs below it. */
  needs: number[];
  visited: number[];
  checked: { node: number; rest: number }[];
  found: number[][];
}

/** Recursive reference traversal (no frames): what the walk must produce. */
export function traverse(t: Slots, order: Order, i = 0): number[] {
  if (!has(t, i)) return [];
  const l = traverse(t, order, left(i));
  const r = traverse(t, order, right(i));
  return order === "pre" ? [i, ...l, ...r] : order === "in" ? [...l, i, ...r] : [...l, ...r, i];
}

export function dfsFrames(t: Slots, mode: Mode, target = 0): Frame[] {
  const frames: Frame[] = [];
  const stack: number[] = [];
  const needs: number[] = [];
  const visited: number[] = [];
  const checked: Frame["checked"] = [];
  const found: number[][] = [];
  const snap = (kind: Frame["kind"], node: number | null) =>
    frames.push({ kind, node, stack: [...stack], needs: [...needs], visited: [...visited], checked: [...checked], found: found.map((p) => [...p]) });
  const visit = (i: number) => {
    visited.push(i);
    snap("visit", i);
  };
  const go = (i: number, need: number) => {
    stack.push(i);
    if (mode === "sum") {
      const rest = need - t[i]!;
      needs.push(rest);
      if (isLeaf(t, i)) {
        checked.push({ node: i, rest });
        if (rest === 0) found.push([...stack]);
        snap("leaf", i);
      } else snap("enter", i);
      for (const c of [left(i), right(i)]) if (has(t, c)) go(c, rest);
      needs.pop();
    } else {
      if (mode === "pre") visit(i);
      else snap("enter", i);
      if (has(t, left(i))) go(left(i), 0);
      if (mode === "in") visit(i);
      if (has(t, right(i))) go(right(i), 0);
      if (mode === "post") visit(i);
    }
    stack.pop();
    snap("leave", i);
  };
  snap("start", null);
  if (has(t, 0)) go(0, target);
  snap("done", null);
  return frames;
}

/** Every root-to-leaf path (brute force, for tests and the summary). */
export function allPaths(t: Slots, i = 0, path: number[] = []): number[][] {
  if (!has(t, i)) return [];
  const p = [...path, i];
  return isLeaf(t, i) ? [p] : [...allPaths(t, left(i), p), ...allPaths(t, right(i), p)];
}

// ---------------------------------------------------------------- sentences
const ORDER_NAME: Record<Order, string> = { pre: "Pre-order", in: "In-order", post: "Post-order" };
const RULE: Record<Order, string> = {
  pre: "Pre-order visits a node first, then its left subtree, then its right.",
  in: "In-order finishes a node's whole left subtree before the node itself.",
  post: "Post-order visits both subtrees before the node.",
};

export function describeFrame(t: Slots, mode: Mode, target: number, f: Frame): string {
  const v = (i: number | null | undefined) => (i === null || i === undefined ? "" : String(t[i]));
  const vals = (ids: number[]) => ids.map((i) => t[i]).join(", ");
  const n = f.node;
  const parent = f.stack.at(-1);
  switch (f.kind) {
    case "start":
      if (!has(t, 0)) return "The tree is empty: dfs(null) hits the base case and returns at once.";
      return mode === "sum" ? `Find root-to-leaf paths that add up to ${target}. Each call carries what is still needed down to its children.` : `${ORDER_NAME[mode]} walk from the root. ${RULE[mode]}`;
    case "enter":
      if (mode === "sum") return `Enter ${v(n)}: need ${f.needs.at(-2) ?? target} − ${v(n)} = ${f.needs.at(-1)} more below.`;
      return mode === "in" ? `Enter ${v(n)}: push dfs(${v(n)}). It waits while its left subtree runs.` : `Enter ${v(n)}: push dfs(${v(n)}). It waits for both subtrees.`;
    case "visit":
      if (mode === "pre") return `Visit ${v(n)} on the way down, before its children. So far: ${vals(f.visited)}.`;
      if (mode === "in") return `Left side of ${v(n)} done: visit ${v(n)}, then go right. So far: ${vals(f.visited)}.`;
      return `Both sides of ${v(n)} done: visit ${v(n)} last. So far: ${vals(f.visited)}.`;
    case "leaf": {
      const rest = f.needs.at(-1)!;
      return rest === 0 ? `Leaf ${v(n)}: need is 0, so ${f.stack.map((i) => t[i]).join(" → ")} adds up to ${target} ✓.` : `Leaf ${v(n)}: still need ${rest}, so this path adds up to ${target - rest}, not ${target} ✕.`;
    }
    case "leave":
      return parent === undefined ? `dfs(${v(n)}) returns: the stack is empty.` : `dfs(${v(n)}) returns: pop it, back in dfs(${v(parent)}).`;
    case "done":
      if (!has(t, 0)) return "The tree is empty: nothing to visit.";
      if (mode === "sum") return f.found.length ? `Done: ${f.found.map((p) => p.map((i) => t[i]).join(" → ")).join("; ")} ${f.found.length === 1 ? "adds" : "add"} up to ${target} ✓.` : `Done: no root-to-leaf path adds up to ${target} ✕. Try another target.`;
      return `Done: ${ORDER_NAME[mode]} is ${vals(f.visited)}. The stack never held more than ${height(t)} calls: the tree's height.`;
  }
}

// ---------------------------------------------------------------- widget
const STEP_MS = 750;
const R = 18;
const TREE_H = 30 + 3 * 62 + 42;
const DEFAULT = "8 3 10 1 6 null 14 null null 4 7";
interface Guess {
  pos: number;
  misses: number;
  wrong: number | null;
  msg: string;
}
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function TreeDfsLab() {
  const [text, setText] = useState(DEFAULT);
  const [mode, setMode] = useState<Mode>("pre");
  const [play, setPlay] = useState<"watch" | "predict">("watch");
  const [target, setTarget] = useState(21);
  const [seed, setSeed] = useState(7);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, 480);
  /** Phones draw the tree at about 0.6×, so nodes and their type grow by a quarter to stay readable. */
  const k = narrow ? 1.25 : 1;
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");

  const parsed = useMemo(() => parseTree(text), [text]);
  const t = parsed.slots;
  const frames = useMemo(() => dfsFrames(t, mode, target), [t, mode, target]);
  const last = frames.length - 1;
  const tick = useCallback((s: { i: number; acc: number }, dt: number) => (s.i >= last ? s : s.acc + dt < STEP_MS ? { ...s, acc: s.acc + dt } : { i: s.i + 1, acc: 0 }), [last]);
  const predicting = play === "predict" && mode !== "sum";
  const [s, reset] = useFixedStep(() => ({ i: 0, acc: 0 }), tick, running && inView && !reduce && !predicting);
  if (running && s.i >= last) setRunning(false);
  const f = frames[Math.min(s.i, last)];

  const order = mode === "sum" ? [] : traverse(t, mode);
  const fresh: Guess = { pos: 0, misses: 0, wrong: null, msg: mode === "sum" ? "" : `Click the nodes in ${ORDER_NAME[mode].toLowerCase()}. ${RULE[mode]}` };
  const [g, setG] = useState<Guess>(fresh);
  const restart = (run = true) => {
    reset({ i: 0, acc: 0 });
    setRunning(run);
    setG({ pos: 0, misses: 0, wrong: null, msg: "" });
  };
  const guess = (i: number) => {
    if (g.pos >= order.length) return;
    if (order[g.pos] === i) {
      const pos = g.pos + 1;
      setG({ pos, misses: g.misses, wrong: null, msg: pos === order.length ? `All ${pos} right, with ${g.misses} miss${g.misses === 1 ? "" : "es"}: ${order.map((x) => t[x]).join(", ")}.` : `Yes: ${t[i]} is number ${pos}.` });
    } else setG({ ...g, misses: g.misses + 1, wrong: i, msg: order.indexOf(i) < g.pos ? `${t[i]} is already visited.` : `Not ${t[i]} yet. ${RULE[mode as Order]}` });
  };

  const visited = predicting ? order.slice(0, g.pos) : f.visited;
  const onStack = new Set(predicting ? [] : f.stack);
  const walker = predicting ? null : f.kind === "leave" ? (f.stack.at(-1) ?? null) : f.node;
  const foundEdges = new Set(f.found.flatMap((p) => p.slice(1)));
  const checked = new Map(f.checked.map((c) => [c.node, c.rest]));
  const sentence = predicting ? g.msg || fresh.msg : describeFrame(t, mode, target, f);
  const said = useThrottled(sentence, 650);
  const nodes = nodesOf(t);
  const tween = { duration: reduce ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] as const };
  const label = `Binary tree, level order: ${serializeTree(t) || "empty"}. ${predicting ? `You have placed ${g.pos} of ${order.length}.` : `Call stack: ${f.stack.map((i) => t[i]).join(", ") || "empty"}. Visited: ${f.visited.map((i) => t[i]).join(", ") || "none"}.`}`;
  const stackRows = [...f.stack].reverse();
  const frameText = (i: number, j: number) => `dfs(${t[i]}${mode === "sum" ? `, ${(f.needs[f.stack.length - 1 - j] ?? 0) + (t[i] ?? 0)}` : ""})`;

  return (
    <WidgetFrame title="Depth-first walker" sub="Watch the recursion dive and return, with the call stack growing and shrinking. Then predict the order yourself, or hunt for a path sum.">
      <div className="controls" style={{ alignItems: "center" }}>
        {predicting ? (
          <button type="button" className="wbtn" onClick={() => setG(fresh)}>
            Start over
          </button>
        ) : (
          <SimButtons
            running={running && !reduce}
            reduce={reduce}
            onToggle={() => (s.i >= last ? restart() : setRunning((r) => !r))}
            onStep={() => reset({ i: Math.min(s.i + 1, last), acc: 0 })}
            stepHint="One call, visit or return"
            onReset={() => restart(false)}
          />
        )}
        <Seg<Mode>
          labelMode="hidden"
          label="Order"
          value={mode}
          onChange={(v) => {
            setMode(v);
            restart();
          }}
          options={[
            { value: "pre", label: "Pre" },
            { value: "in", label: "In" },
            { value: "post", label: "Post" },
            { value: "sum", label: "Path sum" },
          ]}
        />
        {mode !== "sum" ? (
          <Seg<"watch" | "predict">
            labelMode="hidden"
            label="You"
            value={play}
            onChange={(v) => {
              setPlay(v);
              restart(v === "watch");
            }}
            options={[
              { value: "watch", label: "Watch" },
              { value: "predict", label: "Predict" },
            ]}
          />
        ) : (
          <Slider
            label="Target sum"
            value={target}
            min={0}
            max={60}
            onChange={(v) => {
              setTarget(v);
              restart(false);
            }}
          />
        )}
      </div>

      <div ref={ref} style={{ display: "flex", flexWrap: "wrap", gap: narrow ? 6 : 12, alignItems: "flex-start" }}>
        <div style={{ position: "relative", flex: narrow ? "1 1 100%" : "3 1 300px", minWidth: 0, maxWidth: 440, margin: "0 auto" }}>
          <svg viewBox={`0 0 ${TREE_W} ${TREE_H}`} className="sim-svg" role="img" aria-label={label}>
            {nodes
              .filter((i) => i > 0)
              .map((i) => {
                const a = treeXY((i - 1) >> 1);
                const b = treeXY(i);
                const hot = foundEdges.has(i) ? "var(--good)" : onStack.has(i) ? "var(--accent)" : "var(--border-strong)";
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot} strokeWidth={hot === "var(--border-strong)" ? 1.6 : 3.2} style={{ transition: "stroke .25s" }} />;
              })}
            <m.g initial={false} animate={{ x: walker === null ? TREE_W / 2 : treeXY(walker).x, y: walker === null ? 30 : treeXY(walker).y, opacity: walker === null ? 0 : 1 }} transition={tween}>
              <circle r={R * k + 6} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="5 3" />
            </m.g>
            {nodes.map((i) => {
              const { x, y } = treeXY(i);
              const n = visited.indexOf(i);
              const rest = checked.get(i);
              const wrong = predicting && g.wrong === i;
              return (
                <g key={i} transform={`translate(${x} ${y})`}>
                  {n >= 0 && !reduce && <m.circle key={`p${n}-${s.i}-${g.pos}`} initial={{ r: R * k, opacity: 0.7 }} animate={{ r: R * k + 13, opacity: 0 }} transition={{ duration: 0.6 }} fill="none" stroke="var(--accent)" strokeWidth={2} />}
                  <circle r={R * k} fill={n >= 0 ? "color-mix(in srgb, var(--accent) 24%, var(--card))" : "var(--card-2)"} stroke={wrong ? "var(--critical)" : onStack.has(i) ? "var(--accent)" : "var(--border-strong)"} strokeWidth={wrong || onStack.has(i) ? 2.4 : 1.4} />
                  <text y={5 * k} textAnchor="middle" style={{ fontSize: 15 * k, fontWeight: 700 }}>
                    {t[i]}
                  </text>
                  {n >= 0 && (
                    <text x={R * k + 1} y={-R * k + 3} style={{ fontSize: 11 * k, fontWeight: 800, fill: "var(--accent)", paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}>
                      {n + 1}
                    </text>
                  )}
                  {wrong && (
                    <text y={R * k + 14 * k} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 750, fill: "var(--critical-ink)" }}>
                      ✕ not yet
                    </text>
                  )}
                  {mode === "sum" && rest !== undefined && (
                    <text y={R * k + 14 * k} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 750, fill: rest === 0 ? "var(--good-ink)" : "var(--critical-ink)" }}>
                      {rest === 0 ? "✓" : "✕"} {target - rest}
                    </text>
                  )}
                </g>
              );
            })}
            {!nodes.length && (
              <text x={TREE_W / 2} y={TREE_H / 2} textAnchor="middle" className="muted-text">
                Empty tree: type a root value
              </text>
            )}
          </svg>
          {predicting &&
            nodes.map((i) => {
              const { x, y } = treeXY(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => guess(i)}
                  aria-label={`Node ${t[i]} on level ${depthOf(i) + 1}${visited.includes(i) ? `, visited ${visited.indexOf(i) + 1}` : ""}`}
                  style={{ position: "absolute", left: pct(x, TREE_W), top: pct(y, TREE_H), transform: "translate(-50%, -50%)", width: 38, height: 38, borderRadius: "50%", border: 0, background: "transparent", cursor: "pointer" }}
                />
              );
            })}
        </div>
        {/* The call stack: a column beside the tree, or (phones) one wrapping row under it, top frame first. */}
        {!predicting && (
          <div style={narrow ? { flex: "1 1 100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 } : { flex: "1 1 130px", minWidth: 120 }} aria-hidden>
            <div className="muted" style={{ fontSize: 12, fontWeight: 650, marginBottom: narrow ? 0 : 4, marginRight: narrow ? 4 : 0 }}>
              Call stack ({f.stack.length}) · top first{mode === "sum" && !narrow ? " · dfs(node, still needed)" : ""}
            </div>
            <div style={narrow ? { display: "flex", flexWrap: "wrap", gap: 4 } : { display: "grid", gap: 4 }}>
              <AnimatePresence initial={false}>
                {stackRows.map((i, j) => (
                  <m.div
                    key={`${i}-${f.stack.length - j}`}
                    initial={reduce ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 18, transition: { duration: reduce ? 0 : 0.2 } }}
                    transition={{ duration: reduce ? 0 : 0.25 }}
                    style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, padding: narrow ? "2px 6px" : "4px 8px", borderRadius: 7, border: `1px solid ${j === 0 ? "var(--accent)" : "var(--border)"}`, background: j === 0 ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--card-2)" }}
                  >
                    {frameText(i, j)}
                  </m.div>
                ))}
              </AnimatePresence>
              {!f.stack.length && <span className="muted" style={{ fontSize: 12.5 }}>empty</span>}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 6, minHeight: 24 }}>
        <span className="muted" style={{ fontSize: 12.5, marginRight: 4 }}>
          {mode === "sum" ? "Paths found:" : predicting ? "Your order:" : "Visit order:"}
        </span>
        {(mode === "sum" ? f.found.map((p) => p.map((i) => t[i]).join("→")) : visited.map((i) => String(t[i]))).map((v, k) => (
          <m.span key={`${k}-${v}`} className="pill" initial={reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ color: mode === "sum" ? "var(--good-ink)" : "var(--accent)" }}>
            {v}
          </m.span>
        ))}
        {predicting && (
          <>
            <span className="pill ok-ink" style={{ marginLeft: "auto" }}>
              ✓ {g.pos}/{order.length}
            </span>
            <span className={`pill ${g.misses ? "bad-ink" : "muted"}`}>✕ {g.misses} missed</span>
          </>
        )}
      </div>
      <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, marginTop: 4 }}>
        {mode === "sum" ? (
          <>
            <span>
              Leaves checked{" "}
              <b style={{ color: "var(--fg)" }}>
                {f.checked.length}/{allPaths(t).length}
              </b>
            </span>
            <span>
              Paths found <b style={{ color: "var(--fg)" }}>{f.found.length}</b>
            </span>
          </>
        ) : (
          <span>
            Visited{" "}
            <b style={{ color: "var(--fg)" }}>
              {visited.length}/{nodes.length}
            </b>
          </span>
        )}
        {!predicting && (
          <span>
            Stack depth <b style={{ color: "var(--fg)" }}>{f.stack.length}</b> (at most the height, {height(t)}: O(h) space)
          </span>
        )}
        {parsed.trimmed && <span className="warn-ink">⚠ Trimmed to 4 levels</span>}
        {parsed.bad.length > 0 && <span className="warn-ink">⚠ Read {parsed.bad.slice(0, 2).join(", ")} as null</span>}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step moves one call at a time." />
      </p>
      <More label="Edit the tree">
        <div className="controls">
          <label className="control" htmlFor={`${uid}t`} style={{ minWidth: 180, flex: "2 1 180px" }}>
            <span>Tree (level order, null for a gap)</span>
            <input
              id={`${uid}t`}
              type="text"
              value={text}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setText(e.target.value);
                restart(false);
              }}
            />
          </label>
          <button
            type="button"
            className="wbtn"
            onClick={() => {
              setSeed(seed + 1);
              setText(serializeTree(randomTree(seed + 1)));
              restart();
            }}
          >
            <Shuffle size={14} aria-hidden /> Random tree
          </button>
        </div>
      </More>
    </WidgetFrame>
  );
}

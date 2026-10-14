"use client";
import { useEffect, useId, useState } from "react";
import { m } from "motion/react";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
/** Nodes 0 … tail+loop−1. The first `tail` nodes lead into a loop of `loop` nodes; loop 0 means the list ends in null. */
export interface Track {
  tail: number;
  loop: number;
}
export const sizeOf = (t: Track) => t.tail + t.loop;
export function nextOf(t: Track, i: number | null): number | null {
  if (i === null) return null;
  if (i < sizeOf(t) - 1) return i + 1;
  return t.loop > 0 ? t.tail : null;
}

export type Outcome = "middle" | "entry" | "missed" | "empty";
export interface Run extends Track {
  speed: number;
  phase: "chase" | "entry" | "done";
  slow: number | null;
  fast: number | null;
  /** Fast's hops so far in the current step (fast hops one node per tick, so it visibly runs). */
  hop: number;
  steps: number;
  steps2: number;
  meet: number | null;
  /** Phase 2 has sent the hare back to the head. */
  home: boolean;
  outcome: Outcome | null;
}

export function startRun(t: Track, speed = 2): Run {
  const head = sizeOf(t) ? 0 : null;
  return { ...t, speed, phase: head === null ? "done" : "chase", slow: head, fast: head, hop: 0, steps: 0, steps2: 0, meet: null, home: false, outcome: head === null ? "empty" : null };
}

/** `while (fast && fast.next …)`: fast must be able to take `speed − 1` hops and land somewhere (null allowed). */
function canStep(r: Run) {
  let f = r.fast;
  for (let k = 0; k < r.speed - 1; k++) {
    if (f === null) return false;
    f = nextOf(r, f);
  }
  return f !== null;
}

/** One tick: one hop for fast in phase 1 (slow moves on every `speed`-th), one hop each in phase 2. */
export function tick(r: Run): Run {
  if (r.phase === "done") return r;
  if (r.phase === "chase") {
    if (r.hop === 0 && !canStep(r)) return { ...r, phase: "done", outcome: "middle" };
    const fast = nextOf(r, r.fast);
    const hop = r.hop + 1;
    if (hop < r.speed) return { ...r, fast, hop };
    const slow = nextOf(r, r.slow);
    const steps = r.steps + 1;
    if (slow !== fast) return { ...r, slow, fast, hop: 0, steps };
    // They meet. If that's the head, it's also the entry; otherwise phase 2 starts.
    const met = { ...r, slow, fast, hop: 0, steps, meet: slow };
    return slow === 0 ? { ...met, phase: "done", outcome: "entry" } : { ...met, phase: "entry" };
  }
  if (!r.home) return { ...r, fast: 0, home: true };
  const slow = nextOf(r, r.slow);
  const fast = nextOf(r, r.fast);
  const steps2 = r.steps2 + 1;
  if (slow === fast) return { ...r, slow, fast, steps2, phase: "done", outcome: "entry" };
  // The walker from the head reaches the entry after exactly `tail` steps; if they haven't met by then, they never will.
  if (steps2 > r.tail) return { ...r, slow, fast, steps2, phase: "done", outcome: "missed" };
  return { ...r, slow, fast, steps2 };
}

/** A full step: `speed` ticks in phase 1, one tick in phase 2. */
export function fullStep(r: Run): Run {
  if (r.phase !== "chase") return tick(r);
  let s = tick(r);
  while (s.phase === "chase" && s.hop !== 0) s = tick(s);
  return s;
}

export function finish(r: Run, cap = 10_000): Run {
  let s = r;
  for (let i = 0; i < cap && s.phase !== "done"; i++) s = tick(s);
  return s;
}

// ---------------------------------------------------------------- picture
const TICK_MS = 300;
const DX = 36;
const TOP = 64;

interface Sim {
  run: Run;
  acc: number;
}
const stepSim = (s: Sim, dt: number): Sim => {
  if (s.run.phase === "done") return s;
  const acc = s.acc + dt;
  return acc >= TICK_MS ? { run: tick(s.run), acc: 0 } : { ...s, acc };
};

function useNarrow(ref: React.RefObject<HTMLElement | null>, below = 470) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // A hidden stage reports width 0: keep the last layout instead of flashing the phone one.
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setNarrow(e.contentRect.width < below);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

/**
 * Tail in a row, loop as a circle that starts at its leftmost point and runs clockwise. A wide (landscape) stage
 * scales the list up a little, but never lets the loop grow taller than `maxLoop`, so the picture stays short.
 */
function layout(t: Track, W: number, wide = false) {
  const R0 = t.loop >= 3 ? DX / (2 * Math.sin(Math.PI / t.loop)) : t.loop === 2 ? DX / 2 : 0;
  const need = t.tail * DX + (t.loop ? 2 * R0 + (t.loop === 1 ? DX / 2 : 0) : DX);
  const s = Math.min(wide ? 1.45 : 1.15, (W - 48) / Math.max(need, 1), wide && R0 ? 150 / (2 * R0) : Infinity);
  const dx = DX * s;
  const R = R0 * s;
  const x0 = (W - need * s) / 2 + (t.loop === 1 ? 0 : 0);
  const cy = TOP + Math.max(R, 6);
  const r = Math.min(13, dx * 0.38);
  const at = (i: number | null): [number, number] => {
    if (i === null || i >= sizeOf(t)) return [x0 + t.tail * dx, cy];
    if (i < t.tail) return [x0 + i * dx, cy];
    const th = Math.PI - ((i - t.tail) * 2 * Math.PI) / t.loop;
    return [x0 + t.tail * dx + R + R * Math.cos(th), cy - R * Math.sin(th)];
  };
  const angle = (j: number) => Math.PI - (j * 2 * Math.PI) / t.loop;
  /** Where a runner stands: above (slow) or below (fast) on the tail; outside the circle, side by side, on the loop. */
  const rider = (i: number | null, slow: boolean): [number, number, number, number] => {
    const [x, y] = at(i);
    if (i === null || i < t.tail || (i === t.tail && t.tail > 0) || t.loop < 3) return slow ? [x, y - r - 14, 0, -12] : [x, y + r + 18, 0, 19];
    const d = R + r + 17;
    const th = angle(i - t.tail) + (slow ? 1 : -1) * Math.min(0.5, 13 / d);
    const cx = x0 + t.tail * dx + R;
    return [cx + d * Math.cos(th), cy - d * Math.sin(th) + (slow ? 0 : 4), 24 * Math.cos(th), (slow ? -19 : -28) * Math.sin(th) + 4];
  };
  /** A spot just inside the loop, for the "met" tag. */
  const inside = (i: number): [number, number] => {
    const [x, y] = at(i);
    if (t.loop < 3) return [x + r + 12, y - r - 2];
    const th = angle(i - t.tail);
    return [x - (r + 13) * Math.cos(th), y + (r + 13) * Math.sin(th) + 4];
  };
  return { at, rider, inside, R, r, cy, H: cy + R + 58, angle };
}

function Tortoise() {
  return (
    <g>
      <ellipse cx={-9} cy={4} rx={3} ry={2.2} fill="var(--series-1)" />
      <ellipse cx={9} cy={4} rx={3} ry={2.2} fill="var(--series-1)" />
      <circle cx={13} cy={-1} r={3.6} fill="var(--series-1)" />
      <ellipse rx={11} ry={7.5} fill="color-mix(in srgb, var(--series-1) 55%, var(--card))" stroke="var(--series-1)" strokeWidth={1.6} />
      <path d="M-5 -3 L0 -6 L5 -3 M-6 2 L6 2" stroke="var(--series-1)" strokeWidth={1.2} fill="none" />
    </g>
  );
}
function Hare() {
  return (
    <g>
      <ellipse cx={8} cy={-11} rx={2.2} ry={6.5} transform="rotate(18 8 -11)" fill="color-mix(in srgb, var(--series-2) 60%, var(--card))" stroke="var(--series-2)" strokeWidth={1.2} />
      <ellipse cx={4} cy={-11} rx={2.2} ry={6.5} transform="rotate(-8 4 -11)" fill="color-mix(in srgb, var(--series-2) 60%, var(--card))" stroke="var(--series-2)" strokeWidth={1.2} />
      <ellipse rx={10} ry={6} fill="color-mix(in srgb, var(--series-2) 45%, var(--card))" stroke="var(--series-2)" strokeWidth={1.6} />
      <circle cx={8} cy={-3} r={4.5} fill="color-mix(in srgb, var(--series-2) 45%, var(--card))" stroke="var(--series-2)" strokeWidth={1.4} />
      <circle cx={-10} cy={-1} r={2.4} fill="var(--card)" stroke="var(--series-2)" />
    </g>
  );
}

/** A segmented control sized like a .wbtn, captioned by its aria-label (the toolbar has no room for a caption row). */
function Pick({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ lineHeight: "14px", flex: "none" }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function describe(r: Run) {
  const n = sizeOf(r);
  if (r.outcome === "empty") return "Empty list: fast is null at once. No loop, no middle.";
  if (r.outcome === "middle") {
    const where = r.speed === 2 ? `the middle of ${n} nodes${n % 2 === 0 ? " (the second middle)" : ""}` : `about a third of the way along ${n} nodes`;
    return `Fast ran off the end after ${r.steps} ${r.steps === 1 ? "step" : "steps"}: no loop. Slow is on node ${r.slow}, ${where}.`;
  }
  const laps = (r.steps * (r.speed - 1)) / r.loop;
  const p1 = `Slow walked ${r.steps} steps and fast ${r.steps * r.speed}: the extra ${r.steps * (r.speed - 1)} = ${laps} × ${r.loop}, whole laps.`;
  if (r.outcome === "entry") return `Both reach node ${r.slow} after ${r.steps2} more ${r.steps2 === 1 ? "step" : "steps"} (F = ${r.tail}): the loop starts there. ${p1}`;
  if (r.outcome === "missed")
    return `Missed: the walker from the head reached the entry while slow was elsewhere in the loop, so they never line up. With ${r.speed} hops, fast's extra ${r.steps * (r.speed - 1)} steps are whole laps, but slow's own ${r.steps} aren't. Speed 2 makes them the same number.`;
  if (r.phase === "entry")
    return !r.home
      ? `They meet on node ${r.meet} after ${r.steps} steps: there is a loop. Next, the hare goes back to the head.`
      : r.steps2 === 0
        ? "Phase 2: the hare restarts at the head and now walks one step at a time, like the tortoise."
        : `Phase 2, step ${r.steps2}: slow on ${r.slow}, the walker from the head on ${r.fast}.`;
  if (r.steps === 0 && r.hop === 0) return `Both start on the head. Fast takes ${r.speed} hops for each step slow takes. Press Run or Step.`;
  const inLoop = r.loop > 0 && r.slow! >= r.tail && r.fast !== null && r.fast >= r.tail;
  const gap = inLoop ? (r.slow! - r.fast! + r.loop) % r.loop : null;
  return `Step ${r.steps}: slow on ${r.slow}, fast on ${r.fast ?? "null"}.${gap !== null ? ` Both in the loop: fast is ${gap} behind and gains ${r.speed - 1} per step.` : ""}`;
}

export function FastSlowLab() {
  const [tail, setTail] = useState(3);
  const [loop, setLoop] = useState(6);
  const [speed, setSpeed] = useState(2);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref);
  const id = useId().replace(/:/g, "");
  const [sim, reset] = useFixedStep<Sim>({ run: startRun({ tail: 3, loop: 6 }), acc: 0 }, stepSim, running && inView && !reduce);
  const run = sim.run;
  const done = run.phase === "done";
  const W = narrow ? 330 : 600;
  const L = layout(run, W, !narrow);
  const n = sizeOf(run);

  const restart = (t: Track, sp = speed, keep = false) => {
    reset({ run: startRun(t, sp), acc: 0 });
    if (!keep) setRunning(false);
  };
  const said = useThrottled(describe(run), 600);

  const arrow = `fs-arrow-${id}`;
  const edges: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const j = nextOf(run, i);
    const [x1, y1] = L.at(i);
    if (j === null) {
      const [x2, y2] = L.at(null);
      edges.push(<line key={i} x1={x1 + L.r} y1={y1} x2={x2 - 15} y2={y2} stroke="var(--border-strong)" strokeWidth={1.6} markerEnd={`url(#${arrow})`} />);
    } else if (i >= run.tail && run.loop === 1) {
      edges.push(<path key={i} d={`M${x1 - 5} ${y1 - L.r} C${x1 - 22} ${y1 - L.r - 30}, ${x1 + 22} ${y1 - L.r - 30}, ${x1 + 5} ${y1 - L.r}`} fill="none" stroke="var(--border-strong)" strokeWidth={1.6} markerEnd={`url(#${arrow})`} />);
    } else if (i >= run.tail) {
      const a = L.angle(i - run.tail) - L.r / L.R;
      const b = L.angle(i - run.tail + 1) + L.r / L.R;
      const [cx, cy] = [L.at(run.tail)[0] + L.R, L.cy];
      const p = (t: number) => `${cx + L.R * Math.cos(t)} ${cy - L.R * Math.sin(t)}`;
      edges.push(<path key={i} d={`M${p(a)} A${L.R} ${L.R} 0 0 1 ${p(b)}`} fill="none" stroke="var(--border-strong)" strokeWidth={1.6} markerEnd={`url(#${arrow})`} />);
    } else {
      const [x2] = L.at(j);
      edges.push(<line key={i} x1={x1 + L.r} y1={y1} x2={x2 - L.r - 1} y2={y1} stroke="var(--border-strong)" strokeWidth={1.6} markerEnd={`url(#${arrow})`} />);
    }
  }
  const glide = { duration: reduce ? 0 : TICK_MS / 1000 - 0.04, ease: "easeInOut" as const };
  const [sx, sy, slx, sly] = L.rider(run.slow, true);
  const [fx, fy, flx, fly] = L.rider(run.fast, false);
  const entryFound = run.outcome === "entry";
  const label = n
    ? `Linked list of ${n} nodes: ${run.tail} before the loop, ${run.loop ? `a loop of ${run.loop}` : "then null"}. Slow on node ${run.slow ?? "null"}, fast on ${run.fast ?? "null"}.${run.meet !== null ? ` They met on node ${run.meet}.` : ""}`
    : "Empty list.";

  return (
    <WidgetFrame title="Tortoise and hare" sub="The hare laps the tortoise, then both walk to where the loop begins.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (!done) return setRunning((r) => !r);
            restart({ tail, loop }, speed, true);
            setRunning(true);
          }}
          onStep={() => reset({ run: fullStep(run), acc: 0 })}
          stepHint="Move both pointers one step"
          onReset={() => restart({ tail, loop })}
        />
        <Pick
          label="Fast hops per step"
          value={speed}
          onChange={(v) => {
            setSpeed(v);
            restart({ tail, loop }, v);
          }}
          options={[
            { value: 2, label: "Fast: 2 hops" },
            { value: 3, label: "3 hops" },
          ]}
        />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <Slider
          label="Nodes before the loop"
          value={tail}
          min={0}
          max={8}
          onChange={(v) => {
            setTail(v);
            restart({ tail: v, loop });
          }}
        />
        <Slider
          label="Loop length"
          value={loop}
          min={0}
          max={12}
          format={(v) => (v ? String(v) : "none")}
          onChange={(v) => {
            setLoop(v);
            restart({ tail, loop: v });
          }}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${L.H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: narrow ? 520 : 680, margin: "0 auto" }}>
          <defs>
            <marker id={arrow} viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 Z" fill="var(--border-strong)" />
            </marker>
          </defs>
          {edges}
          {run.loop === 0 && n > 0 && (
            <g>
              <rect x={L.at(null)[0] - 15} y={L.cy - 10} width={30} height={20} rx={5} fill="var(--card-2)" stroke="var(--border-strong)" strokeDasharray="3 2" />
              <text x={L.at(null)[0]} y={L.cy + 4} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                null
              </text>
            </g>
          )}
          {Array.from({ length: n }, (_, i) => {
            const [x, y] = L.at(i);
            const isEntry = run.loop > 0 && i === run.tail;
            const met = run.meet === i;
            return (
              <g key={i}>
                {met && <circle cx={x} cy={y} r={L.r + 5} fill="none" stroke="var(--accent-2)" strokeWidth={2} strokeDasharray="3 2" />}
                <m.circle
                  cx={x}
                  cy={y}
                  r={L.r}
                  fill={isEntry && entryFound ? "color-mix(in srgb, var(--good) 25%, var(--card))" : "var(--card)"}
                  stroke={isEntry && entryFound ? "var(--good)" : "var(--border-strong)"}
                  strokeWidth={isEntry && entryFound ? 2.6 : 1.4}
                  initial={false}
                  animate={{ scale: (i === run.slow || i === run.fast) && !reduce ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                />
                <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: Math.min(11.5, L.r * 0.95), fontWeight: 700 }}>
                  {i}
                </text>
                {i === 0 && (
                  <text x={x - L.r - 3} y={y + L.r + 11} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
                    head
                  </text>
                )}
                {isEntry && (entryFound || run.tail > 0) && (
                  <text x={x - L.r - 3} y={y - L.r - 2} textAnchor="end" style={{ fontSize: 10.5, fontWeight: entryFound ? 800 : 500, fill: entryFound ? "var(--good-ink)" : "var(--muted)" }}>
                    {entryFound ? "✓ entry" : "entry"}
                  </text>
                )}
                {met && (
                  <text x={L.inside(i)[0]} y={L.inside(i)[1]} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--accent-2)" }}>
                    met
                  </text>
                )}
              </g>
            );
          })}
          {n > 0 && (
            <>
              <m.g initial={false} animate={{ x: sx, y: sy }} transition={glide}>
                <Tortoise />
                <text x={slx} y={sly} textAnchor="middle" style={{ fontSize: narrow ? 10 : 11, fontWeight: 750, fill: "var(--series-1)" }}>
                  slow
                </text>
              </m.g>
              <m.g initial={false} animate={{ x: fx, y: fy }} transition={glide}>
                <Hare />
                <text x={flx} y={fly} textAnchor="middle" style={{ fontSize: narrow ? 10 : 11, fontWeight: 750, fill: "var(--series-2)" }}>
                  {run.home ? "from head" : "fast"}
                </text>
              </m.g>
            </>
          )}
        </svg>
      </div>

      <div role="group" aria-label="Counters" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
        <span>
          Steps: <b>{run.steps}</b>
          {run.steps2 > 0 && (
            <>
              {" "}
              + <b>{run.steps2}</b> in phase 2
            </>
          )}
        </span>
        <span>
          Memory: <b>2 pointers</b> <span className="muted">(a visited set: up to {n} nodes)</span>
        </span>
        {done && run.outcome !== "empty" && (
          <span className={run.outcome === "missed" ? "bad-ink" : "ok-ink"} style={{ fontWeight: 700 }}>
            {run.outcome === "middle" ? `✓ middle: node ${run.slow}` : run.outcome === "entry" ? `✓ loop starts at node ${run.slow}` : "✕ missed the entry"}
          </span>
        )}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step." />
      </p>
    </WidgetFrame>
  );
}

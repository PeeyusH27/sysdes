"use client";
import { useEffect, useRef } from "react";
import { animate, m, useMotionValue } from "motion/react";
import { CircleAlert, CircleCheck, CircleX, Flame, Pause, Play, RotateCcw, SkipBack, SkipForward, Check } from "lucide-react";
import { KIND_META } from "./kinds";
import type { NodeKind, NodeState } from "./types";
import type { Stepper } from "./useStepper";

/** A dot that travels along an SVG path. Position is a motion value, so React never re-renders per frame. */
export function Packet({ d, reverse = false, tone = "ok", ms = 800 }: {
  d: string;
  reverse?: boolean;
  tone?: "ok" | "miss" | "error";
  ms?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const t = useMotionValue(0);
  const cx = useMotionValue(-100);
  const cy = useMotionValue(-100);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const place = (v: number) => {
      const pt = p.getPointAtLength((reverse ? 1 - v : v) * len);
      cx.set(pt.x);
      cy.set(pt.y);
    };
    t.set(0);
    place(0);
    const unsubscribe = t.on("change", place);
    const run = animate(t, 1, { duration: ms / 1000, ease: [0.4, 0, 0.2, 1] });
    return () => {
      run.stop();
      unsubscribe();
    };
  }, [d, reverse, ms, t, cx, cy]);

  return (
    <g aria-hidden>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      <m.circle r={6} cx={cx} cy={cy} className={`packet packet--${tone}`} />
    </g>
  );
}

export function ArrowMarker({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" className="arrow-head" />
    </marker>
  );
}

const STATE_META: Record<NodeState, { icon: typeof Check; label: string }> = {
  ok: { icon: CircleCheck, label: "ok" },
  hit: { icon: CircleCheck, label: "hit" },
  miss: { icon: CircleAlert, label: "miss" },
  busy: { icon: Flame, label: "busy" },
  down: { icon: CircleX, label: "down" },
};

/** Icon + word, never colour alone. */
export function StateBadge({ state, x, y }: { state: NodeState; x: number; y: number }) {
  const { icon: Icon, label } = STATE_META[state];
  const w = 18 + label.length * 6.6;
  return (
    <g className="state-badge" data-state={state} transform={`translate(${x - w},${y - 11})`}>
      <rect width={w} height={20} rx={10} />
      <Icon x={4} y={3} width={14} height={14} aria-hidden />
      <text x={20} y={14}>{label}</text>
    </g>
  );
}

export function Legend({ kinds }: { kinds: NodeKind[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {kinds.map((k) => {
        const { icon: Icon, label, color } = KIND_META[k];
        return (
          <li key={k}>
            <Icon aria-hidden size={13} style={{ color }} />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export function StepControls({ stepper, children }: { stepper: Stepper; children?: React.ReactNode }) {
  const done = stepper.index >= stepper.total - 1 && stepper.total > 0;
  return (
    <div className="step-controls">
      {children}
      <div className="step-buttons">
        <button type="button" onClick={stepper.reset} aria-label="Restart" title="Restart (Home)">
          <RotateCcw size={15} aria-hidden />
        </button>
        <button type="button" onClick={stepper.prev} aria-label="Previous step" title="Previous (←)" disabled={stepper.index <= 0}>
          <SkipBack size={15} aria-hidden />
        </button>
        <button type="button" className="play" onClick={stepper.playing ? stepper.pause : stepper.play} title="Play / pause (Space)">
          {stepper.playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {stepper.playing ? "Pause" : done ? "Replay" : "Play"}
        </button>
        <button type="button" onClick={stepper.next} aria-label="Next step" title="Next (→)" disabled={done}>
          <SkipForward size={15} aria-hidden />
        </button>
        <span className="step-count" aria-hidden>
          {Math.max(stepper.index + 1, 0)} / {stepper.total}
        </span>
        <label className="speed">
          <span className="sr-only">Speed</span>
          <select value={stepper.speed} onChange={(e) => stepper.setSpeed(Number(e.target.value))}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
    </div>
  );
}

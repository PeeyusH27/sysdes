"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotionConfig } from "motion/react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useHydrated } from "@/lib/hooks";

/**
 * Gate for animated widgets: `inView` pauses off-screen work, `reduce` honours both the OS setting
 * and the site's "Reduce motion" switch (MotionConfig). `reduce` stays false until hydration so the
 * server render and the first client render agree.
 */
export function useSimGate<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const pref = useReducedMotionConfig();
  const hydrated = useHydrated();
  return { ref, inView, reduce: hydrated && !!pref };
}

/** Keeps an aria-live sentence calm: updates at most every `ms`, always settling on the latest value. */
export function useThrottled<T>(value: T, ms = 1000) {
  const [out, setOut] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = last.current + ms - Date.now();
    const id = setTimeout(
      () => {
        last.current = Date.now();
        setOut(value);
      },
      Math.max(0, wait),
    );
    return () => clearTimeout(id);
  }, [value, ms]);
  return out;
}

/** Run/Pause + Step + Reset. With reduced motion the Run button is hidden and Step is the way forward. */
export function SimButtons({
  running,
  onToggle,
  onStep,
  onReset,
  reduce,
  stepLabel = "Step",
  stepHint,
}: {
  running: boolean;
  onToggle?: () => void;
  onStep: () => void;
  onReset?: () => void;
  reduce: boolean;
  stepLabel?: string;
  /** What one step does, e.g. "Advance 0.5 seconds" (tooltip and accessible name). */
  stepHint?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
      {onToggle && !reduce && (
        <button type="button" className="wbtn" onClick={onToggle} aria-pressed={running}>
          {running ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} {running ? "Pause" : "Run"}
        </button>
      )}
      <button type="button" className="wbtn" onClick={onStep} title={stepHint} aria-label={stepHint ? `${stepLabel}: ${stepHint}` : undefined}>
        <StepForward size={14} aria-hidden /> {stepLabel}
      </button>
      {onReset && (
        <button type="button" className="wbtn" onClick={onReset} aria-label="Reset" title="Reset">
          <RotateCcw size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Small note shown when motion is reduced, so the reader knows why nothing moves. */
export function ReducedNote({ reduce, what = "Animation paused (reduced motion): use Step." }: { reduce: boolean; what?: string }) {
  if (!reduce) return null;
  return <span className="muted"> · {what}</span>;
}

/** Run `step` n times (for Step buttons that advance more than one tick). */
export function advance<S>(s: S, step: (s: S, dt: number) => S, n: number, dt = 50) {
  let out = s;
  for (let i = 0; i < n; i++) out = step(out, dt);
  return out;
}

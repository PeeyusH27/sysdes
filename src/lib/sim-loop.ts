"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Fixed-timestep simulation loop. `step` must be stable (module-level or useCallback).
 * Runs only while `running`; state updates are batched to one per frame at most.
 */
export function useFixedStep<S>(initial: S | (() => S), step: (s: S, dtMs: number) => S, running: boolean, dt = 50) {
  const [state, setState] = useState<S>(initial);
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  });
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(now - last, 250); // clamp after tab switches
      last = now;
      if (acc >= dt) {
        let s = ref.current;
        while (acc >= dt) {
          s = step(s, dt);
          acc -= dt;
        }
        ref.current = s;
        setState(s);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, step, dt]);
  const reset = (s: S) => {
    ref.current = s;
    setState(s);
  };
  const tick = () => {
    const s = step(ref.current, dt);
    ref.current = s;
    setState(s);
  };
  return [state, reset, tick] as const;
}

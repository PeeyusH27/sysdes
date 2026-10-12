"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { StepControls } from "@/components/diagram/parts";
import { useStepper } from "@/components/diagram/useStepper";
import type { Frame, TraceSpec } from "./types";
import { fmtJson, ViewPanel } from "./views";

const STEP_MS = 1500;

/**
 * Plays a trace: frame 0 is the starting state, every step after it is one transition. The stepper's index -1 shows
 * frame 0, so "0 / N" means "not started" and each Next shows the following frame.
 */
export function AlgoPlayer({
  spec,
  codeHtml,
  preset: initial,
  compact = false,
  autoplay = false,
  loop = false,
}: {
  spec: TraceSpec;
  codeHtml: string;
  preset?: string;
  /** Hide code and controls (home page). */
  compact?: boolean;
  autoplay?: boolean;
  loop?: boolean;
}) {
  const [presetIdx, setPresetIdx] = useState(() => Math.max(0, spec.presets.findIndex((p) => p.label === initial)));
  const frames = spec.presets[presetIdx]?.frames ?? [];
  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const durationOf = useCallback(() => STEP_MS, []);
  const stepper = useStepper(Math.max(0, frames.length - 1), durationOf, { autoplay: autoplay && !reduce, loop });
  const { pause, playing } = stepper;
  const idx = stepper.index + 1;
  const frame: Frame | undefined = frames[idx];
  const prev: Frame | undefined = frames[idx - 1];

  // Pause when scrolled away so a long trace doesn't run unseen.
  useEffect(() => {
    if (!inView && playing && !loop) pause();
  }, [inView, playing, pause, loop]);

  const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = codeRef.current;
    if (!root || !frame) return;
    root.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));
    const line = root.querySelector<HTMLElement>(`[data-line="${frame.line}"]`);
    if (!line) return;
    line.classList.add("is-active");
    // Keep the active line visible inside the code panel without scrolling the page.
    const scroller = root.querySelector<HTMLElement>("pre");
    if (scroller) {
      const top = line.offsetTop - scroller.offsetTop;
      if (top < scroller.scrollTop + 8 || top > scroller.scrollTop + scroller.clientHeight - 40) scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3);
    }
  }, [frame, codeHtml]);

  const changed = useMemo(() => {
    const out = new Set<string>();
    if (!frame?.vars || !prev?.vars || idx === 0) return out;
    for (const [k, v] of Object.entries(frame.vars)) if (fmtJson(v) !== fmtJson(prev.vars[k])) out.add(k);
    return out;
  }, [frame, prev, idx]);

  if (!frame) return null;
  const total = frames.length - 1;

  return (
    <figure ref={box} className={cn("algo", compact && "algo--compact", !inView && "is-paused")} aria-label={spec.title}>
      {!compact && (
        <div className="algo-head">
          <div>
            <span className="eyebrow">Animated walkthrough</span>
            <h3>{spec.title}</h3>
          </div>
          {spec.presets.length > 1 && (
            <div className="scenario-tabs" role="radiogroup" aria-label="Input">
              {spec.presets.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  role="radio"
                  aria-checked={i === presetIdx}
                  onClick={() => {
                    setPresetIdx(i);
                    stepper.reset();
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="algo-body">
        <div
          className="algo-stage"
          tabIndex={compact ? undefined : 0}
          aria-keyshortcuts={compact ? undefined : "Space ArrowLeft ArrowRight Home"}
          aria-label={compact ? undefined : "Visualization. Space plays or pauses, arrow keys step."}
          onKeyDown={compact ? undefined : stepper.handleKey}
        >
          {frame.views.map((v) => (
            <ViewPanel key={`${v.kind}:${v.id}`} view={v} />
          ))}
        </div>
        {!compact && (
          <div className="algo-side">
            <div className="algo-code" ref={codeRef} dangerouslySetInnerHTML={{ __html: codeHtml }} />
            {frame.vars && Object.keys(frame.vars).length > 0 && (
              <dl className="algo-vars" aria-label="Variables">
                {Object.entries(frame.vars).map(([k, v]) => (
                  <div key={k} data-changed={changed.has(k) || undefined}>
                    <dt>{k}</dt>
                    <dd>{fmtJson(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
      <figcaption>
        {!compact && (
          <StepControls stepper={stepper}>
            <label className="scrub">
              <span className="sr-only">Step</span>
              <input type="range" min={0} max={total} value={idx} onChange={(e) => stepper.seek(Number(e.target.value) - 1)} aria-valuetext={`Step ${idx} of ${total}`} />
            </label>
          </StepControls>
        )}
        <p className="flow-caption" aria-live={compact ? "off" : "polite"}>
          {idx > 0 && <span className="step-no">{idx}</span>}
          {frame.caption}
        </p>
        {!compact && (
          <details className="text-desc">
            <summary>All steps as text</summary>
            <ol start={0}>
              {frames.map((f, i) => (
                <li key={i}>{f.caption}</li>
              ))}
            </ol>
          </details>
        )}
      </figcaption>
    </figure>
  );
}

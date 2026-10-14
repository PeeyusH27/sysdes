"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotionConfig } from "motion/react";
import { ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks";
import { StepControls } from "@/components/diagram/parts";
import { useStepper } from "@/components/diagram/useStepper";
import { runCustom } from "./custom";
import { InputEditor, type RunOutcome } from "./InputEditor";
import { hasTrace, loadTrace } from "./registry";
import type { Frame, TraceSpec, View } from "./types";
import { fmtJson, ViewPanel } from "./views";

const STEP_MS = 1500;
/** Views that carry the picture (they get the wide column); arrays, maps, stacks and queues sit beside them. */
const BIG = new Set<View["kind"]>(["graph", "tree", "list", "grid"]);

/** How wide a big view wants to be before the small views beside it wrap underneath (px, before growing). */
function basisOf(v: View): number | undefined {
  switch (v.kind) {
    case "graph":
      return 280;
    case "tree":
      return Math.round(Math.max(170, (48 + Math.max(0, v.nodes.length - 1) * 42) * 0.72));
    case "list":
      return Math.round(Math.max(200, ((v.nodes.length + 1) * 84 + 30) * 0.72));
    default:
      return undefined; // grids (HTML cells) take their own width
  }
}
/** The reader's own input lives in this tab index. */
const MINE = -1;

interface Mine {
  frames: Frame[];
  values: Record<string, string>;
  notes: string[];
  /** The preset whose hidden fields the run borrowed. */
  base: number;
}

/**
 * Plays a trace: frame 0 is the starting state, every step after it is one transition. The stepper's index -1 shows
 * frame 0, so "0 / N" means "not started" and each Next shows the following frame. Readers can also edit the input
 * ("Edit input"): the trace's module is loaded on demand and re-run in the browser (see ./custom).
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
  /** Play straight away (compact teasers). Full walkthroughs instead play once when first scrolled into view. */
  autoplay?: boolean;
  loop?: boolean;
}) {
  const [tab, setTab] = useState(() => Math.max(0, spec.presets.findIndex((p) => p.label === initial)));
  const [mine, setMine] = useState<Mine | null>(null);
  const [editing, setEditing] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const frames = useMemo(() => (tab === MINE ? mine?.frames : spec.presets[tab]?.frames) ?? [], [tab, mine, spec]);

  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: "-10% 0px" });
  const seen = useInView(box, { once: true, amount: 0.35 });
  const hydrated = useHydrated();
  const reducePref = useReducedMotionConfig();
  const reduce = hydrated && !!reducePref;
  const durationOf = useCallback(() => STEP_MS, []);
  const stepper = useStepper(Math.max(0, frames.length - 1), durationOf, { autoplay: autoplay && !reduce, loop });
  const { pause, playing } = stepper;
  const idx = stepper.index + 1;
  const frame: Frame | undefined = frames[idx];
  const prev: Frame | undefined = frames[idx - 1];
  const canEdit = !compact && !!spec.fields?.length && hasTrace(spec.id);

  // Pause when scrolled away so a long trace doesn't run unseen.
  useEffect(() => {
    if (!inView && playing && !loop) pause();
  }, [inView, playing, pause, loop]);

  // The site's "Reduce motion" switch can turn on after the first render: stop a teaser that started on its own.
  useEffect(() => {
    if (reduce && autoplay) pause();
  }, [reduce, autoplay, pause]);

  // Play once, the first time the walkthrough is mostly on screen, unless the reader got there first.
  const touched = useRef(false);
  const playRef = useRef(stepper.play);
  useEffect(() => {
    playRef.current = stepper.play;
  });
  useEffect(() => {
    if (compact || autoplay || !seen || reduce || touched.current) return;
    const id = setTimeout(() => {
      if (!touched.current) playRef.current();
      touched.current = true;
    }, 700);
    return () => clearTimeout(id);
  }, [seen, reduce, compact, autoplay]);
  const touch = () => {
    touched.current = true;
  };

  const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = codeRef.current;
    const pre = root?.querySelector<HTMLElement>("pre");
    if (!root || !pre || !frame) return;
    root.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));
    const line = root.querySelector<HTMLElement>(`[data-line="${frame.line}"]`);
    if (!line) return;
    line.classList.add("is-active");
    // A marker that slides from line to line, so the eye can follow the jump.
    let bar = pre.querySelector<HTMLElement>(".algo-hl");
    if (!bar) {
      bar = document.createElement("span");
      bar.className = "algo-hl";
      bar.setAttribute("aria-hidden", "true");
      pre.prepend(bar);
    }
    const top = line.getBoundingClientRect().top - pre.getBoundingClientRect().top + pre.scrollTop;
    bar.style.transform = `translateY(${top}px)`;
    bar.style.height = `${line.offsetHeight}px`;
    // Keep the active line visible inside the code panel without scrolling the page. The collapsed panel shows only
    // a few lines, so it keeps the active one in the middle (the line before and after give the context).
    const few = pre.clientHeight < line.offsetHeight * 5;
    if (few) {
      pre.scrollTo({ top: Math.max(0, top - (pre.clientHeight - line.offsetHeight) / 2), behavior: reduce ? "auto" : "smooth" });
    } else if (top < pre.scrollTop + 8 || top > pre.scrollTop + pre.clientHeight - 32) {
      pre.scrollTo({ top: Math.max(0, top - pre.clientHeight / 3), behavior: reduce ? "auto" : "smooth" });
    }
  }, [frame, codeHtml, codeOpen, reduce]);

  // With a picture (graph, tree…) and at most one small view, the note sits beside the picture instead of under it:
  // decided once per input, so the note doesn't jump between frames.
  const noteBeside = useMemo(() => {
    const hasBig = frames.some((f) => f.views.some((v) => BIG.has(v.kind)));
    const small = Math.max(0, ...frames.map((f) => f.views.filter((v) => !BIG.has(v.kind) && v.kind !== "note").length));
    return hasBig && small <= 1;
  }, [frames]);

  const changed = useMemo(() => {
    const out = new Set<string>();
    if (!frame?.vars || !prev?.vars || idx === 0) return out;
    for (const [k, v] of Object.entries(frame.vars)) if (fmtJson(v) !== fmtJson(prev.vars[k])) out.add(k);
    return out;
  }, [frame, prev, idx]);

  // Start fetching the trace's code as soon as the form opens, so Run is instant.
  useEffect(() => {
    if (editing) loadTrace(spec.id).catch(() => {});
  }, [editing, spec.id]);

  const editBtn = useRef<HTMLButtonElement>(null);
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editBtn.current?.focus({ preventScroll: true }));
  };

  const run = async (values: Record<string, string>): Promise<RunOutcome> => {
    let mod: TraceSpec | undefined;
    try {
      mod = await loadTrace(spec.id);
    } catch {
      return { ok: false, error: "Couldn't load this walkthrough's code. Check your connection and try again." };
    }
    if (!mod) return { ok: false, error: "This walkthrough can't take your own input yet." };
    const base = tab === MINE ? (mine?.base ?? 0) : tab;
    const res = runCustom(mod, values, base);
    if (!res.ok) return res;
    touched.current = true;
    setMine({ frames: res.frames, values: res.values, notes: res.notes, base });
    setTab(MINE);
    stepper.reset();
    if (!reduce) stepper.play();
    closeEditor();
    return { ok: true };
  };

  if (!frame) return null;
  const total = frames.length - 1;
  const bigViews = frame.views.filter((v) => BIG.has(v.kind));
  const smallViews = frame.views.filter((v) => !BIG.has(v.kind) && v.kind !== "note");
  const notes = frame.views.filter((v) => v.kind === "note");
  const tabs = [...spec.presets.map((p, i) => ({ i, label: p.label })), ...(mine ? [{ i: MINE, label: "Your input" }] : [])];
  const form = tab === MINE && mine ? mine.values : (spec.presets[tab]?.form ?? spec.presets[0].form ?? {});

  return (
    <figure ref={box} className={cn("algo", compact && "algo--compact", !inView && "is-paused")} aria-label={spec.title} onPointerDownCapture={touch} onKeyDownCapture={touch} onFocusCapture={touch}>
      {!compact && (
        <div className="algo-head">
          <h3 className="algo-title">{spec.title}</h3>
          <div className="algo-picks">
            {tabs.length > 1 && (
              <div className="scenario-tabs" role="radiogroup" aria-label="Input">
                {tabs.map((p) => (
                  <button
                    key={p.i}
                    type="button"
                    role="radio"
                    aria-checked={p.i === tab}
                    data-mine={p.i === MINE || undefined}
                    onClick={() => {
                      setTab(p.i);
                      stepper.reset();
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            {canEdit && (
              <button ref={editBtn} type="button" className="wbtn algo-edit" aria-expanded={editing} title={editing ? "Close" : "Edit input"} onClick={() => (editing ? closeEditor() : setEditing(true))}>
                <SlidersHorizontal size={14} aria-hidden />
                {/* On a narrow player only the icon shows; the words stay as the button's name. */}
                <span className="algo-edit-label">{editing ? "Close" : "Edit input"}</span>
              </button>
            )}
          </div>
        </div>
      )}
      {editing && <InputEditor key={tab} title={spec.title} fields={spec.fields ?? []} initial={form} onRun={run} onClose={closeEditor} />}
      {tab === MINE && mine && mine.notes.length > 0 && !editing && (
        <p className="algo-note" role="status">
          {mine.notes.join(" ")}
        </p>
      )}
      <div className="algo-body">
        <div
          className="algo-stage"
          data-big={bigViews.length > 0 || undefined}
          tabIndex={compact ? undefined : 0}
          aria-keyshortcuts={compact ? undefined : "Space ArrowLeft ArrowRight Home"}
          aria-label={compact ? undefined : "Visualization. Space plays or pauses, arrow keys step."}
          onKeyDown={compact ? undefined : stepper.handleKey}
        >
          {/* The picture (graph, tree, list, grid) takes the wide column; the small views sit beside it while they fit
              and wrap underneath when they don't; notes run across the bottom (or join the side, see noteBeside). */}
          {bigViews.map((v) => (
            <div key={`${v.kind}:${v.id}`} className="algo-big" data-kind={v.kind} style={{ flexBasis: basisOf(v) }}>
              <ViewPanel view={v} />
            </div>
          ))}
          {(smallViews.length > 0 || (noteBeside && notes.length > 0)) && (
            <div className="algo-side" data-note={(noteBeside && notes.length > 0) || undefined}>
              {[...smallViews, ...(noteBeside ? notes : [])].map((v) => (
                <ViewPanel key={`${v.kind}:${v.id}`} view={v} />
              ))}
            </div>
          )}
          {!noteBeside &&
            notes.map((v) => (
              <ViewPanel key={`${v.kind}:${v.id}`} view={v} />
            ))}
        </div>
        {!compact && frame.vars && Object.keys(frame.vars).length > 0 && (
          <dl className="algo-vars" aria-label="Variables">
            {Object.entries(frame.vars).map(([k, v]) => (
              <div key={k} data-changed={changed.has(k) || undefined}>
                <dt>{k}</dt>
                <dd key={changed.has(k) ? idx : "same"}>{fmtJson(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="algo-now">
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
        </div>
        {!compact && (
          <div className="algo-code" data-open={codeOpen || undefined}>
            <div ref={codeRef} dangerouslySetInnerHTML={{ __html: codeHtml }} />
            <button type="button" className="algo-code-toggle" aria-expanded={codeOpen} onClick={() => setCodeOpen((o) => !o)}>
              <ChevronsUpDown size={13} aria-hidden />
              {codeOpen ? "Less code" : "All code"}
            </button>
          </div>
        )}
      </div>
      {!compact && (
        <figcaption className="algo-foot">
          <details className="text-desc">
            <summary>All steps as text</summary>
            <ol start={0}>
              {frames.map((f, i) => (
                <li key={i}>{f.caption}</li>
              ))}
            </ol>
          </details>
        </figcaption>
      )}
    </figure>
  );
}

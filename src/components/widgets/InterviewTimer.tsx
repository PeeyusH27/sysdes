"use client";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw, Save, SkipForward, Trash2 } from "lucide-react";
import { questions } from "@content/registry";
import { useSimGate } from "./lib/sim-kit";
import { More, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure schedule + rubric */

export interface InterviewPhase {
  id: string;
  name: string;
  short: string;
  minutes: number;
  prompt: string;
  checklist: string[];
}

export const PHASES: InterviewPhase[] = [
  {
    id: "req",
    name: "Requirements",
    short: "Req",
    minutes: 5,
    prompt: "Ask before you draw. Pin down what to build, for whom, and how big it has to be.",
    checklist: ["3–5 core features agreed", "Scale: daily users, reads vs writes", "Latency, availability and consistency targets", "What's out of scope, said out loud"],
  },
  {
    id: "est",
    name: "Estimation & API",
    short: "Est",
    minutes: 5,
    prompt: "Turn the requirements into numbers and an interface. Round hard; the order of magnitude is what matters.",
    checklist: ["Average and peak QPS", "Storage per year (with replicas)", "Core endpoints with request and response", "Main entities and their keys"],
  },
  {
    id: "hld",
    name: "High-level design",
    short: "HLD",
    minutes: 15,
    prompt: "Draw the boxes and number the main read and write flows. Every arrow gets a label.",
    checklist: ["Client → LB → services → stores drawn", "Read path and write path numbered", "Database picked, with the reason", "Where the cache and the queue go", "One request walked end to end"],
  },
  {
    id: "deep",
    name: "Deep dives",
    short: "Deep",
    minutes: 15,
    prompt: "Go deep on the riskiest two parts (or the ones the interviewer steers you to). Use your numbers.",
    checklist: ["Two hard parts chosen", "Scaling: sharding, replication, hot keys", "Failure modes: what if this box dies?", "Races, idempotency, consistency", "Claims backed by the estimates"],
  },
  {
    id: "wrap",
    name: "Wrap-up",
    short: "Wrap",
    minutes: 5,
    prompt: "Land it: summarize, name the bottlenecks, and say what you'd change with more time or 10× load.",
    checklist: ["30-second summary of the design", "Bottlenecks and what you'd monitor", "Trade-offs made, and when you'd switch", "Next steps with more time"],
  },
];

export const TOTAL_MS = PHASES.reduce((a, p) => a + p.minutes, 0) * 60_000;

/** Which phase a given elapsed time falls in, and how much is left. */
export function phaseAt(elapsedMs: number) {
  let start = 0;
  for (let i = 0; i < PHASES.length; i++) {
    const len = PHASES[i].minutes * 60_000;
    if (elapsedMs < start + len) return { index: i, start, phaseElapsed: elapsedMs - start, phaseLeft: start + len - elapsedMs, totalLeft: TOTAL_MS - elapsedMs, done: false };
    start += len;
  }
  return { index: PHASES.length - 1, start: TOTAL_MS - PHASES.at(-1)!.minutes * 60_000, phaseElapsed: PHASES.at(-1)!.minutes * 60_000, phaseLeft: 0, totalLeft: TOTAL_MS - elapsedMs, done: true };
}

/** Start of phase i, in ms. */
export const phaseStart = (i: number) => PHASES.slice(0, i).reduce((a, p) => a + p.minutes * 60_000, 0);

/** "mm:ss" (negative → "+mm:ss" overtime). */
export function clock(ms: number) {
  const over = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  return `${over ? "+" : ""}${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const RUBRIC = [
  "Requirements & scope",
  "Estimation",
  "API & data model",
  "High-level design",
  "Deep dives",
  "Failure modes & scaling",
  "Trade-offs",
  "Communication & pacing",
];
export const LEVELS = ["Missing", "Partial", "Solid", "Strong"];

export interface Attempt {
  at: number;
  question: string;
  scores: number[];
  minutes: number;
}

export const STORAGE_KEY = "sysdes:interview-rubric";

/** Defensive parse of saved attempts: anything malformed is dropped, never thrown. */
export function parseHistory(raw: string | null): Attempt[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (a): a is Attempt =>
        !!a &&
        typeof a === "object" &&
        typeof (a as Attempt).at === "number" &&
        typeof (a as Attempt).question === "string" &&
        Array.isArray((a as Attempt).scores) &&
        (a as Attempt).scores.length === RUBRIC.length &&
        (a as Attempt).scores.every((x) => Number.isInteger(x) && x >= 1 && x <= 4),
    );
  } catch {
    return [];
  }
}

export const average = (scores: number[]) => (scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);

/* ------------------------------------------------------------------ localStorage as an external store */

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeHistory(list: Attempt[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    listeners.forEach((l) => l());
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ view */

const CSS = `
.w-timer { container-type: inline-size; }
.w-timer .it-top { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 2px 0 4px; }
.w-timer .it-top select { flex: 1 1 200px; min-width: 0; height: 32px; border: 1px solid var(--border); background: var(--card-2); color: var(--fg); border-radius: 8px; padding: 0 8px; font-size: 13.5px; }
.w-timer .it-sum { margin: 0 0 4px; font-size: 13px; color: var(--muted); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.it-clock { font: 700 30px/1.1 var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: .5px; }
.it-bar { display: flex; gap: 3px; margin: 6px 0 2px; }
.it-seg { position: relative; height: 24px; border-radius: 6px; background: var(--card-2); border: 1px solid var(--border); overflow: hidden; min-width: 0; }
.it-seg[data-current] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.it-fill { position: absolute; inset: 0 auto 0 0; background: color-mix(in srgb, var(--accent) 30%, transparent); }
.it-seg span { position: relative; display: block; font-size: 11.5px; font-weight: 650; padding: 3px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.it-anim .it-fill { transition: width .9s linear; }
.it-phase { border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; background: var(--card-2); margin-top: 8px; }
.it-phase h4 { margin: 0 0 2px; font-size: 14.5px; }
.it-check { list-style: none; padding: 0 !important; margin: 6px 0 0 !important; display: grid; gap: 2px 14px; font-size: 13.5px; }
.it-check li { margin: 0 !important; }
.it-check label { display: flex; gap: 8px; align-items: flex-start; cursor: pointer; line-height: 1.45; }
.it-check input { margin-top: 3px; accent-color: var(--accent); }
.it-rubric { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.it-rubric th, .it-rubric td { padding: 4px 4px; border-bottom: 1px solid var(--border); text-align: center; }
.it-rubric th[scope=row] { text-align: left; font-weight: 550; }
.it-rubric input { accent-color: var(--accent); width: 18px; height: 18px; margin: 0; cursor: pointer; }
.it-hist { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 4px; font-size: 13.5px; }
.it-hist li { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
@container (min-width: 520px) { .w-timer .it-check { grid-template-columns: 1fr 1fr; } }
@container (max-width: 420px) { .w-timer .it-rubric th[scope=col] small { display: none; } .w-timer .it-clock { font-size: 26px; } .w-timer .it-rubric { font-size: 13px; } }
`;

export function InterviewTimer() {
  const uid = useId().replace(/:/g, "");
  const [slug, setSlug] = useState(questions[0]?.slug ?? "custom");
  const [accum, setAccum] = useState(0); // ms banked while paused
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean[]>>({});
  const [scores, setScores] = useState<(number | null)[]>(() => RUBRIC.map(() => null));
  const [saveMsg, setSaveMsg] = useState("");
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();

  const running = startedAt !== null;
  const elapsed = accum + (running ? Math.max(0, now - startedAt) : 0);
  const ph = phaseAt(elapsed);
  const phase = PHASES[ph.index];
  const q = questions.find((x) => x.slug === slug);

  // Re-render once a second while running and visible; the clock itself is wall-time based, so it stays right off-screen.
  useEffect(() => {
    if (!running || !inView) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running, inView]);

  const start = () => {
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  };
  const pause = () => {
    const t = Date.now();
    setAccum((a) => a + (startedAt === null ? 0 : t - startedAt));
    setStartedAt(null);
    setNow(t);
  };
  const reset = () => {
    setStartedAt(null);
    setAccum(0);
    setNow(0);
    setChecks({});
  };
  const skip = () => {
    const target = phaseStart(Math.min(PHASES.length, ph.index + 1));
    const t = Date.now();
    setAccum(target);
    setNow(t);
    if (running) setStartedAt(t);
  };

  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const history = useMemo(() => parseHistory(raw), [raw]);
  const complete = scores.every((x) => x !== null);
  const save = () => {
    if (!complete) return;
    const next: Attempt[] = [...history, { at: Date.now(), question: q?.title ?? "Your own question", scores: scores as number[], minutes: Math.round(elapsed / 60_000) }].slice(-20);
    setSaveMsg(writeHistory(next) ? `Saved. Average ${average(scores as number[]).toFixed(1)} of 4.` : "Couldn't save: this browser blocks local storage.");
  };
  const clearHistory = () => {
    setSaveMsg(writeHistory([]) ? "History cleared." : "Couldn't clear: this browser blocks local storage.");
  };

  const phaseChecks = checks[phase.id] ?? phase.checklist.map(() => false);
  const toggleCheck = (k: number) => setChecks((c) => ({ ...c, [phase.id]: phaseChecks.map((v, i) => (i === k ? !v : v)) }));
  const recent = history.slice(-5).reverse();
  const prevAvg = history.length >= 2 ? average(history.at(-2)!.scores) : null;
  const lastAvg = history.length ? average(history.at(-1)!.scores) : null;

  const status = ph.done
    ? `Time's up: 45 minutes are over${elapsed > TOTAL_MS ? ` (${clock(TOTAL_MS - elapsed)} overtime)` : ""}. Rate yourself in the self-assessment.`
    : `Phase ${ph.index + 1} of ${PHASES.length}: ${phase.name}, ${Math.ceil(ph.phaseLeft / 60_000)} min left in this phase, ${Math.ceil(ph.totalLeft / 60_000)} min overall${running ? "" : elapsed ? " (paused)" : ""}.`;

  return (
    <WidgetFrame title="45-minute interview timer" sub="Pick a question, start the clock and follow the phases. Afterwards, rate yourself; attempts stay in this browser.">
      <style href="w-interview-timer" precedence="widgets">
        {CSS}
      </style>
      <div className="w-timer">
        <div className="it-top">
          <label className="sr-only" htmlFor={`${uid}-q`}>
            Question
          </label>
          <select id={`${uid}-q`} value={slug} onChange={(e) => setSlug(e.target.value)}>
            {questions.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.title}
              </option>
            ))}
            <option value="custom">Your own question</option>
          </select>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {running ? (
              <button type="button" className="wbtn primary" onClick={pause}>
                <Pause size={14} aria-hidden /> Pause
              </button>
            ) : (
              <button type="button" className="wbtn primary" onClick={start}>
                <Play size={14} aria-hidden /> {elapsed ? "Resume" : "Start"}
              </button>
            )}
            <button type="button" className="wbtn" onClick={skip} disabled={ph.done}>
              <SkipForward size={14} aria-hidden /> Next phase
            </button>
            <button type="button" className="wbtn" onClick={reset} aria-label="Reset timer" title="Reset timer">
              <RotateCcw size={14} aria-hidden />
            </button>
          </div>
        </div>
        {q && (
          <p className="it-sum">
            {q.summary} <span style={{ whiteSpace: "nowrap" }}>({q.level} · {q.category})</span>
          </p>
        )}

        <div ref={ref} className={reduce ? undefined : "it-anim"}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <div className="it-clock" role="timer" aria-label={`${clock(ph.totalLeft)} left`}>
              {clock(ph.totalLeft)}
            </div>
            <div className="muted" style={{ fontSize: 13.5 }}>
              {ph.done ? <strong className="bad-ink">time&apos;s up</strong> : <>left overall · this phase: <strong style={{ color: "var(--fg)" }}>{clock(ph.phaseLeft)}</strong></>}
            </div>
          </div>
          <div className="it-bar" aria-hidden>
            {PHASES.map((p, i) => {
              const len = p.minutes * 60_000;
              const fill = Math.min(1, Math.max(0, (elapsed - phaseStart(i)) / len));
              return (
                <div key={p.id} className="it-seg" data-current={(i === ph.index && !ph.done) || undefined} style={{ flex: p.minutes }} title={`${p.name}: ${p.minutes} min`}>
                  <div className="it-fill" style={{ width: `${fill * 100}%` }} />
                  <span>{p.minutes >= 10 ? `${p.short} ${p.minutes}′` : p.short}</span>
                </div>
              );
            })}
          </div>

          <section className="it-phase" aria-labelledby={`${uid}-ph`}>
            <h4 id={`${uid}-ph`}>
              {ph.index + 1}. {phase.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>({phase.minutes} min)</span>
            </h4>
            <p style={{ margin: 0, fontSize: 14 }}>{phase.prompt}</p>
            <ul className="it-check">
              {phase.checklist.map((item, k) => (
                <li key={item}>
                  <label>
                    <input type="checkbox" checked={phaseChecks[k]} onChange={() => toggleCheck(k)} />
                    <span style={phaseChecks[k] ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="readout" aria-live="polite">
          {status}
        </p>
        <More label="Self-assessment (1–4)" open={ph.done || undefined}>
          <div style={{ overflowX: "auto" }}>
            <table className="it-rubric">
              <caption className="sr-only">Rate each dimension from 1 (missing) to 4 (strong)</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left" }}>
                    Dimension
                  </th>
                  {LEVELS.map((l, i) => (
                    <th key={l} scope="col">
                      {i + 1}
                      <br />
                      <small className="muted" style={{ fontWeight: 400 }}>
                        {l}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RUBRIC.map((dim, r) => (
                  <tr key={dim}>
                    <th scope="row" id={`${uid}-d${r}`}>
                      {dim}
                    </th>
                    {LEVELS.map((l, i) => (
                      <td key={l}>
                        <input
                          type="radio"
                          name={`${uid}-r${r}`}
                          checked={scores[r] === i + 1}
                          onChange={() => setScores((s) => s.map((v, k) => (k === r ? i + 1 : v)))}
                          aria-label={`${dim}: ${i + 1}, ${l}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="wbtn primary" onClick={save} disabled={!complete}>
              <Save size={14} aria-hidden /> Save attempt
            </button>
            <span className="muted" style={{ fontSize: 13 }}>
              {complete ? `Average ${average(scores as number[]).toFixed(1)} of 4` : `${scores.filter((x) => x !== null).length} of ${RUBRIC.length} rated`}
            </span>
            <span role="status" style={{ fontSize: 13 }}>
              {saveMsg}
            </span>
          </div>

          {recent.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14 }}>Your recent attempts</strong>
                {lastAvg !== null && prevAvg !== null && (
                  <span className={lastAvg >= prevAvg ? "ok-ink" : "warn-ink"} style={{ fontSize: 13, fontWeight: 600 }}>
                    {lastAvg >= prevAvg ? "▲" : "▼"} {lastAvg >= prevAvg ? "up" : "down"} {Math.abs(lastAvg - prevAvg).toFixed(1)} since the previous one
                  </span>
                )}
                <button type="button" className="wbtn" style={{ marginLeft: "auto", height: 28 }} onClick={clearHistory}>
                  <Trash2 size={13} aria-hidden /> Clear
                </button>
              </div>
              <ol className="it-hist">
                {recent.map((a) => {
                  const avg = average(a.scores);
                  return (
                    <li key={a.at}>
                      <span style={{ display: "inline-block", width: 64, height: 8, borderRadius: 4, background: "var(--border)", position: "relative", top: -1 }} aria-hidden>
                        <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${(avg / 4) * 100}%`, borderRadius: 4, background: "var(--series-1)" }} />
                      </span>
                      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{avg.toFixed(1)}</strong>
                      <span>{a.question}</span>
                      <span className="muted">
                        {new Date(a.at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                        {a.minutes ? ` · ${a.minutes} min` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </More>
      </div>
    </WidgetFrame>
  );
}

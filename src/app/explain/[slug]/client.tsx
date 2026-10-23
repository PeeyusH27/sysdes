"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Lightbulb, Mic, PenLine, RotateCcw } from "lucide-react";
import { EXPLAIN_STEP_LABEL, type Explain, type SayIt } from "@content/extras";
import { SayItCard } from "@/components/content/SayIt";
import { useExplainDrafts } from "@/lib/explain-store";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** How long an interviewer would expect each step to take, in minutes, in a 45-minute round. */
const SUGGESTED: Record<string, number> = { clarify: 3, estimate: 3, interface: 4, design: 12, deepdive: 10 };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * "Explain it back": the interview as five steps, one at a time. Write it, or say it out loud; then compare with a
 * checklist and the model answer. Nothing leaves the browser.
 */
export function ExplainClient({ slug, title, minutes, explain, say }: { slug: string; title: string; minutes: number; explain: Explain; say: SayIt }) {
  const hydrated = useHydrated();
  const drafts = useExplainDrafts((s) => s.drafts[slug]);
  const savedTicks = useExplainDrafts((s) => s.ticks[slug]);
  const write = useExplainDrafts((s) => s.write);
  const setTicks = useExplainDrafts((s) => s.setTicks);
  const clear = useExplainDrafts((s) => s.clear);
  const saveExplain = useProgress((s) => s.saveExplain);
  const last = useProgress((s) => s.explain[slug]);

  const [at, setAt] = useState(-1); // -1 intro, 0..4 the steps, 5 the check
  const [aloud, setAloud] = useState(false);
  const [hint, setHint] = useState(false);
  const goTo = (n: number) => {
    setAt(n);
    setHint(false);
  };

  if (!hydrated) return <p className="container muted">Loading…</p>;

  const total = explain.steps.length;
  const ticks = new Set(savedTicks ?? []);
  const score = explain.checklist.length ? ticks.size / explain.checklist.length : 0;

  const toggleTick = (i: number) => {
    const next = new Set(ticks);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setTicks(slug, [...next].sort((a, b) => a - b));
  };

  if (at < 0) {
    return (
      <div className="container ex">
        <p className="eyebrow">Explain it back</p>
        <h1>{title}</h1>
        <p className="lede">
          Reading an answer is not the same as giving one. Take the five steps of an interview one at a time and answer each in your own words, then compare with what a strong answer includes. Allow about {Math.min(minutes, 40)} minutes.
        </p>
        <ol className="ex-steps-preview">
          {explain.steps.map((s) => (
            <li key={s.id}>
              <b>{EXPLAIN_STEP_LABEL[s.id]}</b> <span className="muted">about {SUGGESTED[s.id]} min</span>
            </li>
          ))}
        </ol>
        {last && (
          <p className="muted">
            Last time you covered {Math.round(last.score * 100)}% of the checklist ({new Date(last.at).toLocaleDateString()}).
          </p>
        )}
        <div className="ex-actions">
          <button type="button" className="btn btn-primary" onClick={() => goTo(0)}>
            {drafts && Object.keys(drafts).length ? "Continue" : "Start"} <ArrowRight size={16} aria-hidden />
          </button>
          <Link href={`/questions/${slug}`} className="btn">
            Read the answer first
          </Link>
        </div>
      </div>
    );
  }

  if (at >= total) {
    return (
      <div className="container ex">
        <p className="eyebrow">Check yourself</p>
        <h1>Did your answer cover these?</h1>
        <p className="muted">Tick what you actually said or wrote. Be strict: an interviewer will be.</p>
        <ul className="ex-checklist">
          {explain.checklist.map((c, i) => (
            <li key={c}>
              <label>
                <input type="checkbox" checked={ticks.has(i)} onChange={() => toggleTick(i)} /> {c}
              </label>
            </li>
          ))}
        </ul>
        <p className="ex-score" role="status" aria-live="polite">
          <b>{Math.round(score * 100)}%</b> of the checklist
          {score >= 0.85 ? ". That is an answer you could give." : score >= 0.5 ? ". Close: look at what you left out." : ". Read the answer, then try again."}
        </p>
        <h2 className="section-title">The model answer in 30 seconds</h2>
        <SayItCard title={title} say={say} />
        <div className="ex-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              saveExplain(slug, score);
            }}
          >
            Save my result
          </button>
          <Link href={`/questions/${slug}`} className="btn">
            Review the answer
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              clear(slug);
              setAt(-1);
            }}
          >
            <RotateCcw size={14} aria-hidden /> Start over
          </button>
        </div>
        {last && <p className="muted">Saved: {Math.round(last.score * 100)}% on {new Date(last.at).toLocaleDateString()}.</p>}
      </div>
    );
  }

  const step = explain.steps[at];
  return (
    <div className="container ex">
      <ol className="ex-dots" aria-label="Steps">
        {explain.steps.map((s, i) => (
          <li key={s.id} aria-current={i === at ? "step" : undefined} data-done={i < at || undefined}>
            <button type="button" onClick={() => goTo(i)} aria-label={`${i + 1}. ${EXPLAIN_STEP_LABEL[s.id]}`}>
              {i + 1}
            </button>
            <span>{EXPLAIN_STEP_LABEL[s.id]}</span>
          </li>
        ))}
      </ol>
      <p className="eyebrow">
        Step {at + 1} of {total} · {title}
      </p>
      <h1>{EXPLAIN_STEP_LABEL[step.id]}</h1>
      <p className="ex-prompt">{step.prompt}</p>
      <StepTimer key={step.id} minutes={SUGGESTED[step.id]} />

      <div className="seg" role="group" aria-label="How to answer">
        <button type="button" aria-pressed={!aloud} onClick={() => setAloud(false)}>
          <PenLine size={14} aria-hidden /> Write it
        </button>
        <button type="button" aria-pressed={aloud} onClick={() => setAloud(true)}>
          <Mic size={14} aria-hidden /> Say it aloud
        </button>
      </div>
      {aloud ? (
        <p className="ex-aloud">Say your answer out loud, as you would to an interviewer. Talk through your reasoning, not just your conclusion. Press Next when you are done.</p>
      ) : (
        <textarea
          className="ex-text"
          aria-label={`Your answer: ${EXPLAIN_STEP_LABEL[step.id]}`}
          rows={9}
          value={drafts?.[step.id] ?? ""}
          onChange={(e) => write(slug, step.id, e.target.value)}
          placeholder="Write it the way you would say it."
        />
      )}
      <div className="ex-hint">
        <button type="button" className="wbtn" onClick={() => setHint(!hint)} aria-expanded={hint}>
          <Lightbulb size={13} aria-hidden /> {hint ? "Hide the hint" : "Stuck? A hint"}
        </button>
        {hint && <p>{step.hint}</p>}
      </div>
      <div className="ex-actions">
        <button type="button" className="btn" onClick={() => goTo(at - 1)} disabled={at === 0}>
          <ArrowLeft size={15} aria-hidden /> Back
        </button>
        <button type="button" className="btn btn-primary" onClick={() => goTo(at + 1)}>
          {at === total - 1 ? "Check my answer" : "Next step"} <ArrowRight size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Counts up while a step is on screen. Mounted fresh for each step (by `key`), so it starts at zero without any reset logic. */
function StepTimer({ minutes }: { minutes: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="ex-timer" data-over={seconds > minutes * 60 || undefined}>
      {mmss(seconds)} <span className="muted">of about {minutes} min</span>
    </p>
  );
}

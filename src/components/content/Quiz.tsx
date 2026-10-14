"use client";
import { useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import { useProgress } from "@/lib/progress";

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

/**
 * One question at a time with a pager (Previous / Next and a dot per question), so the quiz stays about the height of
 * one question. Scoring is unchanged: answer every question, press Check answers, and 2 out of 3 or better saves the
 * page as complete. After checking, each question shows its explanation and the dots show right or wrong.
 */
export function Quiz({ items, title = "Check yourself" }: { items: QuizItem[]; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const href = usePathname();
  const saveQuiz = useProgress((s) => s.saveQuiz);
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const [checked, setChecked] = useState(false);
  const [at, setAt] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const score = items.filter((it, i) => picked[i] === it.answer).length;
  const n = items.length;
  const it = items[at];
  const legend = useRef<HTMLLegendElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  const answered = picked.filter((p) => p !== null).length;

  // Moving to another question puts focus on its text, so a screen reader reads the new question straight away.
  const go = (i: number, focus = true) => {
    setAt(Math.max(0, Math.min(n - 1, i)));
    setNudge(null);
    if (focus) requestAnimationFrame(() => legend.current?.focus({ preventScroll: true }));
  };

  const check = () => {
    const missing = picked.findIndex((p) => p === null);
    if (missing >= 0) {
      setAt(missing);
      setNudge(`Answer question ${missing + 1} first: ${answered} of ${n} answered.`);
      requestAnimationFrame(() => legend.current?.focus({ preventScroll: true }));
      return;
    }
    setChecked(true);
    setNudge(null);
    saveQuiz(href, score / n);
    setAt(0);
    requestAnimationFrame(() => summary.current?.focus({ preventScroll: true }));
  };

  const state = (i: number) => (picked[i] === null ? "open" : !checked ? "answered" : picked[i] === items[i].answer ? "correct" : "wrong");
  const stateWord = { open: "not answered", answered: "answered", correct: "correct", wrong: "wrong" } as const;
  const last = at === n - 1;
  const canCheck = !checked && (last || answered === n);

  return (
    <section className="quiz" aria-labelledby={`${uid}-title`}>
      <div className="quiz-head">
        <h3 id={`${uid}-title`}>{title}</h3>
        <span className="quiz-count">
          Question {at + 1} of {n}
        </span>
      </div>
      {!checked && <p className="quiz-note">Score 2 out of 3 or better to mark this page complete.</p>}
      <div className="result" aria-live="polite">
        {checked && (
          <>
            <p ref={summary} tabIndex={-1} className="quiz-score">
              <strong>
                {score} / {n} correct
              </strong>
            </p>
            {score / n >= 2 / 3 && (
              <span className="pill ok-ink">
                <CheckCircle2 size={13} aria-hidden /> Page marked complete
              </span>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setChecked(false);
                setPicked(items.map(() => null));
                go(0);
              }}
            >
              <RotateCcw size={13} aria-hidden /> Try again
            </button>
          </>
        )}
      </div>
      <fieldset key={at} className="quiz-q">
        <legend ref={legend} tabIndex={-1}>
          <span className="quiz-qno">{at + 1}.</span> {it.q}
        </legend>
        {it.options.map((opt, k) => {
          const s = checked ? (k === it.answer ? "correct" : picked[at] === k ? "wrong" : undefined) : undefined;
          return (
            <label key={k} data-state={s}>
              <input
                type="radio"
                name={`${uid}-q${at}`}
                checked={picked[at] === k}
                disabled={checked}
                onChange={() => {
                  setPicked((p) => p.map((v, j) => (j === at ? k : v)));
                  setNudge(null);
                }}
              />
              <span>{opt}</span>
              {s === "correct" && (
                <span className="quiz-mark ok-ink">
                  <CheckCircle2 size={15} aria-hidden />
                  <span className="sr-only">(right answer)</span>
                </span>
              )}
              {s === "wrong" && (
                <span className="quiz-mark bad-ink">
                  <XCircle size={15} aria-hidden />
                  <span className="sr-only">(your answer, wrong)</span>
                </span>
              )}
            </label>
          );
        })}
        {checked && it.explain && <p className="explain">{it.explain}</p>}
      </fieldset>
      <nav className="quiz-pager" aria-label={`${title}: questions`}>
        <button type="button" className="btn btn-sm quiz-prev" onClick={() => go(at - 1)} disabled={at === 0}>
          <ChevronLeft size={14} aria-hidden /> Previous
        </button>
        <ol className="quiz-dots">
          {items.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                data-state={state(i)}
                aria-current={i === at ? "step" : undefined}
                aria-label={`Question ${i + 1}, ${stateWord[state(i)]}`}
                onClick={() => go(i)}
              >
                {checked ? (state(i) === "correct" ? "✓" : "✕") : i + 1}
              </button>
            </li>
          ))}
        </ol>
        {!canCheck ? (
          <button
            type="button"
            className={picked[at] !== null && !checked ? "btn btn-sm btn-primary quiz-next" : "btn btn-sm quiz-next"}
            onClick={() => go(at + 1)}
            disabled={last}
          >
            Next <ChevronRight size={14} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm quiz-next" onClick={check}>
            Check answers
          </button>
        )}
      </nav>
      {!checked && (
        <p className="quiz-nudge" role="status">
          {nudge ?? ""}
        </p>
      )}
    </section>
  );
}

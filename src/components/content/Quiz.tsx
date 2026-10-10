"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useProgress } from "@/lib/progress";

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export function Quiz({ items, title = "Check yourself" }: { items: QuizItem[]; title?: string }) {
  const href = usePathname();
  const saveQuiz = useProgress((s) => s.saveQuiz);
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const [checked, setChecked] = useState(false);
  const score = items.filter((it, i) => picked[i] === it.answer).length;

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <h3 id="quiz-title">{title}</h3>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Score 2 out of 3 or better to mark this page complete.
      </p>
      {items.map((it, i) => (
        <fieldset key={i}>
          <legend>
            {i + 1}. {it.q}
          </legend>
          {it.options.map((opt, k) => {
            const state = checked ? (k === it.answer ? "correct" : picked[i] === k ? "wrong" : undefined) : undefined;
            return (
              <label key={k} data-state={state}>
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={picked[i] === k}
                  disabled={checked}
                  onChange={() => setPicked((p) => p.map((v, j) => (j === i ? k : v)))}
                />
                <span>{opt}</span>
              </label>
            );
          })}
          {checked && it.explain && <p className="explain">{it.explain}</p>}
        </fieldset>
      ))}
      <div className="result" aria-live="polite">
        {!checked ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={picked.some((p) => p === null)}
            onClick={() => {
              setChecked(true);
              saveQuiz(href, score / items.length);
            }}
          >
            Check answers
          </button>
        ) : (
          <>
            <strong>
              {score} / {items.length} correct
            </strong>
            {score / items.length >= 2 / 3 && (
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
              }}
            >
              <RotateCcw size={13} aria-hidden /> Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}

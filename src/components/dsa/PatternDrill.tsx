"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import { buildDeck, type DrillQuestion, type DrillRow } from "@/lib/dsa/drill";
import { useProgress } from "@/lib/progress";

export interface DrillPatternInfo {
  slug: string;
  title: string;
  short: string;
  group: string;
  signals: string[];
}

const ROUND = 10;

/** "Which pattern is this?": read a problem, pick the pattern, then see the signals in the statement that gave it away. */
export function PatternDrill({ rows, patterns }: { rows: DrillRow[]; patterns: DrillPatternInfo[] }) {
  const info = (slug: string) => patterns.find((p) => p.slug === slug)!;
  const record = useProgress((s) => s.recordDrill);
  const [deck, setDeck] = useState<DrillQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<DrillQuestion[]>([]);

  const start = () => {
    setDeck(buildDeck(rows, patterns, Date.now() & 0x7fffffff, ROUND));
    setI(0);
    setPicked(null);
    setMissed([]);
  };

  const q = deck?.[i];
  const answered = picked !== null;
  const finished = deck !== null && i >= deck.length;

  const choose = (slug: string) => {
    if (!q || answered) return;
    setPicked(slug);
    record(q.answer, slug === q.answer);
    if (slug !== q.answer) setMissed((m) => [...m, q]);
  };
  const next = () => {
    setPicked(null);
    setI((n) => n + 1);
  };

  // 1–4 pick an option; Enter goes to the next question.
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length && !answered) choose(q.options[n - 1]);
      else if (e.key === "Enter" && answered) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, answered]);

  if (!deck) {
    return (
      <div className="drill-card">
        <h2>Ten problems, one question each</h2>
        <p>
          You see what a problem asks, not its name. Pick the pattern you would reach for. After each answer you see the signals in the statement that point to it,
          which is the skill that turns a new problem into a familiar one.
        </p>
        <button type="button" className="btn btn-primary" onClick={start}>
          Start a round <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    );
  }

  if (finished) {
    const score = deck.length - missed.length;
    return (
      <div className="drill-card" aria-live="polite">
        <h2>
          {score} / {deck.length}
        </h2>
        <p>{missed.length === 0 ? "A clean round. Try another." : "Review what you missed, then play again."}</p>
        {missed.length > 0 && (
          <ul className="drill-missed">
            {missed.map((m) => (
              <li key={m.slug}>
                <Link href={`/dsa/problems/${m.slug}`} className="link">
                  {m.title}
                </Link>
                <span>
                  was <Link href={`/dsa/patterns/${m.answer}`} className="link">{info(m.answer).title}</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-primary" onClick={start}>
          <RotateCcw size={15} aria-hidden /> Another round
        </button>
      </div>
    );
  }

  if (!q) return null;
  const correct = picked === q.answer;
  return (
    <div className="drill-card">
      <p className="drill-meta">
        <span>
          Question {i + 1} of {deck.length}
        </span>
        <span className={`diff diff-${q.difficulty}`}>{q.difficulty}</span>
      </p>
      <p className="drill-prompt">{q.summary}</p>
      <div className="drill-options" role="group" aria-label="Which pattern fits?">
        {q.options.map((slug, n) => {
          const state = !answered ? "" : slug === q.answer ? "right" : slug === picked ? "wrong" : "dim";
          return (
            <button key={slug} type="button" className={`drill-option ${state}`} onClick={() => choose(slug)} disabled={answered} aria-keyshortcuts={String(n + 1)}>
              <kbd aria-hidden>{n + 1}</kbd>
              <span>
                <b>{info(slug).short}</b>
                <small>{info(slug).group}</small>
              </span>
              {state === "right" && <CircleCheck size={16} aria-hidden />}
              {state === "wrong" && <CircleX size={16} aria-hidden />}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="drill-reveal" aria-live="polite">
          <p>
            <b>{correct ? "Right." : "Not quite."}</b> <b>{q.title}</b> is a <Link href={`/dsa/patterns/${q.answer}`} className="link">{info(q.answer).title}</Link> problem.
          </p>
          <p className="drill-signals">
            <span>Spot it:</span>
            {info(q.answer).signals.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </p>
          <div className="drill-actions">
            <button type="button" className="btn btn-primary" onClick={next} autoFocus>
              {i + 1 === deck.length ? "See results" : "Next"} <ArrowRight size={15} aria-hidden />
            </button>
            <Link href={`/dsa/problems/${q.slug}`} className="btn">
              Solve it
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

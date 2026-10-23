"use client";
import Link from "next/link";
import { ArrowRight, CircleCheck, CircleX } from "lucide-react";
import type { Catalog } from "@/lib/prep/catalog-types";
import { MOCK_LABEL, mockScore, mockVerdict, type MockOutcome } from "@/lib/prep/mock";
import { useMock } from "@/lib/prep/mock-store";
import { useHydrated } from "@/lib/hooks";

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/** Where to go to fix what a round showed: the lesson behind a missed problem, exercise or design. */
function reviewFor(o: MockOutcome, c: Catalog): { label: string; href: string } | null {
  if (o.kind === "problem") {
    const p = c.patterns.find((x) => x.problems.some((q) => q.slug === o.slug));
    return p ? { label: `Review ${p.title}`, href: `/dsa/patterns/${p.slug}` } : null;
  }
  if (o.kind === "exercise") {
    const l = c.lldLessons.find((x) => x.exercises.some((q) => q.slug === o.slug));
    return l ? { label: `Review ${l.short}`, href: `/lld/foundations/${l.slug}` } : null;
  }
  const ch = c.challenges.find((x) => x.slug === o.slug);
  return ch ? { label: `Review the ${ch.title} answer`, href: ch.learn } : null;
}

export function DebriefClient({ catalog }: { catalog: Catalog }) {
  const hydrated = useHydrated();
  const last = useMock((s) => s.last);
  const active = useMock((s) => s.active);
  if (!hydrated) return <p className="container muted">Loading…</p>;
  if (!last)
    return (
      <div className="container hub" data-track="sd">
        <header className="page-head hub-head">
          <h1>No round to review yet</h1>
          <p className="lede">{active ? "Your round is still running. Finish it from the timer in the corner." : "Start a mock round and the debrief appears here when it ends."}</p>
          <Link href="/mock" className="btn btn-primary">
            Go to mock rounds
          </Link>
        </header>
      </div>
    );

  const score = mockScore(last);
  const missed = last.outcomes.filter((o) => !o.solved);
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">Debrief · {MOCK_LABEL[last.type]}</p>
        <h1>
          {score}% <span className="grad">{score >= 80 ? "Strong round" : score >= 55 ? "A close one" : "Now you know"}</span>
        </h1>
        <p className="lede">{mockVerdict(score)}</p>
        <ul className="hub-facts">
          <li>
            <b>{last.outcomes.filter((o) => o.solved).length}</b> of {last.outcomes.length} solved
          </li>
          <li>
            <b>{mmss(last.endedAt - last.startedAt)}</b> used of {Math.round(last.durationMs / 60000)} min{last.timedOut ? " (timer ended)" : ""}
          </li>
        </ul>
      </header>

      <ol className="db-list">
        {last.outcomes.map((o) => {
          const review = reviewFor(o, catalog);
          return (
            <li key={o.slug} className="db-item card" data-ok={o.solved || undefined}>
              <h3>
                {o.solved ? <CircleCheck size={18} aria-hidden className="ok-ink" /> : <CircleX size={18} aria-hidden className="bad-ink" />} {o.title}
              </h3>
              <p className="muted">
                {o.kind === "challenge"
                  ? `Your design scored ${o.percent ?? 0}% against the rubric.`
                  : o.solved
                    ? `Solved${o.solvedAfterMs !== undefined ? ` after ${mmss(o.solvedAfterMs)}` : ""}${o.attempts > 1 ? ` with ${o.attempts - 1} wrong submission${o.attempts > 2 ? "s" : ""} first` : " on the first submission"}.`
                    : `Not solved in time${o.attempts ? `, ${o.attempts} submission${o.attempts > 1 ? "s" : ""}` : ", nothing submitted"}.`}
              </p>
              {o.missed && o.missed.length > 0 && (
                <>
                  <p className="db-sub">What the design was missing</p>
                  <ul className="db-missed">
                    {o.missed.map((m) => (
                      <li key={m.label}>
                        <b>{m.label}</b> <span className="muted">{m.hint}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="db-actions">
                <Link href={o.href} className="btn btn-sm">
                  {o.solved ? "Open it again" : "Try it again, with hints"}
                </Link>
                {review && !o.solved && (
                  <Link href={review.href} className="btn btn-sm btn-primary">
                    {review.label} <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="pl-mock card">
        <p>{missed.length ? "Work through the review links, then try a fresh round." : "Nothing to fix here. Try a different round type, or a longer one."}</p>
        <div className="pl-actions">
          <Link href={`/mock?type=${last.type}`} className="btn btn-primary">
            Another round
          </Link>
          <Link href="/plan" className="btn">
            Back to my plan
          </Link>
        </div>
      </div>
    </div>
  );
}

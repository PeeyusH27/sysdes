"use client";
import { createContext, useContext, useState } from "react";
import { Check, X } from "lucide-react";
import type { PageChecks } from "@content/checks";

const ChecksContext = createContext<PageChecks | undefined>(undefined);

/** Gives the section cards of one page their tap-to-answer questions (content/checks). */
export function ChecksProvider({ checks, children }: { checks?: PageChecks; children: React.ReactNode }) {
  return <ChecksContext.Provider value={checks}>{children}</ChecksContext.Provider>;
}

/**
 * The foot of a section card: one question, answered with a tap. The answer and the reason show straight away, right or
 * wrong, because the point is a ten-second check that the card landed, not a score. Renders nothing for a section
 * without a check.
 */
export function CardCheck({ id }: { id: string }) {
  const check = useContext(ChecksContext)?.[id];
  const [picked, setPicked] = useState<number | null>(null);
  if (!check) return null;
  const done = picked !== null;
  return (
    <div className="cardcheck" role="group" aria-label="Quick check" data-done={done ? (picked === check.answer ? "right" : "wrong") : undefined}>
      <p className="cardcheck-q">
        <span className="eyebrow">Quick check</span>
        {check.q}
      </p>
      <div className="cardcheck-options">
        {check.options.map((o, i) => {
          const state = !done ? undefined : i === check.answer ? "right" : i === picked ? "wrong" : "idle";
          return (
            <button key={o} type="button" className="cardcheck-opt" data-state={state} disabled={done} onClick={() => setPicked(i)}>
              {state === "right" && <Check size={14} aria-hidden />}
              {state === "wrong" && <X size={14} aria-hidden />}
              {o}
            </button>
          );
        })}
      </div>
      <p className="cardcheck-why" aria-live="polite">
        {done ? (picked === check.answer ? `Right. ${check.why}` : `Not quite. ${check.why}`) : ""}
      </p>
    </div>
  );
}

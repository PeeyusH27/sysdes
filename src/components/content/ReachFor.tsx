"use client";
import { useState } from "react";
import { Check, Crosshair, Sparkles } from "lucide-react";

export interface ReachVariant {
  name: string;
  /** What this variant keeps, moves or does; labelled by `howLabel`. */
  how?: string;
  /** Classic problems (comma separated, shown as chips) or, with another `extraLabel`, a short phrase. */
  extra?: string;
}

/** Inline `code` and **bold** from a plain string; nothing else is supported, which is all the signals use. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
        part.startsWith("**") ? (
          <mark key={i} className="reach-key">
            {part.slice(2, -2)}
          </mark>
        ) : part.startsWith("`") ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** The **bold** phrases of every signal: the handful of words worth remembering. */
const keywords = (signals: string[]) => [...new Set(signals.flatMap((s) => [...s.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].replace(/^["“]+|["”]+$/g, ""))))];

const VERDICT = ["Tap the signals you can see in the problem.", "One signal. Keep reading, it might be this.", "Two signals. This pattern is a strong candidate."];

/**
 * "When to reach for it": the signals as a tick-list that fills a meter (so the reader practises spotting them),
 * a strip of the keywords to remember, and the variants as cards with their classic problems as chips.
 * Replaces the old callout and table; the data is plain props so it stays writable in MDX.
 */
export function ReachFor({
  signals,
  variants = [],
  howLabel = "How it works",
  extraLabel = "Classic problems",
}: {
  signals: string[];
  variants?: ReachVariant[];
  howLabel?: string;
  extraLabel?: string;
}) {
  const [on, setOn] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  const count = on.size;
  const verdict = count >= signals.length ? "Every signal matches. Reach for it." : VERDICT[Math.min(count, 2)];
  const keys = keywords(signals);
  const asChips = extraLabel === "Classic problems";

  return (
    <div className="reach">
      <div className="reach-signals">
        <div className="reach-head">
          <span className="reach-title">
            <Crosshair size={15} aria-hidden /> Spot it in the problem
          </span>
          <span className="reach-meter" role="status" aria-live="polite">
            <span className="reach-dots" aria-hidden>
              {signals.map((_, i) => (
                <i key={i} data-on={i < count ? "" : undefined} />
              ))}
            </span>
            {count} of {signals.length}
          </span>
        </div>
        <ul className="reach-list">
          {signals.map((s, i) => (
            <li key={s}>
              <button type="button" className="reach-signal" aria-pressed={on.has(i)} onClick={() => toggle(i)}>
                <span className="reach-tick" aria-hidden>
                  {on.has(i) ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="reach-text">
                  <Inline text={s} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="reach-verdict" data-hot={count > 0 ? "" : undefined}>
          <Sparkles size={14} aria-hidden /> {verdict}
        </p>
        {keys.length > 0 && (
          <p className="reach-keys">
            <span>Remember</span>
            {keys.map((k) => (
              <b key={k}>{k}</b>
            ))}
          </p>
        )}
      </div>

      {variants.length > 0 && (
        <div className="reach-variants">
          <div className="reach-head">
            <span className="reach-title">Pick your variant</span>
          </div>
          <ul className="reach-cards">
            {variants.map((v, i) => (
              <li key={v.name} className="reach-card" style={{ "--i": i } as React.CSSProperties}>
                <strong>
                  <Inline text={v.name} />
                </strong>
                {v.how && (
                  <p>
                    <small>
                      <Inline text={howLabel} />
                    </small>
                    <Inline text={v.how} />
                  </p>
                )}
                {v.extra &&
                  (asChips ? (
                    <span className="reach-chips" aria-label={extraLabel}>
                      {v.extra.split(/,\s*/).map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </span>
                  ) : (
                    <p>
                      <small>{extraLabel}</small>
                      <Inline text={v.extra} />
                    </p>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

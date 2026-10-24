"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Compass, Lightbulb, Target } from "lucide-react";
import { BASICS_LABEL, BASICS_TABS, type Basics } from "@content/basics";

const ICON = { what: BookOpen, why: Target, example: Lightbulb, when: Compass } as const;

/**
 * "Start here": what the topic is, why it is used, a real-life example and when to reach for it. A rail of four large
 * tabs on the left (a row you can swipe on a phone), the text on the right, and Back / Next under it. The four texts sit
 * in one grid cell and only the chosen one shows, so the card never changes height when you switch. It sits above both
 * views of a page, so a reader who skips the walkthrough still meets the idea before the details.
 */
export function BasicsCard({ title, basics }: { title: string; basics: Basics }) {
  const [at, setAt] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const last = BASICS_TABS.length - 1;
  const go = (n: number, focus = false) => {
    const k = Math.max(0, Math.min(last, n));
    setAt(k);
    // Arrow keys on the rail move focus with the choice. Back and Next keep focus on themselves, so a keyboard reader can press Next again;
    // the chosen tab still scrolls into view on the phone, where the rail is a row you swipe.
    if (focus) tabs.current[k]?.focus();
    else tabs.current[k]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next: Record<string, number> = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: last };
    if (!(e.key in next) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    go(next[e.key], true);
  };
  return (
    <section className="basics" aria-label={`Start here: ${title}`}>
      <div className="basics-side">
        <span className="eyebrow">Start here</span>
        <div className="basics-tabs" role="tablist" aria-orientation="vertical" aria-label="Parts of the basics" onKeyDown={onKey}>
          {BASICS_TABS.map((t, i) => {
            const Icon = ICON[t];
            return (
              <button
                key={t}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`basics-tab-${t}`}
                aria-selected={at === i}
                aria-controls={`basics-panel-${t}`}
                tabIndex={at === i ? 0 : -1}
                onClick={() => go(i)}
              >
                <Icon size={17} aria-hidden />
                <span>{BASICS_LABEL[t]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="basics-main">
        <div className="basics-panels">
          {BASICS_TABS.map((t, i) => (
            <div key={t} className="basics-panel" role="tabpanel" id={`basics-panel-${t}`} aria-labelledby={`basics-tab-${t}`} data-active={at === i ? "" : undefined}>
              <h3>{BASICS_LABEL[t]}</h3>
              <p>{basics[t]}</p>
            </div>
          ))}
        </div>
        <div className="basics-step">
          <span aria-hidden>
            {at + 1} of {BASICS_TABS.length}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous part">
            <ArrowLeft size={15} aria-hidden /> Back
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => go(at + 1)} disabled={at === last} aria-label="Next part">
            Next <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

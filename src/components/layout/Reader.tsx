"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, GalleryHorizontalEnd, PartyPopper, Rows3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/**
 * The lesson reader. MDX sections arrive as server-rendered `.sec-card`s (see rehype-section-cards); this provider
 * finds them in the DOM and adds the interactive layer on top: which section you're on, "Got it" ticks, and the
 * Scroll / Cards modes. In Cards mode only the active card is shown and ←/→ move between cards.
 * Everything here is an enhancement: without JS the page is a normal stack of cards.
 */

interface SectionRef {
  id: string;
  title: string;
}

interface ReaderApi {
  sections: SectionRef[];
  active: string | null;
  activeIndex: number;
  mode: "scroll" | "cards";
  setMode: (mode: "scroll" | "cards") => void;
  go: (id: string) => void;
  step: (delta: 1 | -1) => void;
  isGot: (id: string) => boolean;
  gotCount: number;
  toggleGot: (id: string) => void;
  celebrating: boolean;
}

const ReaderContext = createContext<ReaderApi | null>(null);
export const useReader = () => useContext(ReaderContext);

/** Elements whose own arrow-key handling must win (diagrams, players, editors, form controls). */
const KEY_OWNERS = "input, textarea, select, [contenteditable=true], .cm-editor, figure, .widget, [role=tablist], [role=radiogroup], [role=slider], [role=listbox]";

const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "reduce";

export function Reader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const rootRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<SectionRef[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [celebrating, setCelebrating] = useState(false);
  const storedMode = useProgress((s) => s.readerMode);
  const setStoredMode = useProgress((s) => s.setReaderMode);
  const ticks = useProgress((s) => s.sections);
  const toggleSection = useProgress((s) => s.toggleSection);
  const markDone = useProgress((s) => s.markDone);
  const mode = hydrated ? storedMode : "scroll";

  const cards = useCallback(() => [...(rootRef.current?.querySelectorAll<HTMLElement>(".sec-card") ?? [])], []);
  const cardOf = useCallback((id: string) => cards().find((el) => el.dataset.sec === id), [cards]);

  // Find the section cards once the page is on screen.
  useEffect(() => {
    const found = cards().map((el) => ({ id: el.dataset.sec!, title: el.dataset.title ?? "" }));
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    const target = fromHash ? document.getElementById(fromHash)?.closest<HTMLElement>(".sec-card")?.dataset.sec : undefined;
    // The DOM is the source of truth for which sections exist, so this has to run after render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(found);
    setActive(target ?? found[0]?.id ?? null);
  }, [cards, pathname]);

  const index = sections.findIndex((s) => s.id === active);
  const isGot = useCallback((id: string) => hydrated && !!ticks[`${pathname}#${id}`], [hydrated, ticks, pathname]);
  const gotCount = sections.filter((s) => isGot(s.id)).length;

  /** Scroll so a card's top sits just under the sticky nav and reader bar. */
  const reveal = useCallback(
    (el: HTMLElement | undefined, smooth = true) => {
      if (!el) return;
      el.scrollIntoView({ behavior: smooth && motionOk() ? "smooth" : "auto", block: "start" });
    },
    [],
  );

  const go = useCallback(
    (id: string) => {
      const to = sections.findIndex((s) => s.id === id);
      if (to < 0) return;
      setDir(to >= index ? "next" : "prev");
      setActive(id);
      history.replaceState(history.state, "", `#${id}`);
      // In Cards mode the card only becomes visible on the next render.
      requestAnimationFrame(() => reveal(cardOf(id), mode === "scroll"));
    },
    [sections, index, mode, reveal, cardOf],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const to = sections[index + delta];
      if (to) go(to.id);
    },
    [sections, index, go],
  );

  const toggleGot = useCallback(
    (id: string) => {
      const key = `${pathname}#${id}`;
      const marking = !ticks[key];
      toggleSection(key);
      if (!marking) return;
      const remaining = sections.filter((s) => s.id !== id && !ticks[`${pathname}#${s.id}`]);
      if (remaining.length === 0 && sections.length > 0) {
        markDone(pathname);
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), 3200);
        return;
      }
      // Ticking a card moves you on to the next one, which is the whole point of reading in cards.
      const i = sections.findIndex((s) => s.id === id);
      const next = sections[i + 1];
      if (next) window.setTimeout(() => go(next.id), 420);
    },
    [pathname, ticks, toggleSection, sections, markDone, go],
  );

  const setMode = useCallback(
    (m: "scroll" | "cards") => {
      setStoredMode(m);
      const id = active;
      requestAnimationFrame(() => reveal(id ? cardOf(id) : undefined, false));
    },
    [setStoredMode, active, reveal, cardOf],
  );

  // Scroll mode: the active section is the last one whose top has passed 30% of the viewport.
  useEffect(() => {
    if (mode !== "scroll" || !sections.length) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.3;
        let current = sections[0].id;
        for (const el of cards()) {
          if (el.getBoundingClientRect().top <= line) current = el.dataset.sec!;
          else break;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode, sections, cards]);

  // Cards mode: show only the active card (the CSS hides the rest).
  useEffect(() => {
    for (const el of cards()) el.toggleAttribute("data-active", mode === "cards" && el.dataset.sec === active);
  }, [mode, active, sections, cards]);

  // Cards mode: ←/→ move between cards unless something focused wants the arrows.
  useEffect(() => {
    if (mode !== "cards") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.target instanceof Element && e.target.closest(KEY_OWNERS)) return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, step]);

  // Links to #anchors (the "On this page" list, search results) open the card that holds the anchor.
  useEffect(() => {
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const sec = id ? document.getElementById(id)?.closest<HTMLElement>(".sec-card")?.dataset.sec : undefined;
      if (sec) setActive(sec);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const api = useMemo<ReaderApi>(
    () => ({ sections, active, activeIndex: index, mode, setMode, go, step, isGot, gotCount, toggleGot, celebrating }),
    [sections, active, index, mode, setMode, go, step, isGot, gotCount, toggleGot, celebrating],
  );

  return (
    <ReaderContext.Provider value={api}>
      <div ref={rootRef} className="reader" data-mode={mode} data-dir={dir}>
        {children}
      </div>
    </ReaderContext.Provider>
  );
}

export function ProgressRing({ value, total, size = 34 }: { value: number; total: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const f = total ? value / total : 0;
  return (
    <svg className="progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden data-full={total > 0 && value === total}>
      <circle className="pr-track" cx={size / 2} cy={size / 2} r={r} />
      <circle className="pr-fill" cx={size / 2} cy={size / 2} r={r} strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle">
        {total ? value : "–"}
      </text>
    </svg>
  );
}

/** Sticky bar above the lesson: progress, the current section (opens a jump list) and the mode switch. */
export function ReaderBar() {
  const r = useReader();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  if (!r) return null;
  const { sections, activeIndex, mode, gotCount } = r;
  const current = sections[activeIndex];
  return (
    <div className={cn("reader-bar no-print", r.celebrating && "is-celebrating")}>
      <div className="rb-progress" title={`${gotCount} of ${sections.length} sections ticked`}>
        <ProgressRing value={gotCount} total={sections.length} />
        <span className="sr-only">
          {gotCount} of {sections.length} sections ticked
        </span>
      </div>
      <div className="rb-where" ref={boxRef}>
        <button type="button" className="rb-current" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} disabled={!sections.length}>
          <small>{current ? `Section ${activeIndex + 1} of ${sections.length}` : "Sections"}</small>
          <span key={current?.id} className="rb-title">
            {r.celebrating ? "Lesson complete. Nice work." : (current?.title ?? "Overview")}
          </span>
          <ChevronDown size={15} aria-hidden className="rb-chev" />
        </button>
        {open && (
          <ol className="rb-menu">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={i === activeIndex ? "step" : undefined}
                  onClick={() => {
                    setOpen(false);
                    r.go(s.id);
                  }}
                >
                  <span className="rb-menu-n" data-got={r.isGot(s.id)}>
                    {r.isGot(s.id) ? <Check size={12} aria-label="Ticked" /> : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      {r.celebrating && <PartyPopper size={18} aria-hidden className="rb-party" />}
      {mode === "cards" && (
        <div className="rb-step">
          <button type="button" className="icon-btn" aria-label="Previous section" disabled={activeIndex <= 0} onClick={() => r.step(-1)}>
            <ArrowLeft size={17} aria-hidden />
          </button>
          <button type="button" className="icon-btn" aria-label="Next section" disabled={activeIndex >= sections.length - 1} onClick={() => r.step(1)}>
            <ArrowRight size={17} aria-hidden />
          </button>
        </div>
      )}
      <div className="seg rb-mode" role="group" aria-label="Reading mode">
        <button type="button" aria-pressed={mode === "scroll"} onClick={() => r.setMode("scroll")} aria-label="Scroll" title="Read the whole page" disabled={!sections.length}>
          <Rows3 size={14} aria-hidden /> <span>Scroll</span>
        </button>
        <button type="button" aria-pressed={mode === "cards"} onClick={() => r.setMode("cards")} aria-label="Cards" title="One section at a time (← →)" disabled={!sections.length}>
          <GalleryHorizontalEnd size={14} aria-hidden /> <span>Cards</span>
        </button>
      </div>
    </div>
  );
}

/** Cards mode: previous / dots / next under the active card. */
export function DeckNav() {
  const r = useReader();
  if (!r || r.mode !== "cards" || !r.sections.length) return null;
  const { sections, activeIndex } = r;
  const last = activeIndex >= sections.length - 1;
  return (
    <nav className="deck-nav no-print" aria-label="Section cards">
      <button type="button" className="btn" onClick={() => r.step(-1)} disabled={activeIndex <= 0}>
        <ArrowLeft size={16} aria-hidden /> Back
      </button>
      <ol className="deck-dots">
        {sections.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              aria-label={`${i + 1}. ${s.title}${r.isGot(s.id) ? " (ticked)" : ""}`}
              aria-current={i === activeIndex ? "step" : undefined}
              data-got={r.isGot(s.id)}
              onClick={() => r.go(s.id)}
            />
          </li>
        ))}
      </ol>
      <span className="deck-count" aria-hidden>
        {activeIndex + 1} / {sections.length}
      </span>
      <button type="button" className="btn btn-primary" onClick={() => r.step(1)} disabled={last}>
        {last ? "Last card" : "Next"} <ArrowRight size={16} aria-hidden />
      </button>
      <p className="deck-hint">
        <kbd>←</kbd> <kbd>→</kbd> to flip cards
      </p>
    </nav>
  );
}

/** "On this page" with live position and ticks. Server-rendered links work without JS. */
export function SectionMap({ headings, hidden }: { headings: { depth: 2 | 3; text: string; id: string }[]; hidden?: boolean }) {
  const r = useReader();
  const list = headings.filter((h) => h.depth === 2);
  const inReader = new Set(r?.sections.map((s) => s.id));
  const ticked = r ? list.filter((h) => inReader.has(h.id) && r.isGot(h.id)).length : 0;
  const total = r?.sections.length ?? 0;
  return (
    <aside className="toc section-map" aria-label="On this page" hidden={hidden}>
      {list.length > 0 && (
        <>
          <h2>On this page</h2>
          {total > 0 && (
            <p className="sm-progress">
              <ProgressRing value={ticked} total={total} size={28} /> <span>{ticked === total ? "All sections ticked" : `${ticked} of ${total} ticked`}</span>
            </p>
          )}
          <ul>
            {list.map((h) => {
              const isActive = r?.active === h.id;
              const got = !!r?.isGot(h.id);
              return (
                <li key={h.id} data-active={isActive || undefined} data-got={got || undefined}>
                  <a
                    href={`#${h.id}`}
                    aria-current={isActive ? "location" : undefined}
                    onClick={(e) => {
                      if (r && inReader.has(h.id)) {
                        e.preventDefault();
                        r.go(h.id);
                      }
                    }}
                  >
                    <span className="sm-dot" aria-hidden>
                      {got && <Check size={10} strokeWidth={3} />}
                    </span>
                    {h.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </aside>
  );
}

/** Tick shown in a section card's header. */
export function SectionTick({ id }: { id: string }) {
  const r = useReader();
  if (!r) return null;
  return r.isGot(id) ? (
    <span className="sec-tick" title="You ticked this section">
      <Check size={12} strokeWidth={3} aria-hidden /> Got it
    </span>
  ) : null;
}

/** Footer of a section card: tick it (and move on), or skip ahead. */
export function SectionDone({ id }: { id: string }) {
  const r = useReader();
  if (!r) return null;
  const got = r.isGot(id);
  const i = r.sections.findIndex((s) => s.id === id);
  const next = i >= 0 ? r.sections[i + 1] : undefined;
  return (
    <footer className="sec-foot no-print">
      {/* Server-rendered, so keep it disabled until hydration: a tap before then would be silently lost. */}
      <button type="button" className="got-btn" aria-pressed={got} onClick={() => r.toggleGot(id)} disabled={i < 0}>
        <span className="got-box" aria-hidden>
          <Check size={14} strokeWidth={3} />
        </span>
        Got it
      </button>
      {next && (
        <button type="button" className="sec-next" onClick={() => r.go(next.id)}>
          <span className="muted">Up next</span> {next.title} <ArrowRight size={14} aria-hidden />
        </button>
      )}
    </footer>
  );
}

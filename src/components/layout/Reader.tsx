"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, GalleryHorizontalEnd, Layers, PartyPopper, Rows3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHydrated, useMediaQuery } from "@/lib/hooks";
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
  /** Sections folded away in the Core view (empty when the page has none). */
  detail: string[];
  depth: "core" | "all";
  setDepth: (depth: "core" | "all") => void;
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

export const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "reduce";

const NONE: ReadonlySet<string> = new Set();

export function Reader({ children, detail = [] }: { children: React.ReactNode; detail?: string[] }) {
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
  // "auto": one card at a time on a phone, where a long scroll is hardest to take in; the whole page elsewhere.
  const phone = useMediaQuery("(max-width: 720px)");
  const mode: "scroll" | "cards" = !hydrated ? "scroll" : storedMode === "auto" ? (phone ? "cards" : "scroll") : storedMode;
  const storedDepth = useProgress((s) => s.readerDepth);
  const setStoredDepth = useProgress((s) => s.setReaderDepth);
  // Until the saved choice is known the page is in its Core view, which is also what the server rendered.
  const depth = detail.length ? (hydrated ? storedDepth : "core") : "all";
  const detailKey = detail.join(",");
  // The sections folded away right now: only in the Core view.
  const hidden = useMemo<ReadonlySet<string>>(() => (depth === "core" && detailKey ? new Set(detailKey.split(",")) : NONE), [depth, detailKey]);

  /** The cards a reader can reach: folded ones are not part of the page's flow. */
  const cards = useCallback(() => [...(rootRef.current?.querySelectorAll<HTMLElement>(".sec-card") ?? [])].filter((el) => !hidden.has(el.dataset.sec ?? "")), [hidden]);
  const cardOf = useCallback((id: string) => cards().find((el) => el.dataset.sec === id), [cards]);
  const setDepth = useCallback((d: "core" | "all") => setStoredDepth(d), [setStoredDepth]);

  // Find the section cards once the page is on screen.
  useEffect(() => {
    const found = cards().map((el) => ({ id: el.dataset.sec!, title: el.dataset.title ?? "" }));
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    const target = fromHash ? document.getElementById(fromHash)?.closest<HTMLElement>(".sec-card")?.dataset.sec : undefined;
    // A link into a folded section shows everything first, so the link lands somewhere.
    if (target && detailKey.split(",").includes(target) && depth === "core") setStoredDepth("all");
    // The DOM is the source of truth for which sections exist, so this has to run after render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(found);
    setActive(target ?? found[0]?.id ?? null);
  }, [cards, pathname, depth, detailKey, setStoredDepth]);

  const index = sections.findIndex((s) => s.id === active);
  const isGot = useCallback((id: string) => hydrated && !!ticks[`${pathname}#${id}`], [hydrated, ticks, pathname]);
  const gotCount = sections.filter((s) => isGot(s.id)).length;

  /** Scroll so a card's top sits just under the sticky nav and reader bar (its scroll-margin-top). */
  const reveal = useCallback((el: HTMLElement | undefined, smooth = true) => {
    if (!el) return;
    el.scrollIntoView({ behavior: smooth && motionOk() ? "smooth" : "auto", block: "start" });
  }, []);

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

  // Cards mode shows only the active card (the CSS hides the rest); in both modes the active card is marked current.
  useEffect(() => {
    for (const el of cards()) {
      el.toggleAttribute("data-active", mode === "cards" && el.dataset.sec === active);
      el.toggleAttribute("data-current", el.dataset.sec === active);
    }
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

  // Links to #anchors (in the text, search results) open the card that holds the anchor, and the "Read more" fold
  // around it. Printing opens every fold, so the paper copy has all the words.
  useEffect(() => {
    const unfold = (id: string) => {
      const el = id ? document.getElementById(id) : null;
      const fold = el?.closest<HTMLDetailsElement>("details.sec-more");
      if (fold && !fold.open) {
        fold.open = true;
        requestAnimationFrame(() => el?.scrollIntoView({ block: "start" }));
      }
    };
    unfold(decodeURIComponent(window.location.hash.slice(1)));
    const onPrint = () => document.querySelectorAll<HTMLDetailsElement>("details.sec-more").forEach((d) => (d.open = true));
    window.addEventListener("beforeprint", onPrint);
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      unfold(id);
      const sec = id ? document.getElementById(id)?.closest<HTMLElement>(".sec-card")?.dataset.sec : undefined;
      if (sec && detailKey.split(",").includes(sec)) setStoredDepth("all");
      if (sec) setActive(sec);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [detailKey, setStoredDepth]);

  const api = useMemo<ReaderApi>(
    () => ({ sections, active, activeIndex: index, mode, setMode, detail, depth, setDepth, go, step, isGot, gotCount, toggleGot, celebrating }),
    [sections, active, index, mode, setMode, detail, depth, setDepth, go, step, isGot, gotCount, toggleGot, celebrating],
  );

  return (
    <ReaderContext.Provider value={api}>
      <div ref={rootRef} className="reader" data-mode={mode} data-dir={dir} data-depth={depth}>
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

type Heading = { depth: 2 | 3; text: string; id: string };

/** Scroll to a heading that isn't a section card (e.g. the "Practice problems" list after a pattern). */
function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  history.replaceState(history.state, "", `#${id}`);
  el.scrollIntoView({ behavior: motionOk() ? "smooth" : "auto", block: "start" });
}

/**
 * Sticky bar above the lesson: `lead` (the page-list button), ticked progress, "3 / 14 · Section title ▾" (opens the
 * list of sections and smooth-scrolls to the one you pick), a strip with one segment per section (desktop), and the
 * Scroll / Cards switch. `headings` lets the list render before the cards are found, and adds headings that aren't cards.
 */
export function ReaderBar({ lead, headings = [] }: { lead?: React.ReactNode; headings?: Heading[] }) {
  const r = useReader();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        setOpen(false);
        toggleRef.current?.focus();
      } else if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    // Start on the section you're reading, so ↑/↓ and Enter work straight away.
    menuRef.current?.querySelector<HTMLElement>("[aria-current=step]")?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!r) return null;
  const { sections, activeIndex, mode, gotCount } = r;
  const current = sections[activeIndex];
  const known = new Set(sections.map((s) => s.id));
  const h2s = headings.filter((h) => h.depth === 2 && !(r.depth === "core" && r.detail.includes(h.id)));
  // Before the cards are found (server render, first paint) the headings stand in for them.
  const list: SectionRef[] = sections.length ? sections : h2s.map((h) => ({ id: h.id, title: h.text }));
  const extras = sections.length ? h2s.filter((h) => !known.has(h.id)) : [];
  const total = list.length;

  const pick = (id: string) => {
    setOpen(false);
    if (known.has(id)) r.go(id);
    else jumpTo(id);
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const to = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.min(items.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)));
    e.preventDefault();
    items[to]?.focus();
  };

  return (
    <div className={cn("reader-bar no-print", r.celebrating && "is-celebrating")}>
      {lead}
      <div className="rb-progress" title={`${gotCount} of ${sections.length} sections ticked`}>
        <ProgressRing value={gotCount} total={sections.length} />
        <span className="sr-only">
          {gotCount} of {sections.length} sections ticked
        </span>
      </div>
      <div className="rb-where" ref={boxRef}>
        <button
          ref={toggleRef}
          type="button"
          className="rb-current"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={open ? "rb-menu" : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          disabled={!sections.length}
        >
          <span className="rb-count">
            {current ? (
              <>
                <span className="sr-only">Section </span>
                {activeIndex + 1}
                <span className="rb-of">
                  <span aria-hidden>/</span>
                  <span className="sr-only"> of </span>
                  {total}
                </span>
              </>
            ) : (
              <span className="rb-of">{total || ""}</span>
            )}
          </span>
          <span key={current?.id} className="rb-title">
            {r.celebrating ? "Lesson complete. Nice work." : (current?.title ?? "Sections")}
          </span>
          <ChevronDown size={16} aria-hidden className="rb-chev" />
        </button>
        {open && (
          <div className="rb-menu">
            <p className="rb-menu-head">
              <span>On this page</span>
              <span>
                {gotCount} of {sections.length} ticked
              </span>
            </p>
            <ol id="rb-menu" ref={menuRef} onKeyDown={onMenuKey}>
              {list.map((s, i) => (
                <li key={s.id}>
                  <button type="button" aria-current={i === activeIndex ? "step" : undefined} onClick={() => pick(s.id)} autoFocus={i === Math.max(0, activeIndex)}>
                    <span className="rb-menu-n" data-got={r.isGot(s.id)}>
                      {r.isGot(s.id) ? <Check size={12} aria-label="Ticked" /> : i + 1}
                    </span>
                    {s.title}
                  </button>
                </li>
              ))}
              {extras.map((h) => (
                <li key={h.id} className="rb-menu-extra">
                  <button type="button" onClick={() => pick(h.id)}>
                    <span className="rb-menu-n" aria-hidden>
                      <ArrowRight size={12} />
                    </span>
                    {h.text}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {sections.length > 1 && (
        // Pointer shortcut only: the same jumps are in the section list above, which is the keyboard and screen reader path.
        <div className="rb-track" aria-hidden="true">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              tabIndex={-1}
              title={`${i + 1}. ${s.title}`}
              data-current={i === activeIndex || undefined}
              data-got={r.isGot(s.id) || undefined}
              data-past={i < activeIndex || undefined}
              onClick={() => r.go(s.id)}
            />
          ))}
        </div>
      )}
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
      <DepthToggle className="rb-depth" />
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

/**
 * Desktop outline (from 1080 px, left of the lesson): the page-list button, ticked progress, every section as one
 * row (current one highlighted, ticks shown) and the Scroll / Cards switch. Replaces the reader bar there.
 */
export function SectionRail({ lead, headings = [] }: { lead?: React.ReactNode; headings?: Heading[] }) {
  const r = useReader();
  if (!r) return null;
  const { sections, activeIndex, mode, gotCount } = r;
  const known = new Set(sections.map((s) => s.id));
  const h2s = headings.filter((h) => h.depth === 2 && !(r.depth === "core" && r.detail.includes(h.id)));
  const list: SectionRef[] = sections.length ? sections : h2s.map((h) => ({ id: h.id, title: h.text }));
  const extras = sections.length ? h2s.filter((h) => !known.has(h.id)) : [];
  return (
    <aside className="rail no-print" aria-label="On this page">
      {lead}
      <div className="rail-head">
        <span>On this page</span>
        <span>
          {gotCount}/{sections.length} ticked
        </span>
      </div>
      <ol className="rail-list">
        {list.map((s, i) => (
          <li key={s.id}>
            <button type="button" aria-current={i === activeIndex ? "step" : undefined} onClick={() => (known.has(s.id) ? r.go(s.id) : jumpTo(s.id))}>
              <span className="rail-n" data-got={r.isGot(s.id)}>
                {r.isGot(s.id) ? <Check size={11} aria-label="Ticked" /> : i + 1}
              </span>
              <span className="rail-t">{s.title}</span>
            </button>
          </li>
        ))}
        {extras.map((h) => (
          <li key={h.id}>
            <button type="button" onClick={() => jumpTo(h.id)}>
              <span className="rail-n" aria-hidden>
                <ArrowRight size={11} />
              </span>
              <span className="rail-t">{h.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <DepthToggle className="rail-depth" />
      <div className="seg rail-mode" role="group" aria-label="Reading mode">
        <button type="button" aria-pressed={mode === "scroll"} onClick={() => r.setMode("scroll")} disabled={!sections.length}>
          <Rows3 size={14} aria-hidden /> Scroll
        </button>
        <button type="button" aria-pressed={mode === "cards"} onClick={() => r.setMode("cards")} title="One section at a time (← →)" disabled={!sections.length}>
          <GalleryHorizontalEnd size={14} aria-hidden /> Cards
        </button>
      </div>
    </aside>
  );
}

/**
 * Core / Everything: on a page with folded sections, the spine you can read in a few minutes, or the whole page.
 * Renders nothing on pages without folded sections.
 */
export function DepthToggle({ className }: { className?: string }) {
  const r = useReader();
  if (!r || !r.detail.length) return null;
  return (
    <div className={cn("seg", className)} role="group" aria-label="How much of the page to show">
      <button type="button" aria-pressed={r.depth === "core"} onClick={() => r.setDepth("core")} title="The short version: the sections that carry the idea">
        <Layers size={14} aria-hidden /> Core
      </button>
      <button type="button" aria-pressed={r.depth === "all"} onClick={() => r.setDepth("all")} title={`Show everything: ${r.detail.length} more sections`}>
        Everything <span className="depth-more">+{r.detail.length}</span>
      </button>
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

"use client";
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, BookmarkCheck, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Hand, MessageSquare, RotateCcw, Share2, Shuffle } from "lucide-react";
import type { Short, ShortTrack } from "@content/shorts";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks";
import { useShorts } from "@/lib/shorts-store";
import { Inline } from "./Inline";

export type ShortItem = Short & { codeHtml?: string; sourceTitle?: string };
type Filter = "All" | ShortTrack | "Saved";

const FILTERS: Filter[] = ["All", "System design", "Building blocks", "DSA", "JavaScript", "Saved"];
/** How long a short must stay on screen to count as seen. */
const SEEN_AFTER_MS = 1200;

const motionOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.documentElement.dataset.motion !== "reduce";
/** Fisher–Yates, for the Shuffle button. */
function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);

/**
 * Swipe left/right for the next short; scroll up/down inside a short to read more.
 * The track is a native CSS scroll-snap container, so touch, trackpad and momentum scrolling all behave natively;
 * this component only works out which slide is centred and adds buttons, keys and the URL (?s=<id>).
 */
export function ShortsDeck({ items }: { items: ShortItem[] }) {
  const hydrated = useHydrated();
  const trackRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [order, setOrder] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const seen = useShorts((s) => s.seen);
  const got = useShorts((s) => s.got);
  const saved = useShorts((s) => s.saved);
  const hintDone = useShorts((s) => s.hintDone);
  const markSeen = useShorts((s) => s.markSeen);
  const toggleGot = useShorts((s) => s.toggleGot);
  const toggleSaved = useShorts((s) => s.toggleSaved);
  const dismissHint = useShorts((s) => s.dismissHint);

  const list = useMemo(() => {
    const byId = new Map(items.map((s) => [s.id, s]));
    const ordered = order ? order.map((id) => byId.get(id)!).filter(Boolean) : items;
    if (filter === "All") return ordered;
    if (filter === "Saved") return hydrated ? ordered.filter((s) => saved.includes(s.id)) : [];
    return ordered.filter((s) => s.track === filter);
  }, [items, order, filter, saved, hydrated]);

  const current = list[index];
  const slides = useCallback(() => [...(trackRef.current?.querySelectorAll<HTMLElement>(":scope > .short") ?? [])], []);

  const go = useCallback(
    (i: number, smooth = true) => {
      const track = trackRef.current;
      const all = slides();
      const to = Math.max(0, Math.min(i, all.length - 1));
      const el = all[to];
      if (!track || !el) return;
      track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: smooth && motionOk() ? "smooth" : "auto" });
    },
    [slides],
  );

  // Which slide is centred? (Runs on every scroll frame; cheap: a few dozen offsetLeft reads.)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const centre = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        slides().forEach((el, i) => {
          const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centre);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
    };
  }, [slides]);

  // The id this component last wrote to the URL, so its own updates aren't mistaken for navigation.
  const written = useRef<string | null>(null);
  const pending = useRef<string | null>(null);

  // Open the short named in the URL (?s=<id>) once, on arrival.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("s");
    const i = id ? items.findIndex((s) => s.id === id) : -1;
    if (i > 0) requestAnimationFrame(() => go(i, false));
  }, [items, go]);

  // Later navigation to /shorts?s=<id> while already here (e.g. from search): jump to it, clearing filters if needed.
  const open = useCallback(
    (id: string) => {
      if (id === written.current) return;
      const i = list.findIndex((s) => s.id === id);
      if (i >= 0) go(i, false);
      else if (items.some((s) => s.id === id)) {
        pending.current = id;
        setFilter("All");
        setOrder(null);
      }
    },
    [list, items, go],
  );
  useEffect(() => {
    const id = pending.current;
    if (!id) return;
    pending.current = null;
    const i = list.findIndex((s) => s.id === id);
    if (i >= 0) requestAnimationFrame(() => go(i, false));
  }, [list, go]);

  // Keep the URL pointing at the short on screen, and count it as seen after a moment.
  useEffect(() => {
    if (!current) return;
    const url = new URL(window.location.href);
    url.searchParams.set("s", current.id);
    written.current = current.id;
    history.replaceState(history.state, "", url);
    const t = window.setTimeout(() => markSeen(current.id), SEEN_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [current, markSeen]);

  // Moving on (by swipe, trackpad, key or button) means the hint has done its job.
  useEffect(() => {
    if (index > 0 && !hintDone) dismissHint();
  }, [index, hintDone, dismissHint]);

  // A new filter or order starts from the first short.
  const restart = useCallback(() => {
    requestAnimationFrame(() => trackRef.current?.scrollTo({ left: 0 }));
  }, []);
  const pickFilter = (f: Filter) => {
    setFilter(f);
    setIndex(0);
    restart();
  };
  const shuffle = () => {
    setOrder(shuffled(items.map((s) => s.id)));
    setIndex(0);
    restart();
    flash("Shuffled");
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  };

  const onGot = () => {
    if (!current) return;
    const marking = !got[current.id];
    toggleGot(current.id);
    if (marking) window.setTimeout(() => go(index + 1), 520);
  };

  const onShare = async () => {
    if (!current) return;
    const url = `${window.location.origin}/shorts?s=${current.id}`;
    try {
      if (navigator.share) await navigator.share({ title: current.title, text: current.hook, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("Link copied");
      }
    } catch {
      // The reader closed the share sheet.
    }
  };

  // ←/→ flip shorts; ↑/↓/Space scroll the open short when focus isn't already inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(index + (e.key === "ArrowRight" ? 1 : -1));
        return;
      }
      const active = slides()[index];
      const focusInside = e.target instanceof Node && active?.contains(e.target);
      const scrollKeys: Record<string, number> = { ArrowDown: 0.4, ArrowUp: -0.4, PageDown: 0.85, PageUp: -0.85, " ": 0.85 };
      if (active && !focusInside && e.key in scrollKeys && !(e.key === " " && e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        active.scrollBy({ top: active.clientHeight * scrollKeys[e.key] * (e.key === " " && e.shiftKey ? -1 : 1), behavior: motionOk() ? "smooth" : "auto" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, slides]);

  // Desktop: a click on a neighbouring (dimmed) card brings it to the centre.
  const onTrackClick = (e: React.MouseEvent) => {
    const slide = (e.target as Element).closest<HTMLElement>(".short");
    if (!slide || slide.dataset.active === "true") return;
    const i = slides().indexOf(slide);
    if (i >= 0) {
      e.preventDefault();
      go(i);
    }
  };

  const showHint = hydrated && !hintDone && list.length > 1;
  const total = list.length;

  return (
    <div className="shorts-app" onPointerDown={showHint ? dismissHint : undefined} onKeyDown={showHint ? dismissHint : undefined}>
      <div className="shorts-top">
        <div className="chip-row shorts-filters" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={f === filter} onClick={() => pickFilter(f)}>
              {f === "Saved" && <Bookmark size={13} aria-hidden />}
              {f}
              {f === "Saved" && hydrated && saved.length > 0 && <span className="chip-count">{saved.length}</span>}
            </button>
          ))}
        </div>
        <div className="shorts-tools">
          <span className="shorts-count" aria-live="polite">
            {total ? (
              <>
                <b>{Math.min(index + 1, total)}</b> / {total}
              </>
            ) : (
              "0"
            )}
          </span>
          <button type="button" className="icon-btn" aria-label="Shuffle" title="Shuffle" onClick={shuffle}>
            <Shuffle size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div className="shorts-progress" aria-hidden>
        <span style={{ transform: `scaleX(${total ? (index + 1) / total : 0})` }} />
      </div>

      <div className="shorts-stage">
        <button type="button" className="shorts-arrow shorts-arrow--prev" aria-label="Previous short" disabled={index <= 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={22} aria-hidden />
        </button>
        <div ref={trackRef} className="shorts-track" role="region" aria-roledescription="carousel" aria-label="Shorts" onClick={onTrackClick}>
          {list.map((s, i) => (
            <Slide
              key={s.id}
              short={s}
              n={i + 1}
              total={total}
              active={i === index}
              near={Math.abs(i - index) <= 1}
              seen={hydrated && !!seen[s.id]}
              got={hydrated && !!got[s.id]}
              inert={hydrated && i !== index}
            />
          ))}
          {total > 0 ? (
            <section className="short short--end" aria-label="End of shorts" data-active={index === total} inert={hydrated && index !== total ? true : undefined}>
              <div className="short-card">
                <span className="end-badge">
                  <Check size={26} aria-hidden />
                </span>
                <h2>You&apos;re all caught up</h2>
                <p className="muted">
                  {hydrated ? Object.keys(got).length : 0} of {items.length} shorts ticked. Go deeper in a lesson, or go round again.
                </p>
                <div className="hero-cta">
                  <button type="button" className="btn btn-primary" onClick={() => go(0)}>
                    <RotateCcw size={16} aria-hidden /> Start over
                  </button>
                  <Link href="/learn" className="btn">
                    System design path
                  </Link>
                  <Link href="/dsa/patterns" className="btn">
                    DSA patterns
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="short short--end" aria-label="No shorts" data-active>
              <div className="short-card">
                <span className="end-badge end-badge--muted">
                  <Bookmark size={24} aria-hidden />
                </span>
                <h2>Nothing saved yet</h2>
                <p className="muted">Tap Save on any short to keep it here for later.</p>
                <div className="hero-cta">
                  <button type="button" className="btn btn-primary" onClick={() => pickFilter("All")}>
                    Browse all shorts
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
        <button type="button" className="shorts-arrow shorts-arrow--next" aria-label="Next short" disabled={index >= total} onClick={() => go(index + 1)}>
          <ChevronRight size={22} aria-hidden />
        </button>
        {showHint && <SwipeHint />}
        <Suspense fallback={null}>
          <FollowUrl onChange={open} />
        </Suspense>
      </div>

      <div className="shorts-dock" aria-label="Actions for this short" role="group">
        {current ? (
          <>
            <button type="button" className="dock-btn" aria-pressed={hydrated && saved.includes(current.id)} onClick={() => toggleSaved(current.id)} disabled={!hydrated}>
              {hydrated && saved.includes(current.id) ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}
              <span>{hydrated && saved.includes(current.id) ? "Saved" : "Save"}</span>
            </button>
            <button type="button" className={cn("dock-btn dock-got")} aria-pressed={hydrated && !!got[current.id]} onClick={onGot} disabled={!hydrated}>
              <span className="got-box" aria-hidden>
                <Check size={15} strokeWidth={3} />
              </span>
              <span>Got it</span>
            </button>
            <button type="button" className="dock-btn" onClick={onShare} disabled={!hydrated}>
              <Share2 size={18} aria-hidden />
              <span>Share</span>
            </button>
            {current.source && (
              <Link href={current.source} className="dock-btn">
                <BookOpen size={18} aria-hidden />
                <span>Lesson</span>
              </Link>
            )}
          </>
        ) : (
          <span className="muted dock-empty">Swipe back for more</span>
        )}
      </div>
      {toast && (
        <div className="shorts-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

const Slide = memo(function Slide({
  short: s,
  n,
  total,
  active,
  near,
  seen,
  got,
  inert,
}: {
  short: ShortItem;
  n: number;
  total: number;
  active: boolean;
  near: boolean;
  seen: boolean;
  got: boolean;
  inert: boolean;
}) {
  return (
    <article className="short" data-track={s.track} data-active={active} data-near={near} aria-roledescription="slide" aria-label={`${n} of ${total}: ${s.title}`} inert={inert || undefined}>
      <div className="short-card">
        <header className="short-hero">
          <div className="short-meta">
            <span className="short-chip">
              {s.track} · {s.topic}
            </span>
            {got ? (
              <span className="short-state short-state--got">
                <Check size={12} strokeWidth={3} aria-hidden /> Got it
              </span>
            ) : (
              seen && <span className="short-state">Seen</span>
            )}
          </div>
          <h2 className="short-title">
            <Inline text={s.title} />
          </h2>
          <p className="short-hook">
            <Inline text={s.hook} />
          </p>
          <ul className="short-points">
            {s.points.map((p, j) => (
              <li key={p} style={{ "--j": j } as React.CSSProperties}>
                <Inline text={p} />
              </li>
            ))}
          </ul>
          <p className="short-more-hint" aria-hidden>
            <ChevronDown size={16} /> Scroll for more
          </p>
        </header>
        <div className="short-more">
          {s.more.map((g) => (
            <section key={g.title} className="short-group">
              <h3>{g.title}</h3>
              <ul>
                {g.points.map((p) => (
                  <li key={p}>
                    <Inline text={p} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {s.codeHtml && <figure className="code-block short-code" dangerouslySetInnerHTML={{ __html: s.codeHtml }} />}
          {s.say && (
            <aside className="short-say">
              <MessageSquare size={18} aria-hidden />
              <div>
                <strong>Say it in the interview</strong>
                <p>
                  <Inline text={s.say} />
                </p>
              </div>
            </aside>
          )}
          {s.source && (
            <Link href={s.source} className="short-source" tabIndex={active ? undefined : -1}>
              <span>
                {/* Building blocks don't summarise a lesson; they point at the closest one. */}
                <small>{s.track === "Building blocks" ? "Related lesson" : "Go deeper"}</small>
                {s.sourceTitle}
              </span>
              <ArrowRight size={18} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
});

/** Reads ?s= for in-page navigation. Isolated in its own Suspense boundary so the deck itself still renders on the server. */
function FollowUrl({ onChange }: { onChange: (id: string) => void }) {
  const id = useSearchParams().get("s");
  useEffect(() => {
    if (id) onChange(id);
  }, [id, onChange]);
  return null;
}

function SwipeHint() {
  return (
    <div className="swipe-hint" aria-hidden>
      <div className="swipe-hint-card">
        <Hand size={30} className="swipe-hand" />
        <p className="only-touch">
          <b>Swipe</b> for the next short
          <br />
          <b>Scroll down</b> to read more
        </p>
        <p className="only-mouse">
          <kbd>←</kbd> <kbd>→</kbd> next short · <kbd>↓</kbd> read more
        </p>
      </div>
    </div>
  );
}

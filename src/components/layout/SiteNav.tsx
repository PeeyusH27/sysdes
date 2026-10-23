"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { ArrowRight, Check, ChevronDown, Menu, Moon, Network, Search, Sun, Wind, X, Zap } from "lucide-react";
import { deepDives, learnSteps, type Level } from "@content/registry";
import { jsTopics, PATTERN_GROUPS, patterns } from "@content/dsa/registry";
import { questionGroups, questionLabel } from "@content/home";
import { cn } from "@/lib/cn";
import { useHydrated, useMediaQuery } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";
import { CommandMenu } from "./CommandMenu";

/* ------------------------------------------------------------------ menu data (built from the registries) */

type TrackId = "dsa" | "sd";
type Item = { href: string; label: string; num?: number; level?: Level; note?: string };
type Group = { title?: string; items: Item[] };
type Column = { id: string; title: string; span?: number; groups: Group[]; hub: { href: string; label: string } };
type Track = { id: TrackId; label: string; blurb: string; match: string[]; columns: Column[] };

const LEVELS: Level[] = ["Easy", "Medium", "Hard"];

const TRACKS: Track[] = [
  {
    id: "dsa",
    label: "DSA",
    blurb: `${patterns.length} patterns, then problems`,
    match: ["/dsa"],
    columns: [
      {
        id: "dsa-start",
        title: "Start here",
        hub: { href: "/dsa", label: "Track overview" },
        groups: [
          {
            items: [
              { href: "/dsa/js", label: "JavaScript cheat sheet", note: `${jsTopics.length} topics, every snippet runs` },
              { href: "/dsa/problems", label: "Problems", note: "Hidden tests run in your browser" },
              { href: "/dsa/drill", label: "Pattern drill", note: "Read a problem, name the pattern" },
            ],
          },
          { title: "Problems by level", items: LEVELS.map((lv) => ({ href: `/dsa/problems?lv=${lv}`, label: lv, level: lv })) },
        ],
      },
      {
        id: "dsa-patterns",
        title: "Patterns",
        span: 3,
        hub: { href: "/dsa/patterns", label: `All ${patterns.length} patterns` },
        groups: PATTERN_GROUPS.map((g) => ({
          title: g,
          items: patterns.filter((p) => p.group === g).map((p) => ({ href: `/dsa/patterns/${p.slug}`, label: p.short, num: p.order })),
        })).filter((g) => g.items.length),
      },
    ],
  },
  {
    id: "sd",
    label: "System Design",
    blurb: `${learnSteps.length} steps, deep dives, questions`,
    match: ["/system-design", "/learn", "/deep-dives", "/questions", "/lld", "/playground", "/cheatsheet", "/glossary"],
    columns: [
      {
        id: "sd-path",
        title: "The HLD path",
        hub: { href: "/learn", label: "See the map" },
        groups: [{ items: learnSteps.map((s) => ({ href: `/learn/${s.slug}`, label: s.short, num: s.order })) }],
      },
      {
        id: "sd-questions",
        title: "Interview questions",
        span: 2,
        hub: { href: "/questions", label: "All questions" },
        groups: questionGroups().map((g) => ({
          title: g.title,
          items: g.items.map((q) => ({ href: `/questions/${q.slug}`, label: questionLabel(q.title), level: q.level })),
        })),
      },
      {
        id: "sd-deep",
        title: "Deep dives",
        hub: { href: "/deep-dives", label: "All deep dives" },
        groups: [{ items: deepDives.map((d) => ({ href: `/deep-dives/${d.slug}`, label: d.title.split(":")[0] })) }],
      },
      {
        id: "sd-tools",
        title: "Practice and tools",
        hub: { href: "/system-design", label: "Track overview" },
        groups: [
          {
            items: [
              { href: "/lld", label: "LLD track", note: "Foundations and coding exercises" },
              { href: "/playground", label: "Playground", note: "Drag, connect, get graded" },
              { href: "/cheatsheet", label: "Cheatsheet", note: "Numbers worth memorising" },
              { href: "/glossary", label: "Glossary", note: "Every term in one line" },
            ],
          },
        ],
      },
    ],
  },
];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);
const trackOf = (path: string) => TRACKS.find((t) => t.match.some((m) => under(path, m)))?.id ?? null;
const spanOf = (t: Track) => t.columns.reduce((n, c) => n + (c.span ?? 1), 0);

/** The current track's sections, shown inline in the bar on wide screens (the current page is highlighted). */
function railFor(track: TrackId, path: string): Item[] {
  if (track === "dsa") {
    return [
      { href: "/dsa/js", label: "JS cheat sheet" },
      { href: "/dsa/patterns", label: "Patterns" },
      { href: "/dsa/problems", label: "Problems" },
      { href: "/dsa/drill", label: "Drill" },
    ];
  }
  const tool = under(path, "/cheatsheet") ? { href: "/cheatsheet", label: "Cheatsheet" } : under(path, "/glossary") ? { href: "/glossary", label: "Glossary" } : { href: "/playground", label: "Playground" };
  return [{ href: "/learn", label: "HLD path" }, { href: "/deep-dives", label: "Deep dives" }, { href: "/questions", label: "Questions" }, { href: "/lld", label: "LLD" }, tool];
}

/* ------------------------------------------------------------------ menu pieces (shared by the mega menu and the drawer) */

function MenuColumn({ col, path, isDone, onNavigate }: { col: Column; path: string; isDone: (href: string) => boolean; onNavigate: () => void }) {
  return (
    <section className="nav-col" data-span={col.span ?? 1} style={{ gridColumn: `span ${col.span ?? 1}` }} aria-labelledby={`${col.id}-t`}>
      <p className="nav-col-title" id={`${col.id}-t`}>
        {col.title}
      </p>
      <div className="nav-col-body">
        {col.groups.map((g, i) => {
          const gid = `${col.id}-g${i}`;
          return (
            <div key={gid} className="nav-group">
              {g.title && (
                <p className="nav-group-title" id={gid}>
                  {g.title}
                </p>
              )}
              <ul aria-labelledby={g.title ? gid : undefined} className={cn(g.items.every((it) => it.level && !it.num && it.label === it.level) && "nav-chips")}>
                {g.items.map((it) => {
                  const current = path === it.href;
                  const done = isDone(it.href);
                  return (
                    <li key={it.href}>
                      <Link href={it.href} prefetch={false} className="nav-link" aria-current={current ? "page" : undefined} onClick={onNavigate}>
                        {it.num != null && <span className="nav-num">{it.num}</span>}
                        <span className="nav-label">
                          {it.label}
                          {it.note && <small>{it.note}</small>}
                        </span>
                        {it.level && it.label !== it.level && <span className={`nav-level nav-level--${it.level}`}>{it.level}</span>}
                        {done && (
                          <span className="nav-done">
                            <Check size={12} strokeWidth={3} aria-hidden />
                            <span className="sr-only">, done</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <Link href={col.hub.href} prefetch={false} className="nav-hub" aria-current={path === col.hub.href ? "page" : undefined} onClick={onNavigate}>
        {col.hub.label} <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ mobile drawer */

function Drawer({
  path,
  active,
  isDone,
  onClose,
  onSearch,
}: {
  path: string;
  active: TrackId | null;
  isDone: (href: string) => boolean;
  onClose: (restoreFocus: boolean) => void;
  onSearch: () => void;
}) {
  const [open, setOpen] = useState<TrackId | null>(active);
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useProgress((s) => s.reduceMotion);
  const setReduceMotion = useProgress((s) => s.setReduceMotion);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose(true);
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const focusables = [...ref.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  const navigate = () => onClose(false);
  const dark = resolvedTheme === "dark";

  return createPortal(
    <>
      <div className="nav-drawer-scrim" aria-hidden onClick={() => onClose(true)} />
      <div ref={ref} className="nav-drawer" role="dialog" aria-modal="true" aria-label="Site menu" onKeyDown={onKeyDown}>
        <div className="nav-drawer-head">
          <Link href="/" className="brand" onClick={navigate}>
            <span className="brand-mark" aria-hidden>
              <Network size={16} />
            </span>
            <span className="brand-text">DSA &amp; System Design</span>
          </Link>
          <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => onClose(true)}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav className="nav-drawer-body" aria-label="All pages">
          <button type="button" className="nav-drawer-search" data-autofocus onClick={onSearch}>
            <Search size={16} aria-hidden /> Search lessons, patterns, problems
          </button>
          {TRACKS.map((t) => (
            <div key={t.id} className="nav-acc" data-track={t.id}>
              <h2 className="nav-acc-h">
                <button
                  type="button"
                  className="nav-acc-btn"
                  aria-expanded={open === t.id}
                  aria-controls={`nav-acc-${t.id}`}
                  data-active={active === t.id || undefined}
                  onClick={() => setOpen((o) => (o === t.id ? null : t.id))}
                >
                  <span>
                    {t.label}
                    <small>{t.blurb}</small>
                  </span>
                  <ChevronDown size={18} aria-hidden />
                </button>
              </h2>
              <div id={`nav-acc-${t.id}`} className="nav-acc-panel" hidden={open !== t.id}>
                {t.columns.map((col) => (
                  <MenuColumn key={col.id} col={col} path={path} isDone={isDone} onNavigate={navigate} />
                ))}
              </div>
            </div>
          ))}
          <Link href="/shorts" className="nav-acc-link" aria-current={under(path, "/shorts") ? "page" : undefined} onClick={navigate}>
            <span className="nav-acc-zap" aria-hidden>
              <Zap size={16} />
            </span>
            <span>
              Shorts
              <small>One idea, one minute</small>
            </span>
            <ArrowRight size={16} aria-hidden />
          </Link>
        </nav>
        <div className="nav-drawer-foot">
          <button type="button" className="btn btn-sm" aria-pressed={reduceMotion} onClick={() => setReduceMotion(!reduceMotion)}>
            <Wind size={15} aria-hidden /> Reduce motion
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setTheme(dark ? "light" : "dark")}>
            {dark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />} {dark ? "Light theme" : "Dark theme"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ------------------------------------------------------------------ the bar */

export function SiteNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const mobile = useMediaQuery("(max-width: 860px)");
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useProgress((s) => s.reduceMotion);
  const setReduceMotion = useProgress((s) => s.setReduceMotion);
  const done = useProgress((s) => s.done);

  // Menus remember the path they were opened on, so any navigation closes them without an effect.
  // `hover`: opened by hovering (closes when the pointer leaves). A click pins it open until an outside click.
  const [menu, setMenu] = useState<{ id: TrackId; path: string; hover: boolean } | null>(null);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const openId = menu && menu.path === pathname && !mobile ? menu.id : null;
  const drawerOpen = drawerPath === pathname && mobile;

  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<{ open?: number; close?: number }>({});
  const focusFirst = useRef<TrackId | null>(null);
  const searchReturn = useRef<HTMLElement | null>(null);

  const active = trackOf(pathname);
  const isDone = useCallback((href: string) => hydrated && !!done[href], [hydrated, done]);

  const clearTimers = () => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
  };
  const show = (id: TrackId, hover = false) => {
    clearTimers();
    setMenu({ id, path: pathname, hover });
  };
  const hide = useCallback(() => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
    setMenu(null);
  }, []);

  const openSearch = useCallback(() => {
    searchReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMenu(null);
    setDrawerPath(null);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    const back = searchReturn.current?.isConnected ? searchReturn.current : toggleRef.current?.offsetParent ? toggleRef.current : null;
    back?.focus();
  }, []);

  // ⌘K / Ctrl+K and "/" open search.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // An open mega menu closes on an outside click or Escape.
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) hide();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId, hide]);

  // ArrowDown on a trigger opens its menu and lands on the first link.
  useEffect(() => {
    if (!openId || focusFirst.current !== openId) return;
    focusFirst.current = null;
    document.getElementById(`nav-panel-${openId}`)?.querySelector<HTMLElement>("a[href]")?.focus();
  }, [openId]);

  useEffect(() => () => clearTimers(), []);

  const onEnter = (id: TrackId) => (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || mobile) return;
    window.clearTimeout(timers.current.close);
    if (openId === id) return;
    window.clearTimeout(timers.current.open);
    timers.current.open = window.setTimeout(() => show(id, true), openId ? 0 : 120);
  };
  const onLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timers.current.open);
    // A menu opened by hover closes when the pointer leaves; one opened by click or keyboard waits for an outside click.
    if (menu?.hover) timers.current.close = window.setTimeout(hide, 260);
  };
  const onTrigger = (id: TrackId) => {
    if (openId !== id) return show(id);
    // Clicking a menu that hover opened pins it (the click that usually follows a hover must not flick it shut).
    if (menu?.hover) return show(id);
    hide();
  };
  const onTriggerKey = (id: TrackId) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusFirst.current = id;
      if (openId === id) document.getElementById(`nav-panel-${id}`)?.querySelector<HTMLElement>("a[href]")?.focus();
      else show(id);
    }
  };
  const onItemKey = (id: TrackId) => (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key !== "Escape" || openId !== id) return;
    e.stopPropagation();
    hide();
    e.currentTarget.querySelector<HTMLButtonElement>(".nav-trigger")?.focus();
  };
  const onItemBlur = (id: TrackId) => (e: FocusEvent<HTMLLIElement>) => {
    // Focus moved to something outside this item (Tab past the last link): close. A click on empty panel space
    // has no relatedTarget and is left to the outside-click handler.
    if (openId === id && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) hide();
  };

  const closeDrawer = (restore: boolean) => {
    setDrawerPath(null);
    if (restore) toggleRef.current?.focus();
  };

  const dark = hydrated && resolvedTheme === "dark";

  return (
    <header ref={headerRef} className="site-nav" data-menu-open={openId ?? undefined}>
      <div className="container nav-bar">
        <Link href="/" className="brand" onClick={hide}>
          <span className="brand-mark" aria-hidden>
            <Network size={16} />
          </span>
          <span className="brand-text">DSA &amp; System Design</span>
        </Link>

        <nav aria-label="Main" className="nav-main">
          <ul className="nav-tracks">
            {TRACKS.map((t) => (
              <li key={t.id} className="nav-item" data-track={t.id} onPointerEnter={onEnter(t.id)} onPointerLeave={onLeave} onKeyDown={onItemKey(t.id)} onBlur={onItemBlur(t.id)}>
                <button
                  type="button"
                  className="nav-trigger"
                  aria-expanded={openId === t.id}
                  aria-controls={`nav-panel-${t.id}`}
                  data-active={active === t.id || undefined}
                  onClick={() => onTrigger(t.id)}
                  onKeyDown={onTriggerKey(t.id)}
                >
                  {t.label}
                  <ChevronDown size={14} aria-hidden />
                </button>
                <div id={`nav-panel-${t.id}`} className="nav-panel" data-track={t.id} hidden={openId !== t.id}>
                  <div className="container nav-panel-grid" style={{ "--cols": spanOf(t) } as React.CSSProperties}>
                    {t.columns.map((col) => (
                      <MenuColumn key={col.id} col={col} path={pathname} isDone={isDone} onNavigate={hide} />
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/shorts" className="nav-shorts" aria-current={under(pathname, "/shorts") ? "page" : undefined} onClick={hide}>
            <Zap size={14} aria-hidden />
            <span>Shorts</span>
          </Link>
          {active && (
            <ul className="nav-rail" data-track={active}>
              {railFor(active, pathname).map((it) => (
                <li key={it.href}>
                  <Link href={it.href} aria-current={pathname === it.href ? "page" : under(pathname, it.href) ? "true" : undefined}>
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="nav-tools">
          <button type="button" className="search-btn" onClick={openSearch} aria-label="Search (Ctrl+K)">
            <Search size={15} aria-hidden /> <span className="label">Search</span> <kbd>⌘K</kbd>
          </button>
          <button
            type="button"
            className="icon-btn nav-desktop-only"
            onClick={() => setReduceMotion(!reduceMotion)}
            aria-pressed={hydrated ? reduceMotion : false}
            aria-label="Reduce motion"
            title={hydrated && reduceMotion ? "Motion reduced (click to allow animations)" : "Reduce motion"}
          >
            <Wind size={17} aria-hidden style={{ opacity: hydrated && reduceMotion ? 1 : 0.55 }} />
          </button>
          <button type="button" className="icon-btn nav-desktop-only" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle colour theme">
            {hydrated && !dark ? <Moon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
          </button>
          <button
            ref={toggleRef}
            type="button"
            className="icon-btn menu-toggle"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            aria-label="Menu"
            onClick={() => setDrawerPath(drawerOpen ? null : pathname)}
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </div>
      {openId && createPortal(<div className="nav-dim" aria-hidden />, document.body)}
      {drawerOpen && <Drawer path={pathname} active={active} isDone={isDone} onClose={closeDrawer} onSearch={openSearch} />}
      {searchOpen && createPortal(<CommandMenu onClose={closeSearch} />, document.body)}
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Network, Search, Sun, Wind, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";
import { CommandMenu } from "./CommandMenu";

const TRACKS = [
  { href: "/dsa", label: "DSA", match: ["/dsa"] },
  { href: "/system-design", label: "System Design", match: ["/system-design", "/learn", "/deep-dives", "/questions", "/playground", "/cheatsheet", "/glossary"] },
  { href: "/shorts", label: "Shorts", match: ["/shorts"] },
];
const SUB: Record<string, { href: string; label: string }[]> = {
  "/dsa": [
    { href: "/dsa/js", label: "JS cheat sheet" },
    { href: "/dsa/patterns", label: "Patterns" },
    { href: "/dsa/problems", label: "Problems" },
  ],
  "/system-design": [
    { href: "/learn", label: "Learn" },
    { href: "/deep-dives", label: "Deep dives" },
    { href: "/questions", label: "Questions" },
    { href: "/playground", label: "Playground" },
    { href: "/cheatsheet", label: "Cheatsheet" },
  ],
  "/shorts": [],
};
const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const reduceMotion = useProgress((s) => s.reduceMotion);
  const setReduceMotion = useProgress((s) => s.setReduceMotion);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="site-nav">
      <div className="container inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden>
            <Network size={16} />
          </span>
          <span className="brand-text">DSA &amp; System Design</span>
        </Link>
        <nav aria-label="Main">
          <div className="nav-links" data-open={open}>
            {TRACKS.map((t) => {
              const active = t.match.some((m) => under(pathname, m));
              return (
                <div key={t.href} className={cn("nav-track", active && "is-active", t.href === "/shorts" && "nav-track--shorts")}>
                  <Link href={t.href} className="nav-track-link" aria-current={pathname === t.href ? "page" : active ? "true" : undefined} onClick={() => setOpen(false)}>
                    {t.href === "/shorts" && <Zap size={14} aria-hidden />}
                    {t.label}
                  </Link>
                  {active &&
                    SUB[t.href].map((l) => (
                      <Link key={l.href} href={l.href} aria-current={under(pathname, l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                        {l.label}
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        </nav>
        <Link href="/shorts" className="shorts-btn" aria-label="Shorts" aria-current={under(pathname, "/shorts") ? "page" : undefined} onClick={() => setOpen(false)}>
          <Zap size={15} aria-hidden /> <span>Shorts</span>
        </Link>
        <button type="button" className="search-btn" onClick={() => setSearchOpen(true)} aria-label="Search (Ctrl+K)">
          <Search size={15} aria-hidden /> <span className="label">Search</span> <kbd>⌘K</kbd>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setReduceMotion(!reduceMotion)}
          aria-pressed={hydrated ? reduceMotion : false}
          aria-label="Reduce motion"
          title={hydrated && reduceMotion ? "Motion reduced (click to allow animations)" : "Reduce motion"}
        >
          <Wind size={17} aria-hidden style={{ opacity: hydrated && reduceMotion ? 1 : 0.55 }} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle colour theme"
        >
          {hydrated && resolvedTheme === "light" ? <Moon size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
        </button>
        <button type="button" className="icon-btn menu-toggle" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          <Menu size={18} aria-hidden />
        </button>
      </div>
      {searchOpen && <CommandMenu onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

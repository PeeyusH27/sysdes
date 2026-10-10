"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { m, useScroll, useSpring } from "motion/react";
import { Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** Thin reading-progress bar + remembers the page as recently visited. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  const pathname = usePathname();
  const visit = useProgress((s) => s.visit);
  useEffect(() => visit(pathname), [pathname, visit]);
  return <m.div className="progress-bar" style={{ scaleX }} aria-hidden />;
}

export function PageActions() {
  const href = usePathname();
  const hydrated = useHydrated();
  const done = useProgress((s) => !!s.done[href]);
  const bookmarked = useProgress((s) => s.bookmarks.includes(href));
  const toggleDone = useProgress((s) => s.toggleDone);
  const toggleBookmark = useProgress((s) => s.toggleBookmark);
  return (
    <div className="meta-row no-print" style={{ marginTop: 6 }}>
      <button type="button" className="btn btn-sm" aria-pressed={hydrated && done} onClick={() => toggleDone(href)}>
        {hydrated && done ? <CheckCircle2 size={15} aria-hidden className="ok-ink" /> : <Circle size={15} aria-hidden />}
        {hydrated && done ? "Completed" : "Mark complete"}
      </button>
      <button type="button" className="btn btn-sm" aria-pressed={hydrated && bookmarked} onClick={() => toggleBookmark(href)}>
        {hydrated && bookmarked ? <BookmarkCheck size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}
        {hydrated && bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
    </div>
  );
}

/** Sidebar list with completion ticks (read from localStorage after hydration). */
export function SideList({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  return (
    <nav className="lesson-side" aria-label={title}>
      <h2>{title}</h2>
      <ol>
        {items.map((it, i) => (
          <li key={it.href}>
            <a href={it.href} aria-current={pathname === it.href ? "page" : undefined}>
              <span className="dot-n" data-done={hydrated && !!done[it.href]}>
                {i + 1}
              </span>
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

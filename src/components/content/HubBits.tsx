"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** "Done" pill on a hub card once the page is marked complete (nothing before hydration). */
export function DoneBadge({ href }: { href: string }) {
  const hydrated = useHydrated();
  const done = useProgress((s) => !!s.done[href]);
  if (!hydrated || !done) return null;
  return (
    <span className="tc-done">
      <CheckCircle2 size={12} aria-hidden /> Done
    </span>
  );
}

/** Link to the shorts feed (or straight to one short). */
export function ShortsStrip({ count, label, href = "/shorts" }: { count: number; label: string; href?: string }) {
  return (
    <Link href={href} className="shorts-strip card-link">
      <span className="ss-icon">
        <Zap size={20} aria-hidden />
      </span>
      <p>
        <b>Got a minute?</b>
        {count} one-minute shorts on {label}. One idea per card, swipe for the next.
      </p>
      <span className="tc-go">
        Open shorts <ArrowRight size={15} aria-hidden />
      </span>
    </Link>
  );
}

const SECTIONS = {
  dsa: [
    { href: "/dsa", label: "Overview" },
    { href: "/dsa/js", label: "JS cheat sheet" },
    { href: "/dsa/patterns", label: "Patterns" },
    { href: "/dsa/problems", label: "Problems" },
  ],
  sd: [
    { href: "/system-design", label: "Overview" },
    { href: "/learn", label: "HLD path" },
    { href: "/deep-dives", label: "Deep dives" },
    { href: "/questions", label: "Questions" },
    { href: "/playground", label: "Playground" },
    { href: "/cheatsheet", label: "Cheatsheet" },
    { href: "/glossary", label: "Glossary" },
  ],
};

/**
 * The track's sections as a row of tabs at the top of a hub. Shown below 1120 px only: wider screens have the same
 * links in the header.
 */
export function HubTabs({ track }: { track: "dsa" | "sd" }) {
  const path = usePathname();
  return (
    <nav className="hub-tabs" data-track={track} aria-label={track === "dsa" ? "DSA sections" : "System design sections"}>
      <ul>
        {SECTIONS[track].map((s) => (
          <li key={s.href}>
            <Link href={s.href} aria-current={path === s.href ? "page" : undefined}>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

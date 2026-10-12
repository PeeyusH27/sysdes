"use client";
import Link from "next/link";
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
        <b>Only got a minute?</b>
        {count} one-minute shorts on {label}. Swipe for the next idea, scroll down for more.
      </p>
      <span className="tc-go">
        Open shorts <ArrowRight size={15} aria-hidden />
      </span>
    </Link>
  );
}

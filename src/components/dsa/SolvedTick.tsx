"use client";
import { CheckCircle2, Circle } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useDsa } from "@/lib/dsa/store";

/** Green tick when the problem is solved (read from localStorage after hydration). */
export function SolvedTick({ slug, size = 15 }: { slug: string; size?: number }) {
  const hydrated = useHydrated();
  const solved = useDsa((s) => !!s.solved[slug]);
  return hydrated && solved ? (
    <CheckCircle2 size={size} className="ok-ink solved-tick" aria-label="Solved" />
  ) : (
    <Circle size={size} className="muted solved-tick" aria-label="Not solved yet" />
  );
}

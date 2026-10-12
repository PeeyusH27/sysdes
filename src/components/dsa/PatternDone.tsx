"use client";
import { CheckCircle2 } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** "✓ Read" badge when the pattern lesson was marked complete (quiz passed or marked by hand). */
export function PatternDone({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const done = useProgress((s) => !!s.done[`/dsa/patterns/${slug}`]);
  if (!hydrated || !done) return null;
  return (
    <span className="badge badge-done" style={{ marginLeft: 6 }}>
      <CheckCircle2 size={11} aria-hidden /> Read
    </span>
  );
}

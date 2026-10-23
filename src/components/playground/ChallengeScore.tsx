"use client";
import { CheckCircle2 } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** Best score so far on a challenge, as a pill on its gallery card (nothing before hydration or before a first attempt). */
export function ChallengeScore({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const best = useProgress((s) => s.challenge[slug]);
  if (!hydrated || best === undefined) return null;
  return best >= 100 ? (
    <span className="tc-done">
      <CheckCircle2 size={12} aria-hidden /> 100%
    </span>
  ) : (
    <span className="tc-done tc-partial">Best {best}%</span>
  );
}

/** How far through a guided mission the learner is, as a pill on its gallery card. */
export function MissionProgress({ slug, total }: { slug: string; total: number }) {
  const hydrated = useHydrated();
  const passed = useProgress((s) => s.mission[slug] ?? 0);
  if (!hydrated || passed === 0) return null;
  return passed >= total ? (
    <span className="tc-done">
      <CheckCircle2 size={12} aria-hidden /> Mission done
    </span>
  ) : (
    <span className="tc-done tc-partial">
      Mission {passed}/{total}
    </span>
  );
}

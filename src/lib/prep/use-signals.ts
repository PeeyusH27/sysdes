"use client";
import { useMemo } from "react";
import { useHydrated } from "@/lib/hooks";
import { useDsa } from "@/lib/dsa/store";
import { useProgress } from "@/lib/progress";
import { emptySignals, type Signals } from "./readiness";

/** Everything the readiness model reads, from the browser's saved progress. Empty until hydrated, so server and client agree. */
export function useSignals(): Signals {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const quiz = useProgress((s) => s.quiz);
  const challenge = useProgress((s) => s.challenge);
  const mission = useProgress((s) => s.mission);
  const drill = useProgress((s) => s.drill);
  const solved = useDsa((s) => s.solved);
  const explainRaw = useProgress((s) => s.explain);
  return useMemo(
    () => (hydrated ? { done, quiz, challenge, mission, drill, solved, explain: Object.fromEntries(Object.entries(explainRaw).map(([k, v]) => [k, v.score])) } : emptySignals()),
    [hydrated, done, quiz, challenge, mission, drill, solved, explainRaw],
  );
}

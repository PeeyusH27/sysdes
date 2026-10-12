"use client";
import { useHydrated } from "@/lib/hooks";
import { useDsa } from "@/lib/dsa/store";

/** "3/6 solved" for a set of problems (blank until hydrated, so server and client renders agree). */
export function SolvedCount({ slugs, suffix = "solved" }: { slugs: string[]; suffix?: string }) {
  const hydrated = useHydrated();
  const solved = useDsa((s) => s.solved);
  if (!hydrated) return null;
  const n = slugs.filter((s) => solved[s]).length;
  return (
    <strong className={n === slugs.length ? "ok-ink" : undefined}>
      {n}/{slugs.length} {suffix}
    </strong>
  );
}

/** Thin progress bar for a set of problems. */
export function SolvedBar({ slugs }: { slugs: string[] }) {
  const hydrated = useHydrated();
  const solved = useDsa((s) => s.solved);
  const n = hydrated ? slugs.filter((s) => solved[s]).length : 0;
  return (
    <span className="dsa-progress-bar dsa-progress-bar--thin" role="progressbar" aria-valuemin={0} aria-valuemax={slugs.length} aria-valuenow={n} aria-label="Problems solved">
      <span style={{ width: `${slugs.length ? (n / slugs.length) * 100 : 0}%` }} />
    </span>
  );
}

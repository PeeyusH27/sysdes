"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPattern } from "@content/dsa/registry";
import { useHydrated } from "@/lib/hooks";
import { useDsa } from "@/lib/dsa/store";

/** The first unsolved problem in path order, once the learner has solved at least one. */
export function NextProblem({ rows }: { rows: { slug: string; title: string; difficulty: string; pattern: string }[] }) {
  const hydrated = useHydrated();
  const solved = useDsa((s) => s.solved);
  if (!hydrated) return null;
  const done = rows.filter((r) => solved[r.slug]).length;
  if (!done) return null;
  const next = rows.find((r) => !solved[r.slug]);
  if (!next) return <p className="track-progress ok-ink">All {rows.length} problems solved. Impressive.</p>;
  return (
    <Link href={`/dsa/problems/${next.slug}`} className="card card-link next-problem">
      <span className="eyebrow">
        Up next · {done}/{rows.length} solved
      </span>
      <span className="next-problem-title">
        {next.title} <span className={`diff diff-${next.difficulty}`}>{next.difficulty}</span>
        <span className="tag">{getPattern(next.pattern)?.short}</span>
      </span>
      <ArrowRight size={18} aria-hidden />
    </Link>
  );
}

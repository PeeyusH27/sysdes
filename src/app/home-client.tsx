"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { allPages, learnSteps } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";
import { useDsa } from "@/lib/dsa/store";

/** Old single-file app links (#/q/chat, #/hld, #/deep, #/questions) → real routes. */
export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const h = window.location.hash;
    const q = /^#\/q\/(.+)$/.exec(h);
    const map: Record<string, string> = { "#/hld": "/learn", "#/deep": "/deep-dives", "#/questions": "/questions" };
    if (q) router.replace(`/questions/${q[1]}`);
    else if (map[h]) router.replace(map[h]);
  }, [router]);
  return null;
}

/** One line of progress under a home track card (nothing until there is progress to show). */
export function TrackProgress({ track, problems = [] }: { track: "dsa" | "sd"; problems?: string[] }) {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const solved = useDsa((s) => s.solved);
  if (!hydrated) return null;
  if (track === "sd") {
    const n = learnSteps.filter((s) => done[`/learn/${s.slug}`]).length;
    if (!n) return null;
    return (
      <p className="track-progress">
        <strong>{n}</strong>/{learnSteps.length} HLD steps complete
      </p>
    );
  }
  const n = problems.filter((s) => solved[s]).length;
  const read = patterns.filter((p) => done[`/dsa/patterns/${p.slug}`]).length;
  if (!n && !read) return null;
  return (
    <p className="track-progress">
      <strong>{n}</strong>/{problems.length} problems solved · <strong>{read}</strong>/{patterns.length} patterns read
    </p>
  );
}

export function ContinueLearning({ extra = [] }: { extra?: { href: string; title: string; section: string }[] }) {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const recent = useProgress((s) => s.recent);
  if (!hydrated) return null;
  const nextStep = learnSteps.find((s) => !done[`/learn/${s.slug}`]);
  const nextPattern = patterns.find((p) => !done[`/dsa/patterns/${p.slug}`]);
  const pages = [...allPages(), ...extra];
  const recentPages = recent.map((r) => pages.find((p) => p.href === r)).filter(Boolean).slice(0, 4);
  const completed = learnSteps.filter((s) => done[`/learn/${s.slug}`]).length;
  const patternsRead = patterns.filter((p) => done[`/dsa/patterns/${p.slug}`]).length;
  if (!recentPages.length && completed === 0 && patternsRead === 0) return null;
  return (
    <>
      <h2 className="section-title">Continue where you left off</h2>
      <div className="grid-auto">
        {nextPattern && patternsRead > 0 && (
          <Link href={`/dsa/patterns/${nextPattern.slug}`} className="card card-link">
            <span className="eyebrow">
              Next pattern · {patternsRead}/{patterns.length} read
            </span>
            <h3 style={{ margin: "6px 0 4px" }}>{nextPattern.title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{nextPattern.summary}</p>
          </Link>
        )}
        {nextStep && completed > 0 && (
          <Link href={`/learn/${nextStep.slug}`} className="card card-link">
            <span className="eyebrow">
              Next HLD step · {completed}/{learnSteps.length} done
            </span>
            <h3 style={{ margin: "6px 0 4px" }}>{nextStep.title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{nextStep.summary}</p>
          </Link>
        )}
        {recentPages.map((p) => (
          <Link key={p!.href} href={p!.href} className="card card-link">
            <span className="eyebrow">Recently viewed · {p!.section}</span>
            <h3 style={{ margin: "6px 0 4px" }}>{p!.title}</h3>
          </Link>
        ))}
      </div>
    </>
  );
}

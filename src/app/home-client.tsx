"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { allPages, learnSteps } from "@content/registry";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

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

export function ContinueLearning() {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const recent = useProgress((s) => s.recent);
  if (!hydrated) return null;
  const nextStep = learnSteps.find((s) => !done[`/learn/${s.slug}`]);
  const pages = allPages();
  const recentPages = recent.map((r) => pages.find((p) => p.href === r)).filter(Boolean).slice(0, 4);
  const completed = learnSteps.filter((s) => done[`/learn/${s.slug}`]).length;
  if (!recentPages.length && completed === 0) return null;
  return (
    <>
      <h2 className="section-title">Continue where you left off</h2>
      <div className="grid-auto">
        {nextStep && (
          <Link href={`/learn/${nextStep.slug}`} className="card card-link">
            <span className="eyebrow">Next step · {completed}/{learnSteps.length} done</span>
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

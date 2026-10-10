"use client";
import Link from "next/link";
import { learnSteps } from "@content/registry";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

/** The ten steps as stations on a line; case studies branch off. Completed stations fill in. */
export function MetroMap() {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const isDone = (slug: string) => hydrated && !!done[`/learn/${slug}`];
  const firstOpen = learnSteps.find((s) => !isDone(s.slug));
  const W = 1000;
  const main = learnSteps.filter((s) => !s.slug.startsWith("case-") && s.slug !== "interview-playbook");
  const cases = learnSteps.filter((s) => s.slug.startsWith("case-"));
  const playbook = learnSteps.find((s) => s.slug === "interview-playbook")!;
  const gap = (W - 120) / (main.length - 1 + 1);
  const pos = new Map<string, { x: number; y: number }>();
  main.forEach((s, i) => pos.set(s.slug, { x: 60 + i * gap, y: 70 }));
  const branchX = 60 + (main.length - 1) * gap;
  cases.forEach((s, i) => pos.set(s.slug, { x: branchX + gap * 0.5 + i * gap * 0.9, y: 170 }));
  pos.set(playbook.slug, { x: W - 60, y: 70 });
  const doneUpTo = [...main, playbook].filter((s) => isDone(s.slug)).length;
  const path = `M60,70 H${W - 60}`;
  const lastDone = [...main, playbook][Math.max(doneUpTo - 1, 0)];
  return (
    <div className="metro card" style={{ padding: "8px 8px 4px" }}>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} 220`} role="group" aria-label="HLD path map" style={{ minWidth: 760 }}>
          <path d={path} className="line-base" />
          {doneUpTo > 0 && <path d={`M60,70 H${pos.get(lastDone.slug)!.x}`} className="line-done" />}
          <path d={`M${branchX},70 C${branchX + 40},70 ${branchX + 20},170 ${pos.get(cases[0].slug)!.x - 30},170 H${pos.get(cases.at(-1)!.slug)!.x}`} className="line-base" />
          {learnSteps.map((s) => {
            const p = pos.get(s.slug)!;
            return (
              <Link key={s.slug} href={`/learn/${s.slug}`} aria-label={`Step ${s.order}: ${s.title}`}>
                <g className="station" data-done={isDone(s.slug)} data-next={hydrated && firstOpen?.slug === s.slug}>
                  <circle cx={p.x} cy={p.y} r={13} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="n" style={{ fill: isDone(s.slug) ? "var(--accent-ink)" : undefined }}>
                    {s.order}
                  </text>
                  <text x={p.x} y={p.y - 22} textAnchor="middle">
                    {s.short}
                  </text>
                </g>
              </Link>
            );
          })}
          <text x={branchX + 10} y={208} className="n" style={{ fill: "var(--muted)", fontSize: 11 }}>
            Case studies
          </text>
        </svg>
      </div>
    </div>
  );
}

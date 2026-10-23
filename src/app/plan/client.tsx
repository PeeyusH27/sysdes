"use client";
import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";
import { TRACKS, type Catalog } from "@/lib/prep/catalog-types";
import { mockScore } from "@/lib/prep/mock";
import { useMock } from "@/lib/prep/mock-store";
import { useProgress } from "@/lib/progress";
import { useHydrated } from "@/lib/hooks";
import { PlanView } from "@/components/prep/PlanView";
import { Readiness } from "@/components/prep/Readiness";

export function PlanClient({ catalog }: { catalog: Catalog }) {
  const hydrated = useHydrated();
  const plan = useProgress((s) => s.plan);
  const history = useMock((s) => s.history);
  const tracks = hydrated && plan ? plan.rounds : TRACKS;
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">Prepare · Plan</p>
        <h1>
          Are you ready, <span className="grad">and what is next?</span>
        </h1>
        <p className="lede">
          Readiness is built from what you have actually done: pages finished, quizzes, problems and exercises solved, playground builds and pattern drills. The plan fits the rest into your deadline.
        </p>
      </header>

      <h2 className="section-title">Your plan</h2>
      <PlanView catalog={catalog} />

      <h2 className="section-title" id="readiness-title">
        Your readiness
      </h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Each tile is one skill, scored out of 100. Click one to see why and what to do next.
      </p>
      <Readiness catalog={catalog} tracks={tracks} />

      <h2 className="section-title">Mock rounds</h2>
      <div className="pl-mock card">
        <p>
          <Timer size={16} aria-hidden /> Timed rounds on problems you have not solved yet, with hints and solutions held back until the clock ends. Then a debrief that says what to fix.
        </p>
        <Link href="/mock" className="btn btn-primary">
          Start a mock round <ArrowRight size={15} aria-hidden />
        </Link>
        {hydrated && history.length > 0 && (
          <ul className="pl-history">
            {history.slice(0, 3).map((h) => (
              <li key={h.id}>
                <Link href="/mock/debrief" className="link">
                  {new Date(h.startedAt).toLocaleDateString()} · {h.type.toUpperCase()}
                </Link>{" "}
                <b>{mockScore(h)}%</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

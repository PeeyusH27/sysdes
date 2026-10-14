"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { allPages, learnSteps, questions } from "@content/registry";
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

/**
 * A one-line meter under a track card. It always renders the same box (bar + one line of text), so the page does not
 * move when saved progress arrives after hydration.
 */
export function TrackMeter({ track, problems = [] }: { track: "dsa" | "sd"; problems?: string[] }) {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const solved = useDsa((s) => s.solved);
  let ratio = 0;
  let text = "Progress saves in this browser. No sign-up.";
  if (hydrated && track === "sd") {
    const steps = learnSteps.filter((s) => done[`/learn/${s.slug}`]).length;
    const qs = questions.filter((q) => done[`/questions/${q.slug}`]).length;
    if (steps || qs) {
      ratio = steps / learnSteps.length;
      text = `${steps}/${learnSteps.length} steps done · ${qs}/${questions.length} questions solved`;
    }
  }
  if (hydrated && track === "dsa") {
    const read = patterns.filter((p) => done[`/dsa/patterns/${p.slug}`]).length;
    const n = problems.filter((s) => solved[s]).length;
    if (read || n) {
      ratio = read / patterns.length;
      text = `${read}/${patterns.length} patterns read · ${n}/${problems.length} problems solved`;
    }
  }
  return (
    <div className="meter">
      <span className="meter-bar" aria-hidden>
        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
      </span>
      <p className="meter-text">{text}</p>
    </div>
  );
}

type Card = { href: string; eyebrow: string; title: string; meta: string; track: "dsa" | "sd" | "shorts" | "recent" };

/**
 * "Start here" for a first visit, "Pick up where you left off" once there is saved progress. Same three cards and the
 * same size either way, so nothing shifts when localStorage is read after hydration.
 */
export function NextUp({
  variant = "home",
  shortsCount,
  extra = [],
}: {
  variant?: "home" | "sd";
  shortsCount: number;
  extra?: { href: string; title: string; section: string }[];
}) {
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const recent = useProgress((s) => s.recent);
  const isDone = (href: string) => hydrated && !!done[href];

  const read = patterns.filter((p) => isDone(`/dsa/patterns/${p.slug}`)).length;
  const steps = learnSteps.filter((s) => isDone(`/learn/${s.slug}`)).length;
  const solvedQs = questions.filter((q) => isDone(`/questions/${q.slug}`)).length;
  const pages = [...allPages(), ...extra];
  const lastPage = hydrated ? recent.map((r) => pages.find((p) => p.href === r)).find(Boolean) : undefined;
  const returning = read + steps + solvedQs > 0 || !!lastPage;

  const nextPattern = patterns.find((p) => !isDone(`/dsa/patterns/${p.slug}`));
  const nextStep = learnSteps.find((s) => !isDone(`/learn/${s.slug}`));
  const nextQuestion = questions.find((q) => !isDone(`/questions/${q.slug}`));

  const patternCard: Card = nextPattern
    ? {
        href: `/dsa/patterns/${nextPattern.slug}`,
        eyebrow: read ? `Next pattern · ${read}/${patterns.length} read` : `DSA · Pattern ${nextPattern.order}`,
        title: nextPattern.title,
        meta: `${nextPattern.minutes} min · ${nextPattern.group}`,
        track: "dsa",
      }
    : { href: "/dsa/problems", eyebrow: `All ${patterns.length} patterns read`, title: "Now prove it on problems", meta: "Hidden tests, in your browser", track: "dsa" };
  const stepCard: Card = nextStep
    ? {
        href: `/learn/${nextStep.slug}`,
        eyebrow: steps ? `Next HLD step · ${steps}/${learnSteps.length} done` : `System design · Step ${nextStep.order}`,
        title: nextStep.title,
        meta: `${nextStep.minutes} min · ends with a quiz`,
        track: "sd",
      }
    : { href: "/questions", eyebrow: `All ${learnSteps.length} steps done`, title: "Take on an interview question", meta: `${questions.length} with full answers`, track: "sd" };
  const questionCard: Card = nextQuestion
    ? {
        href: `/questions/${nextQuestion.slug}`,
        eyebrow: solvedQs ? `Next question · ${solvedQs}/${questions.length} solved` : `Interview question · ${nextQuestion.level}`,
        title: nextQuestion.title,
        meta: `${nextQuestion.minutes} min · ${nextQuestion.category}`,
        track: "sd",
      }
    : { href: "/playground", eyebrow: `All ${questions.length} questions solved`, title: "Build one in the playground", meta: "Drag, connect, get graded", track: "sd" };
  const thirdCard: Card = lastPage
    ? { href: lastPage.href, eyebrow: `Last opened · ${lastPage.section}`, title: lastPage.title, meta: "Jump back in", track: "recent" }
    : { href: "/shorts", eyebrow: "Shorts · a minute each", title: "One idea per card. Swipe for the next.", meta: `${shortsCount} shorts`, track: "shorts" };

  const cards = variant === "sd" ? [stepCard, questionCard, thirdCard] : [patternCard, stepCard, thirdCard];
  const id = `next-up-${variant}`;

  return (
    <section className="next-up" aria-labelledby={id} data-returning={returning || undefined}>
      <h2 id={id} className="next-up-title">
        {returning ? "Pick up where you left off" : "Start here"}
      </h2>
      <ul className="next-up-list">
        {cards.map((c) => (
          <li key={c.eyebrow + c.href}>
            <Link href={c.href} className="next-card card-link" data-track={c.track}>
              <span className="next-card-eyebrow">{c.eyebrow}</span>
              <span className="next-card-title">{c.title}</span>
              <span className="next-card-meta">
                {c.meta} <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Older call sites: the list of recently viewed pages (nothing before hydration). Kept for the system design hub. */
export function ContinueLearning({ extra = [] }: { extra?: { href: string; title: string; section: string }[] }) {
  const hydrated = useHydrated();
  const recent = useProgress((s) => s.recent);
  if (!hydrated) return null;
  const pages = [...allPages(), ...extra];
  const recentPages = recent.map((r) => pages.find((p) => p.href === r)).filter(Boolean).slice(0, 4);
  if (!recentPages.length) return null;
  return (
    <>
      <h2 className="section-title">Recently viewed</h2>
      <div className="grid-auto">
        {recentPages.map((p) => (
          <Link key={p!.href} href={p!.href} className="card card-link">
            <span className="eyebrow">{p!.section}</span>
            <h3 style={{ margin: "6px 0 0" }}>{p!.title}</h3>
          </Link>
        ))}
      </div>
    </>
  );
}

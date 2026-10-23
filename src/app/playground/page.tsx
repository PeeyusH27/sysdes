import Link from "next/link";
import { ArrowRight, Compass, Hammer, Shapes } from "lucide-react";
import { questions } from "@content/registry";
import { challenges } from "@/components/playground/challenges";
import { ChallengeScore, MissionProgress } from "@/components/playground/ChallengeScore";
import { getMission } from "@/components/playground/missions";
import { HubTabs } from "@/components/content/HubBits";

export const metadata = {
  title: "Playground",
  description: "Design challenges you build on a canvas and get graded on, plus a free sandbox: drag components, simulate traffic, kill a server and share the result.",
  alternates: { canonical: "/playground" },
};

const STEPS = [
  { title: "Read the brief", text: "Requirements and rough numbers, like the first five minutes of an interview." },
  { title: "Build it", text: "Drag components onto the canvas and wire them together. A live checklist shows what your design is missing." },
  { title: "Break it", text: "Simulate traffic, spike it ten times, kill a component, and see where it gives." },
];

export default function PlaygroundHub() {
  const questionFor = (slug: string) => questions.find((q) => q.challenge === slug);
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · Playground</p>
        <h1>
          Design it, <span className="grad">then break it</span>
        </h1>
        <p className="lede">
          {challenges.length} challenges, graded on the decisions interviewers look for. New to this? Start with a guided mission and a coach beside you.
        </p>
        <ul className="hub-facts">
          <li>
            <b>{challenges.length}</b> challenges
          </li>
          <li>
            <b>{challenges.reduce((n, c) => n + c.rubric.length, 0)}</b> graded checks
          </li>
        </ul>
      </header>
      <HubTabs track="sd" />

      <ol className="pg-steps" aria-label="How a challenge works">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="pg-step-num">{i + 1}</span>
            <b>{s.title}</b>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>

      <ul className="grid-auto hub-cards">
        {challenges.map((c) => {
          const q = questionFor(c.slug);
          const mission = getMission(c.slug);
          return (
            <li key={c.slug}>
              <article className="card topic-card pg-card">
                <span className="tc-top">
                  <span className="tc-min">
                    <Hammer size={12} aria-hidden /> {c.rubric.length} checks
                  </span>
                  {mission && <MissionProgress slug={c.slug} total={mission.steps.length} />}
                  <ChallengeScore slug={c.slug} />
                </span>
                <h2 className="tc-title">{c.title}</h2>
                <p>{c.brief}</p>
                <ul className="pg-reqs">
                  {c.requirements.slice(0, 3).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <span className="pg-cta">
                  {mission && (
                    <Link href={`/playground/${c.slug}/guided`} className="btn btn-sm btn-primary" aria-label={`Guided mission: ${c.title}`}>
                      <Compass size={14} aria-hidden /> Guided mission · {mission.steps.length} steps
                    </Link>
                  )}
                  <Link href={`/playground/${c.slug}`} className="btn btn-sm" aria-label={`${mission ? "Free challenge" : "Start the challenge"}: ${c.title}`}>
                    {mission ? "Free challenge" : "Start the challenge"} {!mission && <ArrowRight size={14} aria-hidden />}
                  </Link>
                </span>
                {q && <span className="muted pg-from">Pairs with the {q.title.replace(/^(Design|Build) (an? )?/, "")} question</span>}
              </article>
            </li>
          );
        })}
        <li>
          <Link href="/playground/sandbox" className="card card-link topic-card">
            <span className="tc-top">
              <span className="tc-min">
                <Shapes size={12} aria-hidden /> Free canvas
              </span>
            </span>
            <h2 className="tc-title">Sandbox</h2>
            <p>No brief and no grade. Start from a lesson or case-study diagram, change it, and watch the simulator react.</p>
            <span className="tc-go">
              Open the sandbox <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

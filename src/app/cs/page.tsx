import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { CS_GROUPS, csLessons } from "@content/cs/registry";
import { DoneBadge, HubTabs } from "@/components/content/HubBits";

export const metadata = {
  title: "CS fundamentals",
  description: "Operating systems and concurrency, networking, and database internals for interviews: short lessons that end with follow-up questions and a quiz.",
  alternates: { canonical: "/cs" },
};

const ROUND = [
  { title: "Answer", text: "Say the idea in one sentence before you explain how it works." },
  { title: "Mechanism", text: "Draw what actually happens: the bytes, the pages, the locks, the log." },
  { title: "Trade-off", text: "Name what the design gives up, and when you would pick the other one." },
  { title: "Follow-up", text: "Practise the next question the interviewer asks, then take the quiz." },
];

export default function CsHub() {
  const minutes = csLessons.reduce((n, l) => n + l.minutes, 0);
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · CS fundamentals</p>
        <h1>
          What is really happening <span className="grad">underneath</span>
        </h1>
        <p className="lede">
          Interviewers ask what a context switch costs, why TCP slows down, and what a transaction promises. Learn the mechanism behind each answer, then check yourself with a quiz.
        </p>
        <ul className="hub-facts">
          <li>
            <b>{csLessons.length}</b> lessons · {Math.round(minutes / 60)} h
          </li>
          <li>
            <b>{CS_GROUPS.length}</b> areas
          </li>
          <li>
            <b>{csLessons.reduce((k, l) => k + l.outcomes.length, 0)}</b> skills
          </li>
        </ul>
      </header>
      <HubTabs track="sd" />

      <ol className="pg-steps" aria-label="How to answer a fundamentals question">
        {ROUND.map((s, i) => (
          <li key={s.title}>
            <span className="pg-step-num">{i + 1}</span>
            <b>{s.title}</b>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>

      {CS_GROUPS.map((g, gi) => {
        const lessons = csLessons.filter((l) => l.group === g);
        if (!lessons.length) return null;
        return (
          <section key={g} aria-labelledby={`cs-g${gi}`}>
            <h2 id={`cs-g${gi}`} className="section-title">
              {gi + 1}. {g}
            </h2>
            <ol className="grid-auto hub-cards">
              {lessons.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/cs/${l.slug}`} className="card card-link topic-card">
                      <span className="tc-top">
                        <span className="tc-num">{String(l.order).padStart(2, "0")}</span>
                        <span className="tc-min">
                          <Clock size={12} aria-hidden /> {l.minutes} min
                        </span>
                        <DoneBadge href={`/cs/${l.slug}`} />
                      </span>
                      <h3 className="tc-title">{l.title}</h3>
                      <p>{l.summary}</p>
                      <span className="tc-go">
                        Lesson {l.order} <ArrowRight size={14} aria-hidden />
                      </span>
                    </Link>
                  </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

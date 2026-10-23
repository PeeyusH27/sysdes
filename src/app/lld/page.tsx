import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { questions } from "@content/registry";
import { isLowLevel, questionLabel } from "@content/home";
import { getLldLesson, lldLessons } from "@content/lld/registry";
import { DoneBadge, HubTabs } from "@/components/content/HubBits";
import { SolvedBar } from "@/components/dsa/SolvedCount";
import { SolvedTick } from "@/components/dsa/SolvedTick";
import { loadExercises } from "@/lib/dsa/load";

export const metadata = {
  title: "Low-level design",
  description: "Learn object-oriented design for interviews: the foundations, the classic LLD questions, and exercises where you write the classes and run hidden tests.",
  alternates: { canonical: "/lld" },
};

const ROUND = [
  { title: "Clarify", text: "Pin down the use cases and what is out of scope before drawing a class." },
  { title: "Model", text: "Nouns become classes, verbs become methods, and each class owns one job." },
  { title: "Extend", text: "Show where a new rule plugs in without editing what already works." },
  { title: "Test", text: "Walk one scenario, then the edge cases, with a clock you can control." },
];

export default function LldHub() {
  const lld = questions.filter(isLowLevel);
  const exercises = loadExercises();
  const minutes = lldLessons.reduce((n, l) => n + l.minutes, 0);
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · Low-level design</p>
        <h1>
          Design the classes, <span className="grad">then prove they work</span>
        </h1>
        <p className="lede">
          Low-level design is about classes and clean seams. Learn the few ideas behind every answer, read the classics, then write the code yourself.
        </p>
        <ul className="hub-facts">
          <li>
            <b>{lldLessons.length}</b> foundations · {Math.round(minutes / 60)} h
          </li>
          <li>
            <b>{lld.length}</b> classic questions
          </li>
          <li>
            <b>{exercises.length}</b> coding exercises
          </li>
        </ul>
      </header>
      <HubTabs track="sd" />

      <ol className="pg-steps" aria-label="How an LLD round goes">
        {ROUND.map((s, i) => (
          <li key={s.title}>
            <span className="pg-step-num">{i + 1}</span>
            <b>{s.title}</b>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>

      <h2 className="section-title">1. Foundations</h2>
      <ol className="grid-auto hub-cards">
        {lldLessons.map((l) => (
          <li key={l.slug}>
            <Link href={`/lld/foundations/${l.slug}`} className="card card-link topic-card">
              <span className="tc-top">
                <span className="tc-num">{String(l.order).padStart(2, "0")}</span>
                <span className="tc-min">
                  <Clock size={12} aria-hidden /> {l.minutes} min
                </span>
                <DoneBadge href={`/lld/foundations/${l.slug}`} />
              </span>
              <h3 className="tc-title">{l.title}</h3>
              <p>{l.summary}</p>
              <span className="tc-go">
                Foundation {l.order} <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <h2 className="section-title">2. The classics, answered in full</h2>
      <ul className="grid-auto hub-cards">
        {lld.map((q) => (
          <li key={q.slug}>
            <Link href={`/questions/${q.slug}`} className="card card-link topic-card">
              <span className="tc-top">
                <span className="badge badge-level">{q.level}</span>
                <span className="tc-min">
                  <Clock size={12} aria-hidden /> {q.minutes} min
                </span>
                <DoneBadge href={`/questions/${q.slug}`} />
              </span>
              <h3 className="tc-title">{questionLabel(q.title)}</h3>
              <p>{q.summary}</p>
              <span className="tc-go">
                Read the answer <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {exercises.length > 0 && (
        <>
          <h2 className="section-title">3. Code it yourself</h2>
          <p className="muted" style={{ marginTop: -6 }}>
            Write the class in JavaScript or Python and submit against hidden tests. A wrong submission unlocks the step-by-step solution.
          </p>
          <SolvedBar slugs={exercises.map((e) => `lld:${e.slug}`)} />
          <ul className="plist" style={{ marginTop: 12 }}>
            {exercises.map((e) => (
              <li key={e.slug}>
                <Link href={`/lld/exercises/${e.slug}`} className="plist-row">
                  <SolvedTick slug={`lld:${e.slug}`} />
                  <span className="plist-title">{e.meta.title}</span>
                  <span className="plist-summary">{e.meta.summary}</span>
                  <span className="plist-tags">
                    {e.meta.patterns.slice(0, 1).map((s) => (
                      <span key={s} className="tag">
                        {getLldLesson(s)?.short ?? s}
                      </span>
                    ))}
                  </span>
                  <span className={`diff diff-${e.meta.difficulty}`}>{e.meta.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

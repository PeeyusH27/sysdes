import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { learnSteps } from "@content/registry";
import { shorts } from "@content/shorts";
import { DoneBadge, ShortsStrip } from "@/components/content/HubBits";
import { MetroMap } from "./metro";

export const metadata = { title: "HLD path", description: "Ten steps from requirements to case studies." };

export default function LearnIndex() {
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">The HLD path</span>
        <h1>
          High-level design, <span className="grad">one stop at a time</span>
        </h1>
        <p className="lede">
          {learnSteps.length} steps for MERN and Python developers. Each has animated flow diagrams you can step through, an interactive
          simulator, JavaScript code that runs, interview answers and a quiz.
        </p>
      </header>
      <MetroMap />
      <ShortsStrip count={shorts.filter((s) => s.track === "System design" && s.source?.startsWith("/learn/")).length} label="the HLD path" />
      <div className="grid-auto" style={{ marginTop: 18 }}>
        {learnSteps.map((s) => (
          <Link key={s.slug} href={`/learn/${s.slug}`} className="card card-link topic-card">
            <span className="tc-top">
              <span className="tc-num">{String(s.order).padStart(2, "0")}</span>
              <span className="tc-min">
                <Clock size={12} aria-hidden /> {s.minutes} min
              </span>
              <DoneBadge href={`/learn/${s.slug}`} />
            </span>
            <h3>{s.title}</h3>
            <p>{s.summary}</p>
            <span className="tc-go">
              Step {s.order} <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

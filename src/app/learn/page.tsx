import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { learnSteps } from "@content/registry";
import { shorts } from "@content/shorts";
import { DoneBadge, HubTabs, ShortsStrip } from "@/components/content/HubBits";
import { MetroMap } from "./metro";

export const metadata = { title: "HLD path", description: "Ten steps from requirements to case studies." };

export default function LearnIndex() {
  const minutes = learnSteps.reduce((n, s) => n + s.minutes, 0);
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · HLD path</p>
        <h1>
          High-level design, <span className="grad">one stop at a time</span>
        </h1>
        <p className="lede">
          {learnSteps.length} steps from rough numbers to a full case study. Each has a diagram that plays, a widget to poke and a quiz to finish.
        </p>
        <ul className="hub-facts">
          <li>
            <b>{learnSteps.length}</b> steps
          </li>
          <li>
            <b>{Math.round(minutes / 60)} h</b> end to end
          </li>
          <li>
            <b>{learnSteps.filter((s) => s.slug.startsWith("case-")).length}</b> case studies
          </li>
        </ul>
      </header>
      <HubTabs track="sd" />
      <MetroMap />
      <ShortsStrip count={shorts.filter((s) => s.track === "System design" && s.source?.startsWith("/learn/")).length} label="the HLD path" />
      <ol className="grid-auto hub-cards">
        {learnSteps.map((s) => (
          <li key={s.slug}>
            <Link href={`/learn/${s.slug}`} className="card card-link topic-card">
              <span className="tc-top">
                <span className="tc-num">{String(s.order).padStart(2, "0")}</span>
                <span className="tc-min">
                  <Clock size={12} aria-hidden /> {s.minutes} min
                </span>
                <DoneBadge href={`/learn/${s.slug}`} />
              </span>
              <h2 className="tc-title">{s.title}</h2>
              <p>{s.summary}</p>
              <span className="tc-go">
                Step {s.order} <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { deepDives } from "@content/registry";
import { shorts } from "@content/shorts";
import { DoneBadge, HubTabs, ShortsStrip } from "@/components/content/HubBits";

export const metadata = { title: "Deep dives", description: "The techniques that come up again and again." };

export default function DeepDivesIndex() {
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · Deep dives</p>
        <h1>
          The techniques <span className="grad">that keep coming up</span>
        </h1>
        <p className="lede">
          {deepDives.length} ideas interviewers circle back to. Watch each one play out, push it in a widget, then keep the trade-offs.
        </p>
      </header>
      <HubTabs track="sd" />
      <ShortsStrip count={shorts.filter((s) => s.track === "System design" && s.source?.startsWith("/deep-dives/")).length} label="these techniques" />
      <ol className="grid-auto hub-cards">
        {deepDives.map((d) => (
          <li key={d.slug}>
            <Link href={`/deep-dives/${d.slug}`} className="card card-link topic-card">
              <span className="tc-top">
                <span className="tc-num">{String(d.order).padStart(2, "0")}</span>
                <span className="tc-min">
                  <Clock size={12} aria-hidden /> {d.minutes} min
                </span>
                <DoneBadge href={`/deep-dives/${d.slug}`} />
              </span>
              <h2 className="tc-title">{d.title}</h2>
              <p>{d.summary}</p>
              <span className="tags">
                {d.tags.slice(0, 4).map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </span>
              <span className="tc-go">
                Open the deep dive <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

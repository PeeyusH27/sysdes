import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { deepDives } from "@content/registry";
import { shorts } from "@content/shorts";
import { DoneBadge, ShortsStrip } from "@/components/content/HubBits";

export const metadata = { title: "Deep dives", description: "The techniques that come up again and again." };

export default function DeepDivesIndex() {
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Deep dives</span>
        <h1>
          The techniques <span className="grad">that matter</span>
        </h1>
        <p className="lede">Caching, sharding, storage, real-time delivery, connections and request flows: each with an animated diagram, a simulator, a comparison table and code cards.</p>
      </header>
      <ShortsStrip count={shorts.filter((s) => s.track === "System design" && s.source?.startsWith("/deep-dives/")).length} label="these techniques" />
      <div className="grid-auto" style={{ marginTop: 18 }}>
        {deepDives.map((d) => (
          <Link key={d.slug} href={`/deep-dives/${d.slug}`} className="card card-link topic-card">
            <span className="tc-top">
              <span className="tc-num">{String(d.order).padStart(2, "0")}</span>
              <span className="tc-min">
                <Clock size={12} aria-hidden /> {d.minutes} min
              </span>
              <DoneBadge href={`/deep-dives/${d.slug}`} />
            </span>
            <h3>{d.title}</h3>
            <p>{d.summary}</p>
            <span className="tags">
              {d.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </span>
            <span className="tc-go">
              Open deep dive <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

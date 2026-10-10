import Link from "next/link";
import { deepDives } from "@content/registry";

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
      <div className="grid-auto">
        {deepDives.map((d) => (
          <Link key={d.slug} href={`/deep-dives/${d.slug}`} className="card card-link">
            <span className="eyebrow">Deep dive {d.order} · {d.minutes} min</span>
            <h3 style={{ margin: "6px 0 6px", fontSize: 18 }}>{d.title}</h3>
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 14.5 }}>{d.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {d.tags.slice(0, 4).map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

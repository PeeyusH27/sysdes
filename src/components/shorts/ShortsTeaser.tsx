import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Short } from "@content/shorts";
import { Inline } from "./Inline";

/** Home page preview: three shorts in a deck that deals itself (CSS only; static when motion is reduced). */
export function ShortsTeaser({ items }: { items: Short[] }) {
  return (
    <div className="teaser">
      <div className="teaser-stack">
        {items.map((s, i) => (
          <Link key={s.id} href={`/shorts?s=${s.id}`} className="teaser-card" data-track={s.track} style={{ "--d": i } as React.CSSProperties}>
            <span className="short-chip">
              {s.track} · {s.topic}
            </span>
            <h3>{s.title}</h3>
            <ul>
              {s.points.slice(0, 3).map((p) => (
                <li key={p}>
                  <Inline text={p} />
                </li>
              ))}
            </ul>
            <span className="teaser-swipe">
              Read this short <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

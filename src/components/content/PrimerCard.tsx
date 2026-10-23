import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPrimer } from "@content/primers";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { Doodle } from "@/components/doodle/Doodle";
import { PrimerFold } from "./PrimerFold";

/**
 * "What is X?" in a minute: the picture, the animation (without it, then with it) and three things to remember.
 * `compact` is the version at the top of a lesson, which folds away once you know it; the full one is the page at
 * /basics/<id>, with when to use it, the catch, what to say in an interview and where to go next.
 */
export function PrimerCard({ id, compact = false, startClosed = false }: { id: string; compact?: boolean; startClosed?: boolean }) {
  const p = getPrimer(id);
  if (!p) return null;
  const body = (
    <div className="primer">
      <div className="primer-top">
        <Doodle name={p.doodle} size={compact ? 118 : 170} />
        <div>
          <p className="primer-idea">{p.idea}</p>
          <p className="primer-analogy">{p.analogy}</p>
        </div>
      </div>
      <div className="primer-flow">
        <FlowDiagram spec={p.flow} autoplay={!compact} />
      </div>
      <ul className="primer-remember" aria-label="Remember">
        {p.remember.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {!compact && (
        <>
          <div className="primer-cols">
            <div>
              <h3>Reach for it when</h3>
              <p>{p.whenToUse}</p>
            </div>
            <div>
              <h3>The catch</h3>
              <p>{p.theCatch}</p>
            </div>
          </div>
          <p className="primer-say">
            <span className="eyebrow">Say it in an interview</span>
            &ldquo;{p.say}&rdquo;
          </p>
          <ul className="primer-more">
            {p.learnMore.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link">
                  {l.label} <ArrowRight size={13} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {compact && (
        <p className="primer-open">
          <Link href={`/basics/${p.id}`} className="link">
            Open the full primer <ArrowRight size={13} aria-hidden />
          </Link>
        </p>
      )}
    </div>
  );
  return compact ? (
    <PrimerFold id={p.id} title={p.title} startClosed={startClosed}>
      {body}
    </PrimerFold>
  ) : (
    body
  );
}

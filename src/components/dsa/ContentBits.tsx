import Link from "next/link";
import { Braces } from "lucide-react";
import { getJsTopic } from "@content/dsa/registry";
import { loadProblem } from "@/lib/dsa/load";
import { SolvedTick } from "./SolvedTick";

/**
 * Link to the JavaScript cheat sheet. `<JsRef to="map-set" />` is an inline chip;
 * `<JsRef to={["map-set", "sorting"]} />` is a labelled row of chips.
 */
export function JsRef({ to, label = "JavaScript refresher" }: { to: string | string[]; label?: string }) {
  const ids = Array.isArray(to) ? to : [to];
  const chips = ids.map((id) => {
    const t = getJsTopic(id);
    if (!t) throw new Error(`<JsRef>: unknown cheat sheet topic "${id}"`);
    return (
      <Link key={id} href={`/dsa/js#${id}`} className="js-ref" title={t.summary}>
        <Braces size={12} aria-hidden /> {t.title}
      </Link>
    );
  });
  if (!Array.isArray(to)) return chips[0];
  return (
    <span className="js-ref-row">
      <span className="js-ref-label">{label}:</span> {chips}
    </span>
  );
}

/** `<ProblemLink slug="two-sum" />`: a link to a practice problem with its difficulty and a solved tick. */
export function ProblemLink({ slug }: { slug: string }) {
  const p = loadProblem(slug);
  if (!p) throw new Error(`<ProblemLink>: unknown problem "${slug}"`);
  return (
    <Link href={`/dsa/problems/${slug}`} className="problem-link">
      <SolvedTick slug={slug} />
      {p.meta.title}
      <span className={`diff diff-${p.meta.difficulty}`}>{p.meta.difficulty}</span>
    </Link>
  );
}

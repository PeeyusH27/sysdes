import Link from "next/link";
import { getPattern } from "@content/dsa/registry";
import { loadProblems } from "@/lib/dsa/load";
import { SolvedCount } from "./SolvedCount";
import { SolvedTick } from "./SolvedTick";

/** "Practice problems" section appended to every pattern page: problems tagged with the pattern, primary ones first. */
export function PatternProblems({ slug }: { slug: string }) {
  const all = loadProblems().filter((p) => p.meta.patterns.includes(slug));
  const items = [...all.filter((p) => p.meta.patterns[0] === slug), ...all.filter((p) => p.meta.patterns[0] !== slug)];
  if (!items.length) return null;
  return (
    <section className="pattern-problems" aria-labelledby="practice-problems">
      <h2 id="practice-problems">Practice problems</h2>
      <p>
        Solve these in the browser editor. Each runs against hidden tests; the step-by-step solution unlocks after a wrong submission.{" "}
        <SolvedCount slugs={items.map((p) => p.slug)} />
      </p>
      <ul className="plist">
        {items.map((p) => (
          <li key={p.slug}>
            <Link href={`/dsa/problems/${p.slug}`} className="plist-row">
              <SolvedTick slug={p.slug} />
              <span className="plist-title">{p.meta.title}</span>
              <span className="plist-summary">{p.meta.summary}</span>
              <span className="plist-tags">{p.meta.patterns[0] !== slug && <span className="tag">mainly {getPattern(p.meta.patterns[0])?.short ?? p.meta.patterns[0]}</span>}</span>
              <span className={`diff diff-${p.meta.difficulty}`}>{p.meta.difficulty}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href={`/dsa/problems?p=${slug}`} className="link">
          Open these in the problem list →
        </Link>
      </p>
    </section>
  );
}

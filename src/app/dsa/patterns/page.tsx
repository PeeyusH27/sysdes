import Link from "next/link";
import { PATTERN_GROUPS, patterns } from "@content/dsa/registry";
import { loadProblems } from "@/lib/dsa/load";
import { SolvedBar, SolvedCount } from "@/components/dsa/SolvedCount";
import { PatternDone } from "@/components/dsa/PatternDone";

export const metadata = {
  title: "DSA patterns",
  description: "The 22 patterns behind most coding interview problems, each explained step by step with animations and JavaScript code.",
};

export default function PatternsIndex() {
  const problems = loadProblems();
  const slugsFor = (slug: string) => problems.filter((p) => p.meta.patterns.includes(slug)).map((p) => p.slug);
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">DSA · Patterns</span>
        <h1>
          {patterns.length} patterns, <span className="grad">most of the problems</span>
        </h1>
        <p className="lede">
          Interview problems repeat a small set of ideas. Learn to spot each pattern, watch it run step by step, copy the JavaScript template, then practise on
          tagged problems. Go in order the first time: each pattern builds on the one before.
        </p>
      </header>
      {PATTERN_GROUPS.map((g) => {
        const list = patterns.filter((p) => p.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="pattern-group">
            <h2 className="section-title">{g}</h2>
            <div className="grid-auto">
              {list.map((p) => {
                const slugs = slugsFor(p.slug);
                return (
                  <Link key={p.slug} href={`/dsa/patterns/${p.slug}`} className="card card-link pattern-card">
                    <span className="eyebrow">
                      Pattern {p.order} · {p.minutes} min <PatternDone slug={p.slug} />
                    </span>
                    <h3>{p.title}</h3>
                    <p>{p.summary}</p>
                    <div className="tags">
                      {p.signals.slice(0, 3).map((s) => (
                        <span key={s} className="tag">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="pattern-card-foot">
                      <SolvedBar slugs={slugs} />
                      <span className="muted">
                        {slugs.length} problems <SolvedCount slugs={slugs} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

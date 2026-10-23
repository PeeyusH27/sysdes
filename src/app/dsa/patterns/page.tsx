import Link from "next/link";
import { PATTERN_GROUPS, patterns } from "@content/dsa/registry";
import { loadProblems } from "@/lib/dsa/load";
import { SolvedBar, SolvedCount } from "@/components/dsa/SolvedCount";
import { PatternDone } from "@/components/dsa/PatternDone";
import { HubTabs } from "@/components/content/HubBits";

export const metadata = {
  title: "DSA patterns",
  description: "The 24 patterns behind most coding interview problems, each explained step by step with animations and JavaScript code.",
};

export default function PatternsIndex() {
  const problems = loadProblems();
  const slugsFor = (slug: string) => problems.filter((p) => p.meta.patterns.includes(slug)).map((p) => p.slug);
  return (
    <div className="container hub" data-track="dsa">
      <header className="page-head hub-head">
        <p className="eyebrow">DSA · Patterns</p>
        <h1>
          {patterns.length} patterns, <span className="grad">most of the problems</span>
        </h1>
        <p className="lede">
          Interview problems repeat a small set of ideas. Spot the pattern, watch it run, then practise. New to this? Go in order: each one builds on the last.
        </p>
        <nav className="hub-jump" aria-label="Pattern groups">
          {PATTERN_GROUPS.map((g) => (
            <a key={g} href={`#${groupId(g)}`}>
              {g} <span>{patterns.filter((p) => p.group === g).length}</span>
            </a>
          ))}
        </nav>
      </header>
      <HubTabs track="dsa" />
      {PATTERN_GROUPS.map((g) => {
        const list = patterns.filter((p) => p.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="pattern-group" id={groupId(g)} aria-labelledby={`${groupId(g)}-h`}>
            <h2 className="section-title" id={`${groupId(g)}-h`}>
              {g}
            </h2>
            <ul className="grid-auto hub-cards">
              {list.map((p) => {
                const slugs = slugsFor(p.slug);
                return (
                  <li key={p.slug}>
                    <Link href={`/dsa/patterns/${p.slug}`} className="card card-link pattern-card">
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
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const groupId = (g: string) => g.toLowerCase().replace(/[^a-z]+/g, "-");

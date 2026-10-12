import Link from "next/link";
import { ArrowRight, Binary, Braces, Code2 } from "lucide-react";
import { jsTopics, PATTERN_GROUPS, patterns } from "@content/dsa/registry";
import { pairSum } from "@content/dsa/patterns/02-two-pointers/viz";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { problemRows } from "@/lib/dsa/load";
import { SolvedBar, SolvedCount } from "@/components/dsa/SolvedCount";
import { NextProblem } from "@/components/dsa/NextProblem";
import { PatternDone } from "@/components/dsa/PatternDone";

export const metadata = {
  title: "DSA track",
  description: "Learn data structures and algorithms pattern by pattern in JavaScript: a cheat sheet, animated pattern walkthroughs, and problems you solve in the browser.",
  alternates: { canonical: "/dsa" },
};

export default function DsaHome() {
  const rows = problemRows();
  const slugsFor = (slug: string) => rows.filter((r) => r.patterns.includes(slug)).map((r) => r.slug);
  return (
    <div className="container">
      <section className="hero dsa-hero">
        <div>
          <span className="eyebrow">DSA track · JavaScript</span>
          <h1>
            Learn the patterns, <span className="grad">not 1,000 problems.</span>
          </h1>
          <p>
            Most interview problems are variations of about twenty ideas. Learn each one with a step-by-step animation and a JavaScript template, then prove it
            on problems you solve right here in the browser.
          </p>
          <div className="hero-cta">
            <Link href="/dsa/js" className="btn btn-primary">
              Start with the JS cheat sheet <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/dsa/patterns" className="btn">
              Browse patterns
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <AlgoViz trace={pairSum} compact autoplay loop />
        </div>
      </section>

      <ol className="roadmap">
        <li>
          <Link href="/dsa/js" className="card card-link">
            <span className="icon">
              <Braces size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 0</span>
            <h3>JavaScript for DSA</h3>
            <p>{jsTopics.length} topics: arrays, strings, Map and Set, sorting, recursion, heaps, bit tricks and the gotchas that fail hidden tests. Every snippet runs.</p>
          </Link>
        </li>
        <li>
          <Link href="/dsa/patterns" className="card card-link">
            <span className="icon">
              <Binary size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 1</span>
            <h3>{patterns.length} patterns</h3>
            <p>How to spot each one, an animated walkthrough synced to the code, a reusable template, complexity, common mistakes and a quiz.</p>
          </Link>
        </li>
        <li>
          <Link href="/dsa/problems" className="card card-link">
            <span className="icon">
              <Code2 size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 2</span>
            <h3>{rows.length} practice problems</h3>
            <p>
              Write JavaScript, run the examples, submit against hidden tests. Solved problems are ticked; a step-by-step solution unlocks after a wrong attempt.
            </p>
            <SolvedBar slugs={rows.map((r) => r.slug)} />
          </Link>
        </li>
      </ol>

      <NextProblem rows={rows.map((r) => ({ slug: r.slug, title: r.title, difficulty: r.difficulty, pattern: r.patterns[0] }))} />

      <h2 className="section-title">The pattern path</h2>
      {PATTERN_GROUPS.map((g) => {
        const list = patterns.filter((p) => p.group === g);
        return (
          <div key={g} className="path-group">
            <h3>{g}</h3>
            <ul className="path-list">
              {list.map((p) => {
                const slugs = slugsFor(p.slug);
                return (
                  <li key={p.slug}>
                    <Link href={`/dsa/patterns/${p.slug}`}>
                      <span className="path-n">{p.order}</span>
                      <span className="path-title">
                        {p.title} <PatternDone slug={p.slug} />
                      </span>
                      <span className="path-meta">
                        <SolvedBar slugs={slugs} /> <SolvedCount slugs={slugs} suffix="" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

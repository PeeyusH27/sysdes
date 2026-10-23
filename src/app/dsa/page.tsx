import Link from "next/link";
import { ArrowRight, Binary, Braces, Code2, Target } from "lucide-react";
import { jsTopics, PATTERN_GROUPS, patterns } from "@content/dsa/registry";
import { pairSum } from "@content/dsa/patterns/02-two-pointers/viz";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { problemRows } from "@/lib/dsa/load";
import { SolvedBar, SolvedCount } from "@/components/dsa/SolvedCount";
import { NextProblem } from "@/components/dsa/NextProblem";
import { PatternDone } from "@/components/dsa/PatternDone";
import { HubTabs, ShortsStrip } from "@/components/content/HubBits";
import { shorts } from "@content/shorts";

export const metadata = {
  title: "DSA track",
  description: "Learn data structures and algorithms pattern by pattern in JavaScript: a cheat sheet, animated pattern walkthroughs, and problems you solve in the browser.",
  alternates: { canonical: "/dsa" },
};

export default function DsaHome() {
  const rows = problemRows();
  const slugsFor = (slug: string) => rows.filter((r) => r.patterns.includes(slug)).map((r) => r.slug);
  return (
    <div className="container hub" data-track="dsa">
      <section className="hub-hero">
        <div>
          <p className="eyebrow">DSA track · JavaScript</p>
          <h1>
            Learn the patterns, <span className="grad">not 1,000 problems.</span>
          </h1>
          <p className="lede">
            Most interview problems are one of about twenty ideas in disguise. Learn each with an animation and a template, then prove it on problems that run
            right here.
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
        <div className="hub-visual">
          <AlgoViz trace={pairSum} compact autoplay loop />
        </div>
      </section>

      <HubTabs track="dsa" />

      <ol className="roadmap">
        <li>
          <Link href="/dsa/js" className="card card-link">
            <span className="icon">
              <Braces size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 0</span>
            <h2 className="roadmap-title">JavaScript for DSA</h2>
            <p>{jsTopics.length} topics: Map and Set, sorting, recursion, heaps, bit tricks and the gotchas that fail hidden tests. Every snippet runs.</p>
          </Link>
        </li>
        <li>
          <Link href="/dsa/patterns" className="card card-link">
            <span className="icon">
              <Binary size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 1</span>
            <h2 className="roadmap-title">{patterns.length} patterns</h2>
            <p>How to spot each one, a walkthrough synced to the code, a template, a lab and a quiz.</p>
          </Link>
        </li>
        <li>
          <Link href="/dsa/problems" className="card card-link">
            <span className="icon">
              <Code2 size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 2</span>
            <h2 className="roadmap-title">{rows.length} practice problems</h2>
            <p>Write JavaScript, run the examples, submit against hidden tests. One wrong attempt unlocks the step-by-step solution.</p>
            <SolvedBar slugs={rows.map((r) => r.slug)} />
          </Link>
        </li>
        <li>
          <Link href="/dsa/drill" className="card card-link">
            <span className="icon">
              <Target size={20} aria-hidden />
            </span>
            <span className="eyebrow">Step 3</span>
            <h2 className="roadmap-title">Pattern drill</h2>
            <p>Read a problem, name the pattern. Ten quick questions on the skill that decides whether a new problem feels familiar.</p>
          </Link>
        </li>
      </ol>

      <ShortsStrip count={shorts.filter((s) => s.track === "DSA" || s.track === "JavaScript").length} label="DSA patterns and JavaScript" />

      <NextProblem rows={rows.map((r) => ({ slug: r.slug, title: r.title, difficulty: r.difficulty, pattern: r.patterns[0] }))} />

      <h2 className="section-title">The pattern path</h2>
      {PATTERN_GROUPS.map((g) => {
        const list = patterns.filter((p) => p.group === g);
        if (!list.length) return null;
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

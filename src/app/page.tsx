import Link from "next/link";
import { ArrowRight, Binary, Braces, Code2, Network } from "lucide-react";
import { deepDives, learnSteps, questions } from "@content/registry";
import { jsTopics, patterns } from "@content/dsa/registry";
import { requestJourney } from "@content/home";
import { pairSum } from "@content/dsa/patterns/02-two-pointers/viz";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { problemRows } from "@/lib/dsa/load";
import { ContinueLearning, LegacyHashRedirect, TrackProgress } from "./home-client";

export default function Home() {
  const problems = problemRows();
  return (
    <div className="container">
      <LegacyHashRedirect />
      <section className="hero home-hero">
        <div>
          <span className="eyebrow">Coding interviews, from first principles</span>
          <h1>
            Master <span className="grad">DSA patterns</span> and <span className="grad">system design</span>, then practise both.
          </h1>
          <p>
            Two tracks in one place. Learn the patterns behind most coding problems with step-by-step animations and solve them in a browser editor, then design
            real systems with animated diagrams, simulators and a graded playground.
          </p>
        </div>
      </section>

      <div className="track-cards">
        <article className="track-card" data-track="dsa" aria-labelledby="track-dsa">
          <div className="track-visual">
            <AlgoViz trace={pairSum} compact autoplay loop />
          </div>
          <div className="track-body">
            <span className="eyebrow">
              <Binary size={13} aria-hidden /> Track 1
            </span>
            <h2 id="track-dsa">Data structures and algorithms</h2>
            <p>
              Start with the JavaScript you need, learn each pattern with an animated walkthrough and a code template, then solve tagged problems with tests
              that run in your browser.
            </p>
            <ul className="track-stats">
              <li>
                <b>{jsTopics.length}</b> JavaScript topics
              </li>
              <li>
                <b>{patterns.length}</b> patterns
              </li>
              <li>
                <b>{problems.length}</b> problems
              </li>
            </ul>
            <ol className="track-steps">
              <li>
                <Link href="/dsa/js">
                  <Braces size={14} aria-hidden /> JavaScript for DSA cheat sheet
                </Link>
              </li>
              <li>
                <Link href="/dsa/patterns">
                  <Binary size={14} aria-hidden /> Patterns, explained step by step
                </Link>
              </li>
              <li>
                <Link href="/dsa/problems">
                  <Code2 size={14} aria-hidden /> Practice in the editor
                </Link>
              </li>
            </ol>
            <TrackProgress track="dsa" problems={problems.map((p) => p.slug)} />
            <div className="hero-cta">
              <Link href="/dsa" className="btn btn-primary">
                Start the DSA track <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/dsa/problems" className="btn">
                Practice problems
              </Link>
            </div>
          </div>
        </article>

        <article className="track-card" data-track="sd" aria-labelledby="track-sd">
          <div className="track-visual">
            <FlowDiagram spec={requestJourney} autoplay loop compact />
          </div>
          <div className="track-body">
            <span className="eyebrow">
              <Network size={13} aria-hidden /> Track 2
            </span>
            <h2 id="track-sd">System design</h2>
            <p>
              A step-by-step HLD path with animated diagrams you can play and pause, interactive simulators, detailed interview answers in JavaScript, and a
              drag-and-drop playground that grades your designs.
            </p>
            <ul className="track-stats">
              <li>
                <b>{learnSteps.length}</b> HLD steps
              </li>
              <li>
                <b>{deepDives.length}</b> deep dives
              </li>
              <li>
                <b>{questions.length}</b> interview questions
              </li>
            </ul>
            <ol className="track-steps">
              <li>
                <Link href="/learn">HLD path: estimation to case studies</Link>
              </li>
              <li>
                <Link href="/questions">Interview questions with full answers</Link>
              </li>
              <li>
                <Link href="/playground">Build and grade designs in the playground</Link>
              </li>
            </ol>
            <TrackProgress track="sd" />
            <div className="hero-cta">
              <Link href="/learn" className="btn btn-primary">
                Start the HLD path <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/system-design" className="btn">
                System design overview
              </Link>
            </div>
          </div>
        </article>
      </div>

      <ContinueLearning extra={problems.map((p) => ({ href: `/dsa/problems/${p.slug}`, title: p.title, section: "Problems" }))} />
    </div>
  );
}

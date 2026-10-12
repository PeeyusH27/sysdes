import Link from "next/link";
import { ArrowDown, ArrowRight, Binary, Braces, Code2, GalleryHorizontalEnd, Network, Sparkles, Zap } from "lucide-react";
import { deepDives, learnSteps, questions } from "@content/registry";
import { jsTopics, patterns } from "@content/dsa/registry";
import { shorts } from "@content/shorts";
import { requestJourney } from "@content/home";
import { pairSum } from "@content/dsa/patterns/02-two-pointers/viz";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { ShortsTeaser } from "@/components/shorts/ShortsTeaser";
import { problemRows } from "@/lib/dsa/load";
import { ContinueLearning, LegacyHashRedirect, TrackProgress } from "./home-client";

const FEATURES = [
  { Icon: GalleryHorizontalEnd, title: "Read in cards", text: "Every lesson is split into short section cards. Tick each one off, or flip through them one at a time." },
  { Icon: Sparkles, title: "Play with it", text: "Step through animated diagrams, drag sliders on simulators, and watch algorithms run line by line." },
  { Icon: Code2, title: "Practise for real", text: "Solve problems in a browser editor with hidden tests, and get your designs graded in the playground." },
  { Icon: Zap, title: "One-minute shorts", text: "Bullet-point cards for when you only have a minute. Swipe for the next idea, scroll for more." },
];

export default function Home() {
  const problems = problemRows();
  return (
    <div className="container home">
      <LegacyHashRedirect />
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">Coding interviews, from first principles</span>
          <h1>
            Master <span className="grad">DSA patterns</span> and <span className="grad">system design</span>, one card at a time.
          </h1>
          <p>
            Bite-sized lessons you can tick off, animations you can poke at, and one-minute shorts for the bus ride. Learn it, then practise it in the
            browser.
          </p>
          <div className="hero-cta">
            <Link href="/shorts" className="btn btn-primary">
              <Zap size={16} aria-hidden /> Swipe through shorts
            </Link>
            <a href="#tracks" className="btn">
              Pick a track <ArrowDown size={16} aria-hidden />
            </a>
          </div>
          <ul className="hero-stats">
            <li>
              <b>{patterns.length}</b> patterns
            </li>
            <li>
              <b>{problems.length}</b> problems
            </li>
            <li>
              <b>{learnSteps.length + deepDives.length + questions.length}</b> design lessons
            </li>
            <li>
              <b>{shorts.length}</b> shorts
            </li>
          </ul>
        </div>
        <ShortsTeaser items={shorts.slice(0, 3)} />
      </section>

      <div className="track-cards" id="tracks">
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

      <h2 className="section-title">Made for short attention spans</h2>
      <ul className="bento">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="feature tilt">
            <span className="feature-icon">
              <Icon size={20} aria-hidden />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>

      <ContinueLearning extra={problems.map((p) => ({ href: `/dsa/problems/${p.slug}`, title: p.title, section: "Problems" }))} />
    </div>
  );
}

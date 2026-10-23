import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowDown, ArrowRight, Binary, ClipboardCheck, Network, Zap } from "lucide-react";
import { deepDives, learnSteps, questions } from "@content/registry";
import { jsTopics, patterns } from "@content/dsa/registry";
import { shorts } from "@content/shorts";
import { playLabs, playSimulators, requestJourney, type PlayArt, type PlayItem } from "@content/home";
import { pairSum } from "@content/dsa/patterns/02-two-pointers/viz";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { ShortsTeaser } from "@/components/shorts/ShortsTeaser";
import { problemRows } from "@/lib/dsa/load";
import { LegacyHashRedirect, NextUp, TrackMeter } from "./home-client";

export default function Home() {
  const problems = problemRows();
  return (
    <div className="container home">
      <LegacyHashRedirect />

      <section className="h-hero" aria-labelledby="home-title">
        <div className="h-hero-copy">
          <p className="eyebrow">Interview prep, at your pace</p>
          <h1 id="home-title">
            Watch it run.
            <br />
            <span className="h-mark">Then run it yourself.</span>
          </h1>
          <p className="h-lede">
            Nervous about the interview? Start anywhere. Every idea comes with an animation you can step through and a simulator you can break.
          </p>
          <div className="hero-cta">
            <a href="#tracks" className="btn btn-primary">
              Choose your track <ArrowDown size={16} aria-hidden />
            </a>
            <Link href="/plan" className="link">
              <ClipboardCheck size={16} aria-hidden /> Plan my prep
            </Link>
          </div>
        </div>
        <div className="h-stage">
          <div className="h-pane" data-track="sd">
            <p className="h-pane-label">
              <Network size={14} aria-hidden /> System design <span>A request&apos;s journey</span>
            </p>
            <FlowDiagram spec={requestJourney} autoplay loop compact />
          </div>
          <div className="h-pane" data-track="dsa">
            <p className="h-pane-label">
              <Binary size={14} aria-hidden /> DSA <span>Two pointers find a pair</span>
            </p>
            <AlgoViz trace={pairSum} compact autoplay loop />
          </div>
        </div>
      </section>

      <NextUp shortsCount={shorts.length} extra={problems.map((p) => ({ href: `/dsa/problems/${p.slug}`, title: p.title, section: "Problems" }))} />

      <section id="tracks" className="h-tracks" aria-label="Tracks">
        <article className="t-card" data-track="dsa" aria-labelledby="track-dsa">
          <p className="eyebrow">
            <Binary size={13} aria-hidden /> Track 1 · Coding rounds
          </p>
          <h2 id="track-dsa">Data structures and algorithms</h2>
          <p className="t-pitch">Most problems are one of about twenty ideas in disguise. Learn the idea, watch it move, then prove it on real problems.</p>
          <ol className="t-route">
            <Stop href="/dsa/js" title="JavaScript cheat sheet" note={`${jsTopics.length} topics, every snippet runs`} />
            <Stop href="/dsa/patterns" title={`${patterns.length} patterns`} note="A walkthrough, a template and a lab each" />
            <Stop href="/dsa/problems" title={`${problems.length} problems`} note="Hidden tests run in your browser" />
          </ol>
          <TrackMeter track="dsa" problems={problems.map((p) => p.slug)} />
          <div className="hero-cta">
            <Link href="/dsa" className="btn btn-primary">
              Start the DSA track <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/dsa/patterns" className="link">
              Browse patterns
            </Link>
          </div>
        </article>

        <article className="t-card" data-track="sd" aria-labelledby="track-sd">
          <p className="eyebrow">
            <Network size={13} aria-hidden /> Track 2 · Design rounds
          </p>
          <h2 id="track-sd">System design</h2>
          <p className="t-pitch">From back-of-envelope numbers to a design you can defend. Every diagram plays, and every simulator breaks on demand.</p>
          <ol className="t-route">
            <Stop href="/learn" title={`${learnSteps.length}-step HLD path`} note="Estimation to case studies" />
            <Stop href="/deep-dives" title={`${deepDives.length} deep dives`} note="Caching, sharding, real-time and more" />
            <Stop href="/questions" title={`${questions.length} interview questions`} note="Parking lot to Uber, with full answers" />
            <Stop href="/lld" title="Low-level design" note="Foundations, classics and coding exercises" />
            <Stop href="/playground" title="Playground" note="Build a design and get it graded" />
          </ol>
          <TrackMeter track="sd" />
          <div className="hero-cta">
            <Link href="/learn" className="btn btn-primary">
              Start the HLD path <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/system-design" className="link">
              Track overview
            </Link>
          </div>
        </article>
      </section>

      <section className="h-play" aria-labelledby="play-title">
        <div className="h-head">
          <p className="eyebrow">Play with it</p>
          <h2 id="play-title">Break things on purpose</h2>
          <p>Push a slider until something gives. You learn the limits faster when you find them yourself.</p>
        </div>
        <PlayRow id="play-sd" title="System design simulators" track="sd" items={playSimulators} />
        <PlayRow id="play-dsa" title="DSA labs" track="dsa" items={playLabs} />
      </section>

      <section className="h-shorts" aria-labelledby="shorts-title">
        <div className="h-shorts-copy">
          <p className="eyebrow">
            <Zap size={13} aria-hidden /> Shorts
          </p>
          <h2 id="shorts-title">Got a minute? Learn one idea.</h2>
          <p>A hook, three points and a line to say in the interview. Swipe for the next card, scroll down to go deeper.</p>
          <Link href="/shorts" className="btn btn-primary">
            Open the shorts <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <ShortsTeaser items={shorts.slice(0, 3)} />
      </section>
    </div>
  );
}

function Stop({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <li>
      <Link href={href} className="t-stop">
        <span className="t-stop-title">{title}</span>
        <span className="t-stop-note">{note}</span>
        <ArrowRight size={15} aria-hidden />
      </Link>
    </li>
  );
}

function PlayRow({ id, title, track, items }: { id: string; title: string; track: "sd" | "dsa"; items: PlayItem[] }) {
  return (
    <div className="play-row" data-track={track}>
      <h3 id={id} className="play-row-title">
        {title}
      </h3>
      <ul className="play-grid" aria-labelledby={id}>
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="play-card card-link">
              <span className="play-art" aria-hidden>
                <Art kind={it.art} />
              </span>
              <span className="play-title">{it.title}</span>
              <span className="play-hook">{it.hook}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ little looping scenes for the play cards (decorative) */

const v = (o: Record<string, string | number>) => o as CSSProperties;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 160 96" className="pa" focusable="false">
      {children}
    </svg>
  );
}

function Art({ kind }: { kind: PlayArt }) {
  switch (kind) {
    case "parking":
      return (
        <Svg>
          <rect className="pa-frame" x="6" y="6" width="148" height="84" rx="8" />
          {range(6).map((i) => (
            <g key={i} className="pa-line">
              <line x1={16 + i * 26} y1="10" x2={16 + i * 26} y2="34" />
              <line x1={16 + i * 26} y1="62" x2={16 + i * 26} y2="86" />
            </g>
          ))}
          <line className="pa-dash" x1="10" y1="48" x2="150" y2="48" />
          {[0, 1, 3, 4].map((i) => (
            <rect key={`t${i}`} className="pa-block" x={21 + i * 26} y="13" width="16" height="19" rx="4" />
          ))}
          {[0, 2, 3].map((i) => (
            <rect key={`b${i}`} className="pa-block" x={21 + i * 26} y="64" width="16" height="19" rx="4" />
          ))}
          <g className="pa-park">
            <rect className="pa-hot" x="73" y="13" width="16" height="19" rx="4" />
            <rect className="pa-glass" x="76" y="16" width="10" height="5" rx="1.5" />
          </g>
        </Svg>
      );
    case "elevator":
      return (
        <Svg>
          <rect className="pa-frame" x="34" y="4" width="92" height="88" rx="6" />
          {range(4).map((i) => (
            <line key={i} className="pa-dash" x1="34" y1={22 + i * 17.5} x2="126" y2={22 + i * 17.5} />
          ))}
          <rect className="pa-line" x="48" y="8" width="26" height="80" rx="3" />
          <rect className="pa-line" x="86" y="8" width="26" height="80" rx="3" />
          <rect className="pa-hot pa-lift-a" x="50" y="72" width="22" height="14" rx="2" />
          <rect className="pa-block pa-lift-b" x="88" y="10" width="22" height="14" rx="2" />
          {range(5).map((i) => (
            <circle key={i} className={i === 1 ? "pa-call" : "pa-dot"} cx="24" cy={14 + i * 17.5} r="3" />
          ))}
        </Svg>
      );
    case "vending":
      return (
        <Svg>
          <rect className="pa-frame" x="38" y="4" width="84" height="88" rx="7" />
          <rect className="pa-line" x="45" y="11" width="50" height="56" rx="3" />
          {range(9).map((i) => (
            <rect key={i} className={i === 4 ? "pa-hot pa-drop" : "pa-block"} x={50 + (i % 3) * 15} y={15 + Math.floor(i / 3) * 17} width="10" height="12" rx="2" />
          ))}
          <rect className="pa-line" x="101" y="14" width="14" height="30" rx="2" />
          <line className="pa-line" x1="108" y1="20" x2="108" y2="30" />
          <circle className="pa-coin" cx="108" cy="25" r="5" />
          <rect className="pa-line" x="45" y="74" width="50" height="11" rx="2" />
        </Svg>
      );
    case "rides":
      return (
        <Svg>
          <rect className="pa-frame" x="6" y="6" width="148" height="84" rx="8" />
          {[44, 84, 124].map((x) => (
            <line key={x} className="pa-dash" x1={x} y1="8" x2={x} y2="88" />
          ))}
          {[34, 64].map((y) => (
            <line key={y} className="pa-dash" x1="8" y1={y} x2="152" y2={y} />
          ))}
          <circle className="pa-ring" cx="70" cy="40" r="10" />
          <line className="pa-match" x1="70" y1="40" x2="124" y2="64" />
          <circle className="pa-dot" cx="20" cy="34" r="4" />
          <circle className="pa-dot" cx="124" cy="16" r="4" />
          <circle className="pa-dot" cx="44" cy="82" r="4" />
          <circle className="pa-hot pa-driver" cx="124" cy="64" r="5" />
          <path className="pa-pin" d="M70 46c-5-6-8-9-8-13a8 8 0 0 1 16 0c0 4-3 7-8 13z" />
        </Svg>
      );
    case "payment":
      return (
        <Svg>
          {[8, 62, 116].map((x) => (
            <rect key={x} className="pa-line" x={x} y="26" width="36" height="28" rx="6" />
          ))}
          <rect className="pa-block" x="14" y="34" width="24" height="12" rx="2" />
          <line className="pa-dash" x1="44" y1="40" x2="62" y2="40" />
          <line className="pa-dash" x1="98" y1="40" x2="116" y2="40" />
          <circle className="pa-hot pa-pay-1" cx="44" cy="40" r="4" />
          <circle className="pa-coin pa-pay-2" cx="44" cy="40" r="4" />
          <rect className="pa-line" x="112" y="62" width="44" height="26" rx="4" />
          <line className="pa-ledger" x1="118" y1="70" x2="150" y2="70" />
          <line className="pa-ledger" x1="118" y1="80" x2="142" y2="80" />
          <path className="pa-check" d="M74 66l5 5 9-10" />
        </Svg>
      );
    case "leaderboard":
      return (
        <Svg>
          {[
            { y: 10, w: 116, c: "pa-block" },
            { y: 32, w: 96, c: "pa-block pa-rank-down" },
            { y: 54, w: 78, c: "pa-hot pa-rank-up" },
            { y: 76, w: 58, c: "pa-block" },
          ].map((b, i) => (
            <g key={i} className={b.c.split(" ")[1]}>
              <circle className="pa-line" cx="16" cy={b.y + 6} r="6" />
              <rect className={b.c.split(" ")[0]} x="28" y={b.y} width={b.w} height="12" rx="4" />
            </g>
          ))}
        </Svg>
      );
    case "pointers":
      return (
        <Svg>
          {range(7).map((i) => (
            <rect key={i} className={i === 2 || i === 4 ? "pa-cell pa-pair" : "pa-cell"} x={10 + i * 20.5} y="30" width="18" height="18" rx="4" />
          ))}
          <path className="pa-hot pa-left" d="M19 58l-6 9h12z" />
          <path className="pa-coin pa-right" d="M142 58l-6 9h12z" />
        </Svg>
      );
    case "window":
      return (
        <Svg>
          {range(8).map((i) => (
            <rect key={i} className="pa-cell" x={8 + i * 18.5} y="36" width="16" height="18" rx="3" />
          ))}
          <rect className="pa-win" x="5" y="31" width="58" height="28" rx="6" />
          <path className="pa-hot pa-win-r" d="M61 66l-5 8h10z" />
        </Svg>
      );
    case "halving":
      return (
        <Svg>
          {range(8).map((i) => (
            <rect key={i} className={i === 5 ? "pa-cell pa-target" : "pa-cell"} x={8 + i * 18.5} y="36" width="16" height="18" rx="3" />
          ))}
          <rect className="pa-range" x="5" y="31" width="150" height="28" rx="6" />
        </Svg>
      );
    case "bfs": {
      const nodes = [
        { x: 24, y: 48, r: 0 },
        { x: 62, y: 20, r: 1 },
        { x: 62, y: 48, r: 1 },
        { x: 62, y: 76, r: 1 },
        { x: 100, y: 12, r: 2 },
        { x: 100, y: 38, r: 2 },
        { x: 100, y: 62, r: 2 },
        { x: 100, y: 84, r: 2 },
        { x: 136, y: 30, r: 3 },
        { x: 136, y: 68, r: 3 },
      ];
      const edges = [
        [0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 5], [3, 6], [3, 7], [5, 8], [6, 9], [7, 9],
      ];
      return (
        <Svg>
          <circle className="pa-ring" cx="24" cy="48" r="10" />
          {edges.map(([a, b]) => (
            <line key={`${a}-${b}`} className="pa-line" x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
          ))}
          {nodes.map((n, i) => (
            <circle key={i} className="pa-node" cx={n.x} cy={n.y} r="6" style={v({ "--r": n.r })} />
          ))}
        </Svg>
      );
    }
    case "union":
      return (
        <Svg>
          <line className="pa-line" x1="38" y1="28" x2="20" y2="62" />
          <line className="pa-line" x1="38" y1="28" x2="54" y2="66" />
          <line className="pa-line" x1="20" y1="62" x2="30" y2="84" />
          <line className="pa-line" x1="122" y1="28" x2="106" y2="62" />
          <line className="pa-line" x1="122" y1="28" x2="140" y2="64" />
          <line className="pa-bridge" x1="38" y1="28" x2="122" y2="28" />
          {[
            [38, 28],
            [20, 62],
            [54, 66],
            [30, 84],
          ].map(([x, y]) => (
            <circle key={`l${x}`} className="pa-hot" cx={x} cy={y} r="7" />
          ))}
          {[
            [122, 28],
            [106, 62],
            [140, 64],
          ].map(([x, y]) => (
            <circle key={`r${x}`} className="pa-merge" cx={x} cy={y} r="7" />
          ))}
        </Svg>
      );
    case "grid":
      return (
        <Svg>
          {range(24).map((k) => {
            const i = k % 6;
            const j = Math.floor(k / 6);
            return <rect key={k} className={k === 23 ? "pa-cell pa-fill pa-corner" : "pa-cell pa-fill"} x={22 + i * 20} y={8 + j * 20} width="17" height="17" rx="3" style={v({ "--d": i + j })} />;
          })}
        </Svg>
      );
  }
}

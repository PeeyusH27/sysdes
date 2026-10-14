import Link from "next/link";
import { ArrowRight, BookA, BookOpen, FileQuestion, Gauge, Hammer, Library } from "lucide-react";
import { deepDives, getDeepDive, getLearnStep, getQuestion, learnSteps, questions } from "@content/registry";
import { glossary } from "@content/glossary";
import { questionLabel, requestJourney } from "@content/home";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { CapacityCalculator } from "@/components/widgets/CapacityCalculator";
import { shorts } from "@content/shorts";
import { HubTabs, ShortsStrip } from "@/components/content/HubBits";
import { NextUp } from "../home-client";

export const metadata = {
  title: "System design track",
  description: "A 10-step HLD path, deep dives, interview questions with JavaScript answers, and a drag-and-drop playground that grades your designs.",
  alternates: { canonical: "/system-design" },
};

/** Curated routes for people who only have a week. Titles come from the registry so renames carry through. */
const FOCUS: { label: "Frontend" | "Backend" | "Full-stack"; blurb: string; links: string[] }[] = [
  { label: "Frontend", blurb: "Latency you can feel in the UI.", links: ["/learn/requirements-estimation", "/learn/api-load-balancing", "/learn/caching", "/questions/typeahead", "/questions/infinite-feed", "/deep-dives/polling-sse-websockets"] },
  { label: "Backend", blurb: "Correctness under load.", links: ["/learn/databases-scaling", "/questions/rate-limiter", "/questions/movie-booking", "/questions/parking-lot", "/questions/payment-system", "/deep-dives/sharding-strategies"] },
  { label: "Full-stack", blurb: "One feature, browser to database.", links: ["/learn/async-messaging", "/questions/chat", "/questions/news-feed", "/questions/ride-sharing", "/deep-dives/request-flows", "/playground"] },
];

function titleOf(href: string) {
  const [, section, slug] = href.split("/");
  if (section === "learn") return getLearnStep(slug)?.title;
  if (section === "deep-dives") return getDeepDive(slug)?.title.split(":")[0];
  if (section === "questions") {
    const q = getQuestion(slug);
    return q && questionLabel(q.title);
  }
  if (href === "/playground") return "Build it in the playground";
  return undefined;
}

export default function SystemDesignHome() {
  const entries = [
    { href: "/learn", Icon: BookOpen, title: "HLD path", count: `${learnSteps.length} steps`, text: "Estimation, load balancing, data, caching, queues, consistency, reliability, then two case studies." },
    { href: "/deep-dives", Icon: Library, title: "Deep dives", count: `${deepDives.length} techniques`, text: "Caching, sharding, storage, real-time, connections and request flows, one at a time." },
    { href: "/questions", Icon: FileQuestion, title: "Interview questions", count: `${questions.length} questions`, text: "From a parking lot to Uber. Full answers with code, failure modes and follow-ups." },
    { href: "/playground", Icon: Hammer, title: "Playground", count: "Graded", text: "Drag components onto a canvas, wire them up, simulate traffic and get a score." },
    { href: "/cheatsheet", Icon: Gauge, title: "Cheatsheet", count: "Numbers", text: "Latencies, sizes and formulas to have at your fingertips." },
    { href: "/glossary", Icon: BookA, title: "Glossary", count: `${glossary.length} terms`, text: "Every term on the site, one line each." },
  ];
  return (
    <div className="container hub" data-track="sd">
      <section className="hub-hero">
        <div>
          <p className="eyebrow">System design track</p>
          <h1>
            Boxes and arrows, <span className="grad">but they move.</span>
          </h1>
          <p className="lede">
            Watch requests travel, caches miss and queues back up. Then design it yourself and defend every box in the interview.
          </p>
          <div className="hero-cta">
            <Link href="/learn" className="btn btn-primary">
              Start the HLD path <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/playground" className="btn">
              Open the playground
            </Link>
          </div>
        </div>
        <div className="hub-visual">
          <FlowDiagram spec={requestJourney} autoplay loop compact />
        </div>
      </section>

      <HubTabs track="sd" />

      <ul className="entry-grid">
        {entries.map(({ href, Icon, title, count, text }) => (
          <li key={href}>
            <Link href={href} className="card card-link entry">
              <span className="entry-icon">
                <Icon size={20} aria-hidden />
              </span>
              <span className="entry-count">{count}</span>
              <h2 className="entry-title">{title}</h2>
              <p>{text}</p>
            </Link>
          </li>
        ))}
      </ul>

      <NextUp variant="sd" shortsCount={shorts.length} />

      <ShortsStrip
        count={shorts.filter((s) => s.track === "Building blocks").length}
        label="building blocks: Bloom filters, HyperLogLog, gossip, Raft, LSM trees, sagas, OAuth and more"
        href={`/shorts?s=${shorts.find((s) => s.track === "Building blocks")?.id ?? ""}`}
      />

      <h2 className="section-title">Got a week? Pick a focus</h2>
      <div className="focus-grid">
        {FOCUS.map((f) => (
          <div key={f.label} className="card focus">
            <span className={`badge badge-${f.label}`}>{f.label}</span>
            <p className="focus-blurb">{f.blurb}</p>
            <ol>
              {f.links.map((href) => {
                const title = titleOf(href);
                return title ? (
                  <li key={href}>
                    <Link href={href}>{title}</Link>
                  </li>
                ) : null;
              })}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="section-title">Try it: how many servers does your app need?</h2>
      <CapacityCalculator compact />
    </div>
  );
}

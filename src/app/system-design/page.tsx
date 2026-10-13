import Link from "next/link";
import { ArrowRight, BookOpen, FileQuestion, Hammer, Library } from "lucide-react";
import { deepDives, learnSteps, questions } from "@content/registry";
import { requestJourney } from "@content/home";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { CapacityCalculator } from "@/components/widgets/CapacityCalculator";
import { shorts } from "@content/shorts";
import { ShortsStrip } from "@/components/content/HubBits";
import { ContinueLearning } from "../home-client";

export const metadata = {
  title: "System design track",
  description: "A 10-step HLD path, deep dives, interview questions with JavaScript answers, and a drag-and-drop playground that grades your designs.",
  alternates: { canonical: "/system-design" },
};

export default function SystemDesignHome() {
  return (
    <div className="container">
      <section className="hero">
        <div>
          <span className="eyebrow">System design track · from scratch to interview-ready</span>
          <h1>
            Learn system design, <span className="grad">then practise it.</span>
          </h1>
          <p>
            A step-by-step HLD path with animated diagrams you can play and pause, interactive simulators, detailed interview answers in
            JavaScript, and a drag-and-drop playground that grades your designs.
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
        <div className="hero-visual">
          <FlowDiagram spec={requestJourney} autoplay loop compact />
        </div>
      </section>

      <div className="entry-cards">
        <Link href="/learn" className="card card-link">
          <span className="icon"><BookOpen size={20} aria-hidden /></span>
          <h3>HLD path</h3>
          <p>{learnSteps.length} steps from estimation to case studies, each with diagrams, widgets, code and a quiz.</p>
        </Link>
        <Link href="/deep-dives" className="card card-link">
          <span className="icon"><Library size={20} aria-hidden /></span>
          <h3>Deep dives</h3>
          <p>{deepDives.length} techniques that come up again and again: caching, sharding, storage, real-time, connections, request flows.</p>
        </Link>
        <Link href="/questions" className="card card-link">
          <span className="icon"><FileQuestion size={20} aria-hidden /></span>
          <h3>Interview questions</h3>
          <p>{questions.length} famous frontend, backend and full-stack questions with step-by-step answers and full JavaScript code.</p>
        </Link>
        <Link href="/playground" className="card card-link">
          <span className="icon"><Hammer size={20} aria-hidden /></span>
          <h3>Playground</h3>
          <p>Drag components onto a canvas, connect them, simulate traffic, and get graded on challenges.</p>
        </Link>
      </div>

      <ShortsStrip
        count={shorts.filter((s) => s.track === "Building blocks").length}
        label="building blocks: Bloom filters, HyperLogLog, gossip, Raft, LSM trees, sagas, OAuth and more"
        href={`/shorts?s=${shorts.find((s) => s.track === "Building blocks")?.id ?? ""}`}
      />

      <ContinueLearning />

      <h2 className="section-title">Pick a focus</h2>
      <div className="tracks">
        <div className="card">
          <span className="badge badge-Frontend">Frontend</span>
          <ol>
            <li><Link href="/learn/requirements-estimation">Requirements and estimation</Link></li>
            <li><Link href="/learn/api-load-balancing">APIs and load balancing</Link></li>
            <li><Link href="/learn/caching">Caching (incl. HTTP caching)</Link></li>
            <li><Link href="/questions/typeahead">Typeahead</Link> and <Link href="/questions/infinite-feed">infinite feed</Link></li>
            <li><Link href="/deep-dives/polling-sse-websockets">Polling, SSE and WebSockets</Link></li>
          </ol>
        </div>
        <div className="card">
          <span className="badge badge-Backend">Backend</span>
          <ol>
            <li><Link href="/learn/requirements-estimation">HLD path steps 1–7</Link></li>
            <li><Link href="/questions/rate-limiter">Rate limiter</Link></li>
            <li><Link href="/questions/movie-booking">Ticket booking</Link></li>
            <li><Link href="/questions/parking-lot">Parking lot</Link>, <Link href="/questions/elevator">elevator</Link> and <Link href="/questions/vending-machine">vending machine</Link> (LLD)</li>
            <li><Link href="/questions/leaderboard">Leaderboard</Link> and <Link href="/questions/payment-system">payment system</Link></li>
            <li><Link href="/deep-dives/sharding-strategies">Sharding</Link> and <Link href="/deep-dives/connections-pooling">connections</Link></li>
          </ol>
        </div>
        <div className="card">
          <span className="badge badge-Full-stack">Full-stack</span>
          <ol>
            <li><Link href="/learn/requirements-estimation">HLD path steps 1–5</Link></li>
            <li><Link href="/questions/chat">Real-time chat</Link></li>
            <li><Link href="/questions/news-feed">News feed</Link> and <Link href="/questions/ride-sharing">Uber ride matching</Link></li>
            <li><Link href="/deep-dives/request-flows">Request flows end to end</Link></li>
            <li><Link href="/playground">Build it in the playground</Link></li>
          </ol>
        </div>
      </div>

      <h2 className="section-title">Try it: how many servers does your app need?</h2>
      <CapacityCalculator compact />
    </div>
  );
}

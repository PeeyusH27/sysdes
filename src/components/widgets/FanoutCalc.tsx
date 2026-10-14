"use client";
import { useDeferredValue, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, GitMerge } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { bytes, compact, int } from "@/lib/format";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

/** One feed entry in a Redis sorted set: 8-byte post id + 8-byte score + skiplist/hash overhead. */
export const ENTRY_BYTES = 64;
/** Above this many followers, skip fan-out and merge the author's posts at read time. */
export const CELEBRITY_THRESHOLD = 100_000;
/** How fresh a feed should feel. */
export const FRESH_SECONDS = 5;
/** Assumed feed opens per follower per day, for the pull side's read cost. */
export const FEED_OPENS_PER_DAY = 10;

export interface FanoutInputs {
  followers: number;
  postsPerDay: number;
  /** fan-out workers' combined feed writes per second */
  throughput: number;
}

export type Strategy = "push" | "push-queued" | "pull";

export function fanout({ followers, postsPerDay, throughput }: FanoutInputs) {
  const writesPerPost = followers;
  const deliverSeconds = followers / throughput;
  const writesPerDay = followers * postsPerDay;
  const memoryPerPost = followers * ENTRY_BYTES;
  const memoryPerDay = writesPerDay * ENTRY_BYTES;
  /** With pull, every follower's feed open also reads this author's timeline. */
  const pullReadsPerSec = (followers * FEED_OPENS_PER_DAY) / 86_400;
  const share = (writesPerDay / 86_400 / throughput) * 100; // % of the fan-out fleet this author alone keeps busy
  let strategy: Strategy;
  if (followers >= CELEBRITY_THRESHOLD || deliverSeconds > 60) strategy = "pull";
  else if (deliverSeconds > FRESH_SECONDS) strategy = "push-queued";
  else strategy = "push";
  return { writesPerPost, deliverSeconds, writesPerDay, memoryPerPost, memoryPerDay, pullReadsPerSec, share, strategy };
}

/** Human time: 0.4 ms, 12 ms, 3.2 s, 4.1 min, 2.3 h. */
export function humanTime(seconds: number) {
  if (seconds < 1) return `${+(seconds * 1000).toPrecision(seconds < 0.01 ? 2 : 3)} ms`;
  if (seconds < 120) return `${+seconds.toPrecision(3)} s`;
  if (seconds < 7_200) return `${+(seconds / 60).toPrecision(3)} min`;
  return `${+(seconds / 3600).toPrecision(3)} h`;
}

/** 0-based linear axis ending on a 1 / 2 / 2.5 / 5 step, in 6 points (so every tick is round). */
export function followerAxis(followers: number) {
  const target = Math.max(10, followers * 1.25);
  const mag = 10 ** Math.floor(Math.log10(target));
  const top = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v >= target)!;
  return Array.from({ length: 6 }, (_, i) => (top / 5) * i);
}

/* ------------------------------------------------------------------ view */

/** Slider position → a follower count rounded to 2 significant figures. */
const fromExp = (e: number) => Math.min(50_000_000, Number((10 ** e).toPrecision(2)));
const MAX_EXP = Math.log10(50_000_000);

/** Compact results (four across in the desktop pane, two on a phone) and a flatter chart inside the widget. */
const CSS = `
.fan-results { container-type: inline-size; }
.fan-results .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.fan-results .stat-tile { padding: 6px 10px; border-radius: 10px; min-width: 0; }
.fan-results .stat-label { font-size: 12px; line-height: 1.3; }
.fan-results .stat-value { font-size: 17px; line-height: 1.3; }
.fan-results .stat-sub { font-size: 11.5px; line-height: 1.3; }
@container (max-width: 520px) { .fan-results .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.fan-verdict { border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; background: var(--card-2); margin-top: 8px; }
.fan-verdict p { margin: 0; }
.fan-verdict p:first-child { font-weight: 650; margin-bottom: 2px; }
.fan-verdict p:first-child svg { display: inline; vertical-align: -2px; margin-right: 4px; }
.fan-chart .chart { margin: 8px 0 0; padding: 0; border: 0; background: none; }
.fan-chart .chart-title { font-size: 13px; line-height: 1.35; margin-bottom: 2px; }
.fan-chart .chart-table { margin-top: 2px; }
`;

const VERDICT: Record<Strategy, { title: string; icon: typeof GitMerge; cls: string }> = {
  push: { title: "Push (fan-out on write)", icon: ArrowUpFromLine, cls: "ok-ink" },
  "push-queued": { title: "Push, through a queue", icon: ArrowUpFromLine, cls: "warn-ink" },
  pull: { title: "Pull for this author (hybrid feed)", icon: GitMerge, cls: "bad-ink" },
};

export function FanoutCalc() {
  const [exp, setExp] = useState(Math.log10(2_000));
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [tExp, setTExp] = useState(Math.log10(50_000));
  const followers = fromExp(exp);
  const throughput = Number((10 ** tExp).toPrecision(2));
  const r = fanout({ followers, postsPerDay, throughput });

  const deferred = useDeferredValue({ followers, throughput });
  const xs = followerAxis(deferred.followers);
  const secs = xs.map((f) => f / deferred.throughput);
  const unit = secs.at(-1)! < 1 ? "ms" : secs.at(-1)! < 600 ? "s" : "min";
  const scale = unit === "ms" ? 1000 : unit === "s" ? 1 : 1 / 60;

  const v = VERDICT[r.strategy];
  const Icon = v.icon;
  const reason =
    r.strategy === "pull"
      ? `${compact(r.writesPerPost)} feed writes per post, ${humanTime(r.deliverSeconds)} until the last follower has it, and ${postsPerDay} posts/day eat ${r.share >= 1 ? `${r.share.toFixed(0)}%` : "a noticeable share"} of the fan-out fleet. Store the post once and merge it into feeds when they're opened: about ${int(r.pullReadsPerSec)} extra timeline reads/s, served from cache. Normal accounts keep push.`
      : r.strategy === "push-queued"
        ? `${compact(r.writesPerPost)} writes per post still fits, but delivery takes ${humanTime(r.deliverSeconds)}: publish once to a queue and let workers write the feeds in batches. Followers see the post over a few seconds, which is usually fine.`
        : `${compact(r.writesPerPost)} feed writes per post finish in ${humanTime(r.deliverSeconds)}. Every follower then reads one precomputed list: the cheapest read path there is.`;

  return (
    <WidgetFrame title="Fan-out calculator" sub="Push copies a post into every feed; pull builds feeds on read.">
      <style href="w-fanout-calc" precedence="widgets">
        {CSS}
      </style>
      <div className="controls">
        <Slider label="Followers" value={exp} min={1} max={MAX_EXP} step={0.02} onChange={setExp} format={() => compact(followers)} valueText={`${int(followers)} followers`} />
        <Slider label="Posts per day" value={postsPerDay} min={1} max={50} onChange={setPostsPerDay} valueText={`${postsPerDay} posts per day from this author`} />
        <Slider label="Fan-out throughput" value={tExp} min={3} max={6} step={0.05} onChange={setTExp} format={() => `${compact(throughput)}/s`} valueText={`${int(throughput)} feed writes per second`} />
      </div>
      <div className="fan-results">
        <StatTiles
          items={[
            { label: "Writes per post", value: compact(r.writesPerPost), sub: "one per follower" },
            { label: "Reach everyone", value: humanTime(r.deliverSeconds), sub: `at ${compact(throughput)} writes/s` },
            { label: "Feed memory", value: `${bytes(r.memoryPerDay)}/day`, sub: `${bytes(r.memoryPerPost)} per post` },
            { label: "Writes per day", value: compact(r.writesPerDay), sub: `${r.writesPerDay < 86_400 ? "< 1" : int(r.writesPerDay / 86_400)}/s on average` },
          ]}
        />
      </div>
      <div className="readout fan-verdict" aria-live="polite">
        <p>
          <Icon size={16} aria-hidden className={v.cls} /> <span className="sr-only">Recommendation: </span>
          <span className={v.cls}>{v.title}</span>
        </p>
        <p>{reason}</p>
      </div>
      <div className="fan-chart">
        <LineChart
          title="Push: time to reach every follower"
          x={xs}
          series={[{ id: "push", name: "Push delivery time", values: secs.map((s) => s * scale) }]}
          xLabel="Followers"
          yUnit={unit}
          xFormat="number"
          marker={deferred.followers}
          height={140}
          area
        />
      </div>
      <More label="Rule of thumb and assumptions">
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0, display: "flex", gap: 6, alignItems: "baseline" }}>
          <ArrowDownToLine size={13} aria-hidden style={{ flex: "none", position: "relative", top: 2 }} />
          Push for accounts under ~{compact(CELEBRITY_THRESHOLD)} followers, pull (merge at read time) above it. The line is straight: delivery time grows with every follower you add. Each feed entry costs ~{ENTRY_BYTES} B in the cache (post id, score and
          sorted-set overhead); the pull side assumes {FEED_OPENS_PER_DAY} feed opens per follower per day; a feed should feel fresh within {FRESH_SECONDS} s.
        </p>
      </More>
    </WidgetFrame>
  );
}

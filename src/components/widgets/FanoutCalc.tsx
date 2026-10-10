"use client";
import { useDeferredValue, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, GitMerge } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { bytes, compact, int } from "@/lib/format";
import { Slider, WidgetFrame } from "./WidgetFrame";

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
      ? `${compact(followers)} followers means ${compact(r.writesPerPost)} feed writes for every post and ${humanTime(r.deliverSeconds)} before the last follower has it, and ${postsPerDay} posts/day take ${r.share >= 1 ? `${r.share.toFixed(0)}%` : "a noticeable share"} of the whole fan-out fleet. Store the post once in the author's timeline and merge it into followers' feeds when they open them: about ${int(r.pullReadsPerSec)} extra timeline reads/s, served from cache. Normal accounts keep push.`
      : r.strategy === "push-queued"
        ? `${compact(r.writesPerPost)} writes per post still fits, but delivery takes ${humanTime(r.deliverSeconds)}, so publish once to a queue and let workers write the feeds in batches. The post shows up for followers over a few seconds, which is usually fine.`
        : `${compact(r.writesPerPost)} feed writes per post finish in ${humanTime(r.deliverSeconds)}. Every follower then reads one precomputed list: the cheapest read path there is.`;

  return (
    <WidgetFrame title="Fan-out calculator" sub="Push copies each post into every follower's feed when it's written; pull assembles feeds when they're read. Followers decide which one hurts.">
      <div className="controls">
        <Slider label="Followers" value={exp} min={1} max={MAX_EXP} step={0.02} onChange={setExp} format={() => compact(followers)} valueText={`${int(followers)} followers`} />
        <Slider label="Posts per day (this author)" value={postsPerDay} min={1} max={50} onChange={setPostsPerDay} />
        <Slider label="Fan-out throughput" value={tExp} min={3} max={6} step={0.05} onChange={setTExp} format={() => `${compact(throughput)} writes/s`} valueText={`${int(throughput)} writes per second`} />
      </div>
      <StatTiles
        items={[
          { label: "Writes per post", value: compact(r.writesPerPost), sub: "one feed insert per follower" },
          { label: "Time to reach everyone", value: humanTime(r.deliverSeconds), sub: `at ${compact(throughput)} writes/s` },
          { label: "Feed-cache memory", value: `${bytes(r.memoryPerDay)}/day`, sub: `${bytes(r.memoryPerPost)} per post at ~${ENTRY_BYTES} B per entry` },
          { label: "Fan-out writes per day", value: compact(r.writesPerDay), sub: `${int(r.writesPerDay / 86_400)}/s on average` },
        ]}
      />
      <div className="readout" aria-live="polite" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--card-2)" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontWeight: 650 }}>
          <Icon size={16} aria-hidden className={v.cls} /> Recommendation: <span className={v.cls}>{v.title}</span>
        </p>
        <p style={{ margin: "4px 0 0" }}>{reason}</p>
      </div>
      <LineChart
        title="Time for one post to reach every follower (push)"
        x={xs}
        series={[{ id: "push", name: "Push delivery time", values: secs.map((s) => s * scale) }]}
        xLabel="Followers"
        yUnit={unit}
        xFormat="number"
        marker={deferred.followers}
        height={220}
        area
      />
      <p className="muted" style={{ fontSize: 13, margin: "-8px 0 0", display: "flex", gap: 6, alignItems: "baseline" }}>
        <ArrowDownToLine size={13} aria-hidden style={{ flex: "none", position: "relative", top: 2 }} />
        Rule of thumb: push for accounts under ~{compact(CELEBRITY_THRESHOLD)} followers, pull (merge at read time) above it. The line is straight: delivery time grows with every follower you add.
      </p>
    </WidgetFrame>
  );
}

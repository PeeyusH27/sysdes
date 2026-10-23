"use client";
import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const CAPACITY = 3;
export const KEYS = ["A", "B", "C", "D", "E"] as const;
export const MAX_REQUESTS = 14;

export interface Outcome {
  hit: boolean;
  /** The key thrown out to make room, if any. */
  evicted: string | null;
}

/** LRU state: keys in order of use, the next one to evict first. */
export function lruAccess(order: string[], key: string, cap = CAPACITY): { order: string[]; out: Outcome } {
  const i = order.indexOf(key);
  if (i >= 0) return { order: [...order.slice(0, i), ...order.slice(i + 1), key], out: { hit: true, evicted: null } };
  const evicted = order.length >= cap ? order[0] : null;
  return { order: [...(evicted === null ? order : order.slice(1)), key], out: { hit: false, evicted } };
}

/** LFU state: a use count per key, and one bucket of keys per count (oldest use first), as in the pattern's template. */
export interface LfuState {
  counts: Record<string, number>;
  buckets: Record<number, string[]>;
  minCount: number;
}
export const emptyLfu = (): LfuState => ({ counts: {}, buckets: {}, minCount: 0 });

export function lfuAccess(s: LfuState, key: string, cap = CAPACITY): { state: LfuState; out: Outcome } {
  const counts = { ...s.counts };
  const buckets: Record<number, string[]> = {};
  for (const [c, keys] of Object.entries(s.buckets)) buckets[Number(c)] = [...keys];
  let minCount = s.minCount;
  if (key in counts) {
    const c = counts[key];
    buckets[c] = buckets[c].filter((k) => k !== key);
    if (buckets[c].length === 0) {
      delete buckets[c];
      if (minCount === c) minCount = c + 1;
    }
    counts[key] = c + 1;
    (buckets[c + 1] ??= []).push(key);
    return { state: { counts, buckets, minCount }, out: { hit: true, evicted: null } };
  }
  let evicted: string | null = null;
  if (Object.keys(counts).length >= cap) {
    evicted = buckets[minCount][0];
    buckets[minCount] = buckets[minCount].slice(1);
    if (buckets[minCount].length === 0) delete buckets[minCount];
    delete counts[evicted];
  }
  counts[key] = 1;
  (buckets[1] ??= []).push(key);
  return { state: { counts, buckets, minCount: 1 }, out: { hit: false, evicted } };
}

/** The keys of an LFU cache in eviction order: fewest uses first, oldest first among ties. */
export function lfuOrder(s: LfuState): string[] {
  return Object.keys(s.buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((c) => s.buckets[c]);
}

export interface Step {
  key: string;
  lru: { order: string[]; out: Outcome; hits: number };
  lfu: { state: LfuState; out: Outcome; hits: number; before: Record<string, number> };
}

export function simulate(requests: string[], cap = CAPACITY): Step[] {
  const steps: Step[] = [];
  let order: string[] = [];
  let lfu = emptyLfu();
  let lruHits = 0;
  let lfuHits = 0;
  for (const key of requests) {
    const a = lruAccess(order, key, cap);
    const before = lfu.counts;
    const b = lfuAccess(lfu, key, cap);
    order = a.order;
    lfu = b.state;
    lruHits += a.out.hit ? 1 : 0;
    lfuHits += b.out.hit ? 1 : 0;
    steps.push({ key, lru: { order, out: a.out, hits: lruHits }, lfu: { state: lfu, out: b.out, hits: lfuHits, before } });
  }
  return steps;
}

/** Reference: no clever structure, just a last-use time and a count per cached key, and a scan for the loser. */
export function bruteCache(requests: string[], policy: "lru" | "lfu", cap = CAPACITY) {
  const cached: { key: string; count: number; last: number }[] = [];
  const outcomes: Outcome[] = [];
  const contents: string[][] = [];
  requests.forEach((key, t) => {
    const e = cached.find((x) => x.key === key);
    if (e) {
      e.count++;
      e.last = t;
      outcomes.push({ hit: true, evicted: null });
    } else {
      let evicted: string | null = null;
      if (cached.length >= cap) {
        let loser = cached[0];
        for (const x of cached) {
          const worse = policy === "lru" ? x.last < loser.last : x.count < loser.count || (x.count === loser.count && x.last < loser.last);
          if (worse) loser = x;
        }
        evicted = loser.key;
        cached.splice(cached.indexOf(loser), 1);
      }
      cached.push({ key, count: 1, last: t });
      outcomes.push({ hit: false, evicted });
    }
    contents.push(cached.map((x) => x.key).sort());
  });
  return { outcomes, contents };
}

export const SAMPLES = {
  scan: { label: "Popular key, then a scan", requests: ["A", "A", "A", "B", "C", "D", "E", "A"] },
  cold: { label: "Old favourite goes cold", requests: ["A", "A", "A", "A", "B", "C", "D", "B", "C", "D", "B", "C", "D"] },
} as const;
type SampleId = keyof typeof SAMPLES;

// ---------------------------------------------------------------- picture
const W = 340;
const H = 252;
const CARD_W = 100;
const CARD_H = 38;
const GAP = 8;
const STEP_MS = 900;

interface Sim {
  pos: number;
  total: number;
  acc: number;
}
const stepSim = (s: Sim, dt: number): Sim => {
  if (s.pos >= s.total) return s;
  const acc = s.acc + dt;
  return acc >= STEP_MS ? { ...s, pos: s.pos + 1, acc: 0 } : { ...s, acc };
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function describe(steps: Step[], pos: number) {
  if (pos === 0) return `Both caches hold ${CAPACITY} entries. Request a key and watch which entry each policy throws out.`;
  const s = steps[pos - 1];
  const lru = s.lru.out.hit ? "LRU: hit." : s.lru.out.evicted ? `LRU: miss, evicts ${s.lru.out.evicted}, the one used longest ago.` : "LRU: miss, room to add.";
  const e = s.lfu.out.evicted;
  const lfu = s.lfu.out.hit ? "LFU: hit." : e ? `LFU: miss, evicts ${e} (${plural(s.lfu.before[e] ?? 0, "use")}, the fewest).` : "LFU: miss, room to add.";
  return `Request ${s.key}. ${lru} ${lfu}`;
}

export function DesignLab() {
  const [requests, setRequests] = useState<string[]>([...SAMPLES.scan.requests]);
  const [sample, setSample] = useState<SampleId | "mine">("scan");
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const steps = useMemo(() => simulate(requests), [requests]);
  const [sim, reset] = useFixedStep<Sim>({ pos: 0, total: SAMPLES.scan.requests.length, acc: 0 }, stepSim, running && inView && !reduce);
  const pos = Math.min(sim.pos, requests.length);
  const done = pos >= requests.length;
  const said = useThrottled(describe(steps, pos), 400);

  const load = (id: SampleId) => {
    setSample(id);
    setRequests([...SAMPLES[id].requests]);
    reset({ pos: 0, total: SAMPLES[id].requests.length, acc: 0 });
    setRunning(true);
  };
  const request = (key: string) => {
    const base = sample === "mine" ? requests : [];
    const next = [...base, key].slice(0, MAX_REQUESTS);
    setSample("mine");
    setRequests(next);
    reset({ pos: next.length, total: next.length, acc: 0 });
    setRunning(false);
  };
  const clear = () => {
    setSample("mine");
    setRequests([]);
    reset({ pos: 0, total: 0, acc: 0 });
    setRunning(false);
  };

  const cur = pos > 0 ? steps[pos - 1] : null;
  const lruOrder = cur ? cur.lru.order : [];
  const lfuKeys = cur ? lfuOrder(cur.lfu.state) : [];
  const lfuCounts = cur ? cur.lfu.state.counts : {};

  const row = (i: number, title: string, hint: string, keys: string[], badge: (k: string) => string | null, out: Outcome | null, hits: number, misses: number) => {
    const y = 8 + i * 100;
    const status = !out ? "" : out.hit ? "✓ hit" : out.evicted ? `✕ miss, ${out.evicted} evicted` : "miss, added";
    return (
      <g key={title}>
        <text x={10} y={y + 11} style={{ fontSize: 12.5, fontWeight: 750 }}>
          {title}
        </text>
        <text x={W - 10} y={y + 11} textAnchor="end" className="muted-text" style={{ fontSize: 11.5 }}>
          hits {hits} · misses {misses}
        </text>
        {Array.from({ length: CAPACITY }, (_, k) => {
          const x = 10 + k * (CARD_W + GAP);
          const key = keys[k];
          const fresh = key !== undefined && cur?.key === key;
          return key === undefined ? (
            <rect key={k} x={x} y={y + 18} width={CARD_W} height={CARD_H} rx={9} fill="none" stroke="var(--border-strong)" strokeDasharray="4 4" />
          ) : (
            <g key={k}>
              <rect x={x} y={y + 18} width={CARD_W} height={CARD_H} rx={9} fill={fresh ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--card)"} stroke={fresh ? "var(--accent)" : "var(--border-strong)"} strokeWidth={fresh ? 2.2 : 1.3} />
              <text x={x + CARD_W / 2} y={y + 43} textAnchor="middle" style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                {key}
              </text>
              {badge(key) && (
                <text x={x + CARD_W - 8} y={y + 33} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>
                  {badge(key)}
                </text>
              )}
              {k === 0 && keys.length === CAPACITY && (
                <text x={x + 8} y={y + 33} style={{ fontSize: 10, fontWeight: 700, fill: "var(--critical-ink)" }}>
                  next out
                </text>
              )}
            </g>
          );
        })}
        <text x={10} y={y + 72} className="muted-text" style={{ fontSize: 11 }}>
          {hint}
        </text>
        <text x={W - 10} y={y + 72} textAnchor="end" style={{ fontSize: 12, fontWeight: 750, fill: out?.hit ? "var(--good-ink)" : out?.evicted ? "var(--critical-ink)" : "var(--muted)" }}>
          {status}
        </text>
      </g>
    );
  };

  const shown = requests.slice(0, pos).slice(-12);
  const lruHits = cur?.lru.hits ?? 0;
  const lfuHits = cur?.lfu.hits ?? 0;
  const label = `Two caches of ${CAPACITY} entries fed the same requests ${shown.join(" ") || "(none yet)"}. LRU holds ${lruOrder.join(", ") || "nothing"} with ${lruHits} hits. LFU holds ${lfuKeys.join(", ") || "nothing"} with ${lfuHits} hits.`;

  return (
    <WidgetFrame title="Cache duel" sub="The same requests, two eviction rules. Tap a key to request it.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Seg<SampleId>
          labelMode="hidden"
          compact
          label="Sample requests"
          value={(sample === "mine" ? "scan" : sample) as SampleId}
          onChange={load}
          options={[
            { value: "scan", label: "Popular + scan" },
            { value: "cold", label: "Old favourite" },
          ]}
        />
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (done) load(sample === "cold" ? "cold" : "scan");
            else setRunning((r) => !r);
          }}
          onStep={() => reset({ pos: Math.min(pos + 1, requests.length), total: requests.length, acc: 0 })}
          stepHint="Process the next request"
          onReset={() => reset({ pos: 0, total: requests.length, acc: 0 })}
        />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <div role="group" aria-label="Request a key" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {KEYS.map((k) => (
            <button key={k} type="button" className="wbtn" style={{ minWidth: 38, justifyContent: "center", fontFamily: "var(--font-mono)" }} onClick={() => request(k)} aria-label={`Request ${k}`} disabled={sample === "mine" && requests.length >= MAX_REQUESTS}>
              {k}
            </button>
          ))}
          <button type="button" className="wbtn" onClick={clear} aria-label="Clear all requests" title="Clear all requests">
            <Eraser size={14} aria-hidden /> Clear
          </button>
        </div>
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: 520, margin: "0 auto" }}>
          {row(0, "LRU: drop the longest unused", "oldest use on the left", lruOrder, () => null, cur?.lru.out ?? null, lruHits, pos - lruHits)}
          {row(1, "LFU: drop the fewest uses", "fewest uses on the left, oldest first", lfuKeys, (k) => `×${lfuCounts[k]}`, cur?.lfu.out ?? null, lfuHits, pos - lfuHits)}
          <text x={10} y={236} className="muted-text" style={{ fontSize: 11.5 }}>
            requests:{" "}
            <tspan style={{ fill: "var(--fg)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{shown.join(" ") || "none yet"}</tspan>
          </text>
        </svg>
      </div>

      <p className="readout" aria-live="polite">
        {said}
        {done && pos > 0 && lruHits !== lfuHits ? ` After ${plural(pos, "request")}: ${lruHits > lfuHits ? "LRU" : "LFU"} wins, ${Math.max(lruHits, lfuHits)} hits to ${Math.min(lruHits, lfuHits)}.` : ""}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step." />
      </p>
      <More label="What to try">
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          Run <b>Popular + scan</b>: LFU keeps A because it has the most uses, while LRU loses it to a stream of one-off keys. Then run <b>Old favourite</b>: A stops being asked for, but LFU still guards it with its high count and keeps missing on B, C and D, while LRU adapts at once.
        </p>
      </More>
    </WidgetFrame>
  );
}

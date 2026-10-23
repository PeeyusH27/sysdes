import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// One small inline picture: a queue absorbing an ingest burst.
const burst: FlowSpec = {
  id: "story-metrics-burst",
  title: "A queue absorbs the burst",
  description: "After an outage every agent sends its buffer at once. Kafka holds the burst while writers catch up.",
  nodes: [
    { id: "agents", label: "Host agents", kind: "client", col: 0, row: 1, sub: "100K hosts" },
    { id: "queue", label: "Kafka", kind: "queue", col: 1, row: 1 },
    { id: "writers", label: "Writers", kind: "worker", col: 2, row: 1 },
    { id: "db", label: "Time-series DB", kind: "database", col: 3, row: 1 },
  ],
  edges: [
    { from: "agents", to: "queue", label: "batches" },
    { from: "queue", to: "writers" },
    { from: "writers", to: "db", label: "append" },
  ],
  scenarios: [
    {
      id: "burst",
      name: "Burst",
      steps: [
        { edge: "agents>queue", tone: "miss", caption: "The network returns. Everyone sends at once.", mark: [{ node: "queue", state: "busy" }] },
        { edge: "queue>writers", caption: "Writers read at their own pace. Nothing is dropped.", mark: [{ node: "writers", state: "busy" }] },
        { edge: "writers>db", tone: "ok", caption: "The lag drains in minutes. Dashboards were briefly behind.", mark: [{ node: "queue", state: null }, { node: "writers", state: null }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A flood of tiny numbers",
      line: "Every host reports many metrics, all the time.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Samples a second", value: "1,000,000" },
          { label: "Bytes each, raw", value: "16" },
        ],
        result: { label: "Raw per day", value: "1.38 TB" },
        verdict: { text: "Too big to keep raw for long", tone: "warn" },
      },
    },
    {
      tag: "fix",
      head: "Queue first, store second",
      line: "A queue lets ingest and storage run at different speeds.",
      scene: { kind: "flow", spec: burst, scenario: "burst" },
    },
    {
      tag: "sum",
      head: "Neighbours look alike",
      line: "Timestamps repeat a schedule; values barely move. So they compress.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Raw samples", value: 1382, shown: "1,382 GB", tone: "bad" },
          { label: "Compressed", value: 118, shown: "118 GB", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Keeping a year",
      line: "Which ways of keeping old data work?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Keep all raw", tone: "bad", why: "Years of terabytes" },
          { label: "Rollups with max", tone: "good", why: "Cheap, and spikes survive" },
          { label: "Average the p99s", tone: "bad", why: "Gives the wrong percentile" },
          { label: "Histograms", tone: "good", why: "They add up exactly" },
        ],
      },
    },
    {
      tag: "catch",
      head: "One bad label",
      line: "Every distinct label value makes a new series. Drag the count.",
      scene: {
        kind: "meter",
        label: "Distinct label values",
        unit: "values",
        min: 1,
        max: 10000000,
        start: 50,
        log: true,
        stops: [
          { upTo: 1000, verdict: "Fine: like host or service.", tone: "good" },
          { upTo: 100000, verdict: "Costly: thousands of series each.", tone: "warn" },
          { upTo: 10000000, verdict: "Never: user_id breaks the index.", tone: "bad" },
        ],
      },
      predict: { q: "Add user_id, 1M values, as a label?", options: ["Fine, it is just a label", "No, series explode"], answer: 1, why: "Each value multiplies the series count, memory and cost." },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "One server covers many teams for a long time.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["One server, pull model", "A few alert rules", "Raw data only"] },
        right: { title: "Add when", points: ["Big fleet: queue and shards", "Long history: rollups", "Noisy pages: grouping"] },
      },
    },
  ],
};

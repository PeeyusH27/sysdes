import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A small inline picture: the four stages of the interview, with the numbers feeding the design.
const flow: FlowSpec = {
  id: "story-requirements-estimation",
  title: "From requirements to design",
  description: "Scope and size come first. Every number then picks a part of the design, and a changed number updates it.",
  nodes: [
    { id: "scope", label: "Requirements", kind: "client", col: 0, row: 0, sub: "~5 min" },
    { id: "size", label: "Estimate", kind: "service", col: 1, row: 0, sub: "~3 min" },
    { id: "design", label: "Design", kind: "gateway", col: 2, row: 0, sub: "~15 min" },
    { id: "deep", label: "Deep dive", kind: "cache", col: 3, row: 0, sub: "~15 min" },
  ],
  edges: [
    { from: "scope", to: "size" },
    { from: "size", to: "design" },
    { from: "design", to: "deep", label: "trade-offs" },
  ],
  scenarios: [
    {
      id: "numbers",
      name: "Numbers drive the design",
      steps: [
        { edge: "scope>size", caption: "Agree 3 to 5 features and targets like p99 under 200 ms.", mark: [{ node: "scope", state: "ok" }] },
        { edge: "size>design", caption: "Turn users into QPS, storage and bandwidth.", mark: [{ node: "size", state: "ok" }] },
        { edge: "size>design", caption: "Each number picks a part: cache, CDN, queue.", mark: [{ node: "design", state: "ok" }] },
        { edge: "design>deep", caption: "Pick the hardest part and defend it with the numbers.", mark: [{ node: "deep", state: "ok" }] },
        { edge: "design>deep", reverse: true, tone: "ok", caption: "If a number changes, say so and update the design." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A design with no numbers",
      line: "One server or fifty? A cache or shards? Without numbers, every answer is a guess.",
      scene: {
        kind: "versus",
        left: { title: "Guessing", points: ["Add a cache?", "Shard the database?", "One server or fifty?"] },
        right: { title: "With numbers", points: ["350 peak QPS: one server", "Reads 100 to 1: cache", "35K peak QPS: replicas too"] },
      },
    },
    {
      tag: "idea",
      head: "Scope first, then size",
      line: "Every number has to end in a design choice.",
      scene: { kind: "flow", spec: flow, scenario: "numbers" },
    },
    {
      tag: "sum",
      head: "From users to QPS",
      line: "Daily users times actions, divided by the seconds in a day.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Daily users", value: "10 million" },
          { label: "Actions each", value: "10" },
          { label: "Seconds a day", value: "86,400" },
        ],
        result: { label: "Average", value: "~1,160/s" },
        verdict: { text: "Peak is about 3x that", tone: "info" },
      },
    },
    {
      tag: "sum",
      head: "Where does one server stop?",
      line: "Drag the peak load and watch the design change.",
      scene: {
        kind: "meter",
        label: "Peak requests per second",
        unit: "req/s",
        min: 100,
        max: 100000,
        start: 350,
        log: true,
        stops: [
          { upTo: 1000, verdict: "One server copes. A second is for failover.", tone: "good" },
          { upTo: 10000, verdict: "A handful of servers behind a balancer.", tone: "info" },
          { upTo: 100000, verdict: "One database cannot serve every read. Add cache, replicas.", tone: "warn" },
        ],
      },
      predict: { q: "At 350 peak requests a second, what do you need?", options: ["One server and a spare", "A cache and shards"], answer: 0, why: "A second server is for failover, not load. Do not shard at 350." },
    },
    {
      tag: "idea",
      head: "Split reads from writes",
      line: "Same users, very different load on each path.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Uploads at peak", value: 700, shown: "700/s", tone: "good" },
          { label: "Feed reads at peak", value: 35000, shown: "35K/s", tone: "warn" },
        ],
      },
      predict: { q: "Which side of this photo app needs the cache?", options: ["Uploads", "Feed reads"], answer: 1, why: "Reads are about 50 times the uploads, so the feed path gets the cache." },
    },
    {
      tag: "sum",
      head: "Photos need their own store",
      line: "Storage is where the numbers get big.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Photos a day", value: "20 million" },
          { label: "Size each", value: "500 KB" },
        ],
        result: { label: "New data a day", value: "10 TB" },
        verdict: { text: "Object storage, not the database", tone: "info" },
      },
    },
    {
      tag: "catch",
      head: "Do not forget the copies",
      line: "Five years of data for 10M daily users. Count every replica.",
      scene: {
        kind: "bars",
        bars: [
          { label: "One copy", value: 17, shown: "17 TB", tone: "warn" },
          { label: "Three copies", value: 49.8, shown: "49.8 TB", tone: "bad" },
        ],
      },
    },
    {
      tag: "skip",
      head: "Round, say it, move on",
      line: "You want the right order of magnitude in five minutes.",
      scene: {
        kind: "versus",
        left: { title: "Avoid", points: ["Ten minutes of arithmetic", "Mixing bits and bytes", "Numbers that change nothing"] },
        right: { title: "Do", points: ["Round 86,400 to 100,000", "State the result aloud", "End with: so we need"] },
      },
    },
  ],
};

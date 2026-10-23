import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Pain picture: a campaign and a login code share one queue.
const shared: FlowSpec = {
  id: "story-notif-shared",
  title: "One shared queue",
  description: "A marketing campaign and a login code wait in the same line for one sender.",
  nodes: [
    { id: "src", label: "Campaign + OTP", kind: "client", col: 0, row: 1 },
    { id: "queue", label: "One queue", kind: "queue", col: 1, row: 1 },
    { id: "worker", label: "SMS worker", kind: "worker", col: 2, row: 1, sub: "2,000/s" },
  ],
  edges: [
    { from: "src", to: "queue", style: "async" },
    { from: "queue", to: "worker", style: "async" },
  ],
  scenarios: [
    {
      id: "stuck",
      name: "Shared queue",
      steps: [
        { edge: "src>queue", caption: "A campaign of 1 million messages is queued.", with: [{ edge: "src>queue", caption: "" }, { edge: "src>queue", caption: "" }], mark: [{ node: "queue", state: "busy" }] },
        { edge: "src>queue", caption: "A login code joins the back of the line." },
        { edge: "queue>worker", tone: "error", caption: "It waits about 8 minutes. The code expires first.", mark: [{ node: "worker", state: "busy" }], ms: 1800 },
      ],
    },
  ],
};

// Idea and fix picture: two lanes, and a backup provider.
const lanes: FlowSpec = {
  id: "story-notif-lanes",
  title: "Priority lanes and failover",
  description: "A campaign fills only the low lane. A login code takes the critical lane, and a backup provider covers an outage.",
  nodes: [
    { id: "src", label: "Campaign + OTP", kind: "client", col: 0, row: 1 },
    { id: "crit", label: "Critical lane", kind: "queue", col: 1, row: 0 },
    { id: "low", label: "Low lane", kind: "queue", col: 1, row: 2 },
    { id: "worker", label: "SMS worker", kind: "worker", col: 2, row: 1 },
    { id: "a", label: "Provider A", kind: "external", col: 3, row: 0, sub: "primary" },
    { id: "b", label: "Provider B", kind: "external", col: 3, row: 2, sub: "backup" },
  ],
  edges: [
    { from: "src", to: "crit", style: "async" },
    { from: "src", to: "low", style: "async" },
    { from: "crit", to: "worker", style: "async" },
    { from: "low", to: "worker", style: "async" },
    { from: "worker", to: "a" },
    { from: "worker", to: "b", label: "failover" },
  ],
  scenarios: [
    {
      id: "lanes",
      name: "Two lanes",
      steps: [
        { edge: "src>low", caption: "The campaign fills only the low lane.", with: [{ edge: "src>low", caption: "" }, { edge: "src>low", caption: "" }], mark: [{ node: "low", state: "busy" }] },
        { edge: "src>crit", caption: "The login code takes the critical lane." },
        { edge: "crit>worker", tone: "ok", caption: "It leaves in milliseconds, whatever the campaign does.", mark: [{ node: "worker", state: "busy" }] },
        { edge: "worker>a", tone: "ok", caption: "Delivered." },
      ],
    },
    {
      id: "failover",
      name: "Provider down",
      steps: [
        { edge: "crit>worker", caption: "A login code reaches the worker.", mark: [{ node: "worker", state: "busy" }] },
        { edge: "worker>a", tone: "error", caption: "Provider A times out. The breaker opens.", mark: [{ node: "a", state: "down" }] },
        { edge: "worker>b", caption: "The worker tries provider B instead." },
        { edge: "worker>b", reverse: true, tone: "ok", caption: "B accepts. The code arrives in seconds.", mark: [{ node: "b", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A login code stuck in line",
      line: "One shared queue means a login code waits behind the whole campaign.",
      scene: { kind: "flow", spec: shared, scenario: "stuck" },
    },
    {
      tag: "sum",
      head: "Do the sum",
      line: "A million messages leave at 2,000 a second. Anything behind them waits.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Campaign", value: "1 million" },
          { label: "Sender speed", value: "2,000 a second" },
        ],
        result: { label: "Login code waits", value: "~8 minutes" },
        verdict: { text: "The code expires first", tone: "bad" },
      },
    },
    {
      tag: "sum",
      head: "When do you need lanes?",
      line: "Drag the load. 100K users at 5 messages a day is about 6 a second.",
      scene: {
        kind: "meter",
        label: "Messages per second",
        unit: "msg/s",
        min: 1,
        max: 100000,
        start: 6,
        log: true,
        stops: [
          { upTo: 100, verdict: "One worker is enough.", tone: "good" },
          { upTo: 5000, verdict: "Add a queue to absorb bursts.", tone: "warn" },
          { upTo: 100000, verdict: "Lanes by channel and priority.", tone: "bad" },
        ],
      },
      predict: { q: "At 6 messages a second, build priority lanes?", options: ["Yes, always", "No, one worker does"], answer: 1, why: "Queues pay off when a provider slows or a burst lands, not before." },
    },
    {
      tag: "idea",
      head: "Give each priority its own lane",
      line: "The campaign can only fill the low lane. Critical has its own workers.",
      scene: { kind: "flow", spec: lanes, scenario: "lanes" },
    },
    {
      tag: "choose",
      head: "Mark it sent when?",
      line: "Queues deliver at least once, so dedupe. Exactly once to a phone is impossible.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Id eventId:channel", tone: "good", why: "A retry makes the same id" },
          { label: "Mark after accept", tone: "good", why: "A crash may resend, never lose" },
          { label: "Mark before send", tone: "bad", why: "A crash loses the message" },
          { label: "Trust the queue", tone: "bad", why: "It delivers at least once" },
        ],
      },
      predict: { q: "Mark sent before or after the provider accepts?", options: ["Before", "After"], answer: 1, why: "After. Marking first means a crash loses the message for good." },
    },
    {
      tag: "fix",
      head: "A provider goes down",
      line: "Every provider fails sometimes. A breaker skips it and a backup takes over.",
      scene: { kind: "flow", spec: lanes, scenario: "failover" },
    },
    {
      tag: "catch",
      head: "A burst beats the provider",
      line: "Campaigns burst far above what providers accept. Throttle the fan-out on purpose.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Average", value: 5800, shown: "5.8K/s", tone: "good" },
          { label: "Provider limit, say", value: 5000, shown: "~5K/s", tone: "warn" },
          { label: "Campaign burst", value: 50000, shown: "50K+/s", tone: "bad" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Not every error is retried",
      line: "Retrying a dead phone number just wastes sends. Sort errors first.",
      scene: {
        kind: "versus",
        left: { title: "Retry", points: ["Timeout", "429 too many requests", "5xx server error"] },
        right: { title: "Never retry", points: ["Bad phone number", "Dead device token", "Mark failed, remove token"] },
      },
    },
  ],
};

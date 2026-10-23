import { getPrimer } from "../../primers";
import { wsScaling } from "../../deep-dives/04-polling-sse-websockets/diagrams";
import type { Story } from "../types";

// The realtime primer's picture (you, a chat server, your friend) is reused: same nodes, same scenarios.
const flow = getPrimer("realtime")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Asking again and again",
      line: "HTTP waits to be asked. Most trips come back empty, and news arrives late.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum first",
      line: "100,000 clients polling every 5 seconds make a lot of mostly empty requests.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Clients", value: "100,000" },
          { label: "Poll every", value: "5 seconds" },
        ],
        result: { label: "Requests", value: "20,000 / sec" },
        verdict: { text: "Mostly empty. Switch to SSE", tone: "bad" },
      },
    },
    {
      tag: "sum",
      head: "When is polling fine?",
      line: "Drag the request rate. 1,000 dashboards every 30 seconds is about 33 a second.",
      scene: {
        kind: "meter",
        label: "Requests per second",
        unit: "req/s",
        min: 1,
        max: 100000,
        start: 33,
        log: true,
        stops: [
          { upTo: 500, verdict: "Keep polling. It is trivial.", tone: "good" },
          { upTo: 5000, verdict: "Watch it. Long polling or SSE.", tone: "warn" },
          { upTo: 100000, verdict: "Switch to SSE. Mostly empty requests.", tone: "bad" },
        ],
      },
      predict: { q: "1,000 dashboards poll every 30 seconds. Switch?", options: ["Yes, to SSE", "No, polling is fine"], answer: 1, why: "About 33 requests a second is trivial. Seconds of delay suit a dashboard." },
    },
    {
      tag: "idea",
      head: "Keep one line open",
      line: "The server speaks first. Quiet moments cost almost nothing.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "choose",
      head: "Pick by direction and frequency",
      line: "Who talks, and how often? That decides it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Dashboard: poll", tone: "good", why: "Seconds of delay are fine" },
          { label: "Scores: SSE", tone: "good", why: "One-way, plain HTTP, resumes" },
          { label: "Chat: WebSocket", tone: "good", why: "Both sides send often" },
          { label: "Chat: poll", tone: "bad", why: "Empty trips and late messages" },
        ],
      },
      predict: { q: "Which fits live chat best?", options: ["Poll every 5 s", "SSE", "WebSocket"], answer: 2, why: "Chat flows both ways. SSE is one-way and polling adds delay." },
    },
    {
      tag: "fix",
      head: "Sockets live on one server",
      line: "Alice and Bob sit on different nodes. A pub/sub backplane carries the message.",
      scene: { kind: "flow", spec: wsScaling, scenario: "cross-node" },
    },
    {
      tag: "catch",
      head: "The reconnect storm",
      line: "After a deploy, 50K clients return together unless each waits a random time.",
      scene: {
        kind: "versus",
        left: { title: "Fixed delay", points: ["Node drains on deploy", "50K reconnect in one second", "Other nodes flatten"] },
        right: { title: "Full jitter", points: ["Random wait, 0 to N seconds", "Load spreads out", "Resume from last id"] },
      },
    },
  ],
};

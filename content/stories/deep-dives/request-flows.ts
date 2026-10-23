import { getPrimer } from "../../primers";
import type { Story } from "../types";

// Two primer pictures are reused: the retried payment (idempotency) and the slow dependency (circuit breaker).
const retry = getPrimer("idempotency")!.flow;
const breaker = getPrimer("circuit-breaker")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Tap Pay twice, pay twice",
      line: "The reply is lost, the phone retries, and the shop charges again.",
      scene: { kind: "flow", spec: retry, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum on reads",
      line: "Few reads reach the database.",
      scene: {
        kind: "sum",
        rows: [
          { label: "CDN misses", value: "20%" },
          { label: "Redis misses", value: "10%" },
        ],
        result: { label: "Reach the database", value: "2%" },
        verdict: { text: "Layers do the work", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "Slow calls add up",
      line: "Each call is slow 1% of the time. Drag the number of parallel calls.",
      scene: {
        kind: "meter",
        label: "Parallel calls per page",
        unit: "calls",
        min: 1,
        max: 100,
        start: 10,
        log: true,
        stops: [
          { upTo: 3, verdict: "About 3% of pages are slow.", tone: "good" },
          { upTo: 20, verdict: "Up to 18% of pages are slow.", tone: "warn" },
          { upTo: 100, verdict: "Most pages are slow. Tighten every hop.", tone: "bad" },
        ],
      },
      predict: { q: "10 parallel calls, each slow 1%. Pages hit by a slow one?", options: ["About 1%", "About 10%", "About 50%"], answer: 1, why: "The odds add up: 1 minus 0.99 to the 10th is about 9.6%." },
    },
    {
      tag: "idea",
      head: "Spend 200 ms like money",
      line: "Split the budget across hops, keep headroom, enforce it with timeouts.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Edge and gateway", value: 40, shown: "40 ms" },
          { label: "Service and Redis", value: 25, shown: "25 ms" },
          { label: "Database", value: 50, shown: "50 ms" },
          { label: "Downstream call", value: 45, shown: "45 ms" },
          { label: "Headroom", value: 40, shown: "40 ms", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Where does the work go?",
      line: "Commit the truth once. Move slow work out of the request.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Save, then publish", tone: "bad", why: "A crash loses the event" },
          { label: "Order plus outbox", tone: "good", why: "Event commits with the data" },
          { label: "Report in request", tone: "bad", why: "The user waits" },
          { label: "Queue, answer 202", tone: "good", why: "A worker finishes later" },
        ],
      },
      predict: { q: "Which write order can lose an event in a crash?", options: ["Save, then publish", "Order plus outbox row"], answer: 0, why: "Between the two steps nothing remembers the event. The outbox saves it in the commit." },
    },
    {
      tag: "fix",
      head: "Same key on every retry",
      line: "The server remembers the key and replays the saved result.",
      scene: { kind: "flow", spec: retry, scenario: "with" },
    },
    {
      tag: "catch",
      head: "One slow service sinks all",
      line: "No timeout, so calls pile up. A 45 ms timeout and fallback keep checkout alive.",
      scene: { kind: "flow", spec: breaker, scenario: "without" },
    },
    {
      tag: "skip",
      head: "Match weight to risk",
      line: "Match each flow to what losing it would cost.",
      scene: {
        kind: "versus",
        left: { title: "Always", points: ["A timeout on every call", "A latency budget", "A key per payment"] },
        right: { title: "Only if needed", points: ["Outbox: orders must not vanish", "Queue: work takes seconds", "Neither for a page counter"] },
      },
    },
  ],
};

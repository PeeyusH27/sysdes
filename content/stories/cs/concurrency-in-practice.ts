import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A thread for every request",
      line: "Ten thousand requests start ten thousand threads, and the machine drowns.",
      scene: {
        kind: "versus",
        left: { title: "Unbounded", points: ["10,000 requests", "10,000 threads"] },
        right: { title: "The result", points: ["Memory gone", "Switching dominates"] },
      },
    },
    {
      tag: "sum",
      head: "Size the pool by the work",
      line: "Tasks that wait need more workers than cores.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Cores", value: "8" },
          { label: "Wait per task", value: "90 ms" },
          { label: "Compute per task", value: "10 ms" },
        ],
        result: { label: "Pool size", value: "80" },
        verdict: { text: "Cores times (1 + wait / compute)", tone: "info" },
      },
    },
    {
      tag: "choose",
      head: "More workers, less gain",
      line: "The serial part of the job caps the speedup, whatever the core count.",
      scene: {
        kind: "meter",
        label: "Parallel share of the job",
        unit: "%",
        min: 50,
        max: 99,
        start: 90,
        stops: [
          { upTo: 75, verdict: "Capped at 4x or less.", tone: "bad" },
          { upTo: 95, verdict: "Capped between 4x and 20x.", tone: "warn" },
          { upTo: 99, verdict: "Capped between 20x and 100x.", tone: "good" },
        ],
      },
      predict: { q: "A 90% parallel job on 100 cores: 50x?", options: ["Yes", "No, it caps at 10x"], answer: 1, why: "The serial 10% remains, so the limit is one divided by 0.1." },
    },
    {
      tag: "idea",
      head: "Pick the right tool",
      line: "Each kind of shared work has a cheapest safe tool.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "A shared counter", tone: "info", why: "Atomic increment" },
          { label: "Two fields at once", tone: "info", why: "A lock, or redesign" },
          { label: "Idle sockets", tone: "info", why: "Event loop" },
          { label: "CPU crunching", tone: "info", why: "Threads or processes" },
        ],
      },
    },
    {
      tag: "fix",
      head: "Bound the buffer",
      line: "A full buffer slows the producer instead of growing forever.",
      scene: {
        kind: "versus",
        left: { title: "Full buffer", points: ["Producer waits", "Backpressure"] },
        right: { title: "Empty buffer", points: ["Consumer waits", "No busy loop"] },
      },
    },
    {
      tag: "catch",
      head: "Blocking the event loop",
      line: "One busy callback delays every timer and every other request.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Normal loop", value: 1, shown: "1 ms late", tone: "good" },
          { label: "40 ms CPU loop", value: 40, shown: "40 ms late", tone: "warn" },
          { label: "200 ms JSON parse", value: 200, shown: "200 ms late", tone: "bad" },
        ],
      },
    },
  ],
};

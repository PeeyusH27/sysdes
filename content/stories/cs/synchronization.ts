import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two threads, two locks",
      line: "Each holds one lock and wants the other. Nobody moves.",
      scene: {
        kind: "versus",
        left: { title: "The standoff", points: ["T1 holds A, wants B", "T2 holds B, wants A"] },
        right: { title: "The result", points: ["Neither can move", "Both wait forever"] },
      },
    },
    {
      tag: "sum",
      head: "Deadlock needs all four",
      line: "Take away any single condition and it cannot happen.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Mutual exclusion", value: "yes" },
          { label: "Hold and wait", value: "yes" },
          { label: "No preemption", value: "yes" },
          { label: "Circular wait", value: "yes" },
        ],
        result: { label: "Deadlock possible", value: "all 4" },
        verdict: { text: "Break any one", tone: "good" },
      },
    },
    {
      tag: "choose",
      head: "Which fix works?",
      line: "The cheapest is a fixed order for taking locks.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Same lock order", tone: "good", why: "Breaks circular wait" },
          { label: "Lock timeout", tone: "warn", why: "Notices late, then retries" },
          { label: "One giant lock", tone: "warn", why: "Safe, but everything runs serially" },
          { label: "More threads", tone: "bad", why: "More threads, same standoff" },
        ],
      },
      predict: { q: "Which fix prevents the standoff outright?", options: ["A timeout", "A fixed lock order"], answer: 1, why: "A fixed order means no ring of waiters can form. A timeout only detects it." },
    },
    {
      tag: "idea",
      head: "Mutex or semaphore",
      line: "A mutex lets one in. A semaphore lets N in.",
      scene: {
        kind: "versus",
        left: { title: "Mutex", points: ["One holder", "The owner unlocks"] },
        right: { title: "Semaphore", points: ["N holders", "Any thread releases"] },
      },
    },
    {
      tag: "choose",
      head: "Size the semaphore",
      line: "A database allows 20 connections. Permits should match.",
      scene: {
        kind: "meter",
        label: "Permits, database takes 20",
        unit: "permits",
        min: 1,
        max: 100,
        start: 20,
        stops: [
          { upTo: 1, verdict: "That is a mutex: one at a time.", tone: "warn" },
          { upTo: 20, verdict: "Bounded, and the database copes.", tone: "good" },
          { upTo: 100, verdict: "Too loose: overload again.", tone: "bad" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Slow work under a lock",
      line: "While the lock is held, everyone else waits. Throughput is one over the hold time.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Held 1 ms", value: 1000, shown: "1,000/s", tone: "good" },
          { label: "Held 10 ms", value: 100, shown: "100/s", tone: "warn" },
          { label: "Held 100 ms (I/O)", value: 10, shown: "10/s", tone: "bad" },
        ],
      },
    },
  ],
};

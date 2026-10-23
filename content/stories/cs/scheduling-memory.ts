import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A long job goes first",
      line: "Queue order A, B, C. Short jobs wait behind the long one.",
      scene: {
        kind: "versus",
        left: { title: "The queue", points: ["A needs 24 ms", "B needs 3 ms", "C needs 3 ms"] },
        right: { title: "The waiting", points: ["B waits 24 ms", "C waits 27 ms"] },
      },
    },
    {
      tag: "sum",
      head: "Average wait by policy",
      line: "Same three jobs, three policies, three very different averages.",
      scene: {
        kind: "sum",
        rows: [
          { label: "First come first served", value: "17 ms" },
          { label: "Round robin, 4 ms", value: "5.7 ms" },
          { label: "Shortest job first", value: "3 ms" },
        ],
        result: { label: "Lowest average wait", value: "3 ms" },
        verdict: { text: "But it can starve long jobs", tone: "warn" },
      },
    },
    {
      tag: "choose",
      head: "Which policy fits?",
      line: "Real schedulers blend these ideas.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "First come first", tone: "bad", why: "A long job blocks everyone" },
          { label: "Shortest first", tone: "warn", why: "Needs bursts, starves long jobs" },
          { label: "Round robin", tone: "good", why: "Fair, needs no burst times" },
        ],
      },
      predict: { q: "Which is fair without knowing burst times?", options: ["Shortest first", "Round robin"], answer: 1, why: "Round robin gives everyone a turn and needs only a quantum." },
    },
    {
      tag: "idea",
      head: "Memory is an illusion",
      line: "Each process sees its own addresses. Pages map to real frames.",
      scene: {
        kind: "versus",
        left: { title: "Process sees", points: ["Addresses from 0", "One contiguous space"] },
        right: { title: "Reality", points: ["4 KiB pages in frames", "A page table maps them"] },
      },
    },
    {
      tag: "sum",
      head: "Translate one address",
      line: "Only the page number changes. The offset passes through.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Virtual address", value: "0x3A7C" },
          { label: "Page, offset", value: "3, 0xA7C" },
          { label: "Page 3 is in frame", value: "7" },
        ],
        result: { label: "Physical address", value: "0x7A7C" },
        verdict: { text: "Offset is unchanged", tone: "info" },
      },
    },
    {
      tag: "choose",
      head: "Drag the TLB hit rate",
      line: "The TLB caches translations so most lookups skip the table walk.",
      scene: {
        kind: "meter",
        label: "TLB hit rate",
        unit: "%",
        min: 50,
        max: 100,
        start: 99,
        stops: [
          { upTo: 90, verdict: "Slow: many table walks.", tone: "bad" },
          { upTo: 98, verdict: "A noticeable cost.", tone: "warn" },
          { upTo: 100, verdict: "About 2% slower than raw memory.", tone: "good" },
        ],
      },
      predict: { q: "At a 99% hit rate, how slow is memory?", options: ["About 2% slower", "Twice as slow"], answer: 0, why: "0.99 times 101 plus 0.01 times 201 is 102 ns against 100 ns." },
    },
    {
      tag: "catch",
      head: "Thrashing",
      line: "A loop over 5 pages with 4 frames faults on every access.",
      scene: {
        kind: "bars",
        bars: [
          { label: "5 frames", value: 5, shown: "5 faults", tone: "good" },
          { label: "4 frames", value: 15, shown: "15 faults", tone: "bad" },
        ],
      },
    },
  ],
};

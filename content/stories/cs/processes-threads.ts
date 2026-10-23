import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two threads, one counter",
      line: "Both read 0, both write 1. One increment vanishes.",
      scene: {
        kind: "versus",
        left: { title: "What ran", points: ["T1 loads 0", "T2 loads 0", "Both store 1"] },
        right: { title: "What you wanted", points: ["T1 stores 1", "T2 stores 2"] },
      },
      predict: { q: "Two counter++ with no lock. Final value?", options: ["Always 2", "1 or 2, by timing"], answer: 1, why: "Load, add and store can interleave, so the result depends on timing. That is a race." },
    },
    {
      tag: "idea",
      head: "Who owns what",
      line: "A process owns the house. Threads share the rooms and keep their own bed.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Stack", tone: "info", why: "Private to each thread" },
          { label: "Registers", tone: "info", why: "Private, saved on a switch" },
          { label: "Heap", tone: "warn", why: "Shared, so needs locks" },
          { label: "Open files", tone: "warn", why: "Shared by every thread" },
        ],
      },
    },
    {
      tag: "sum",
      head: "Switching has a price",
      line: "Each switch costs microseconds, plus a cold cache afterwards.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Time slice", value: "50 µs" },
          { label: "One switch", value: "5 µs" },
        ],
        result: { label: "CPU lost", value: "about 9%" },
        verdict: { text: "Slices that short waste work", tone: "bad" },
      },
    },
    {
      tag: "choose",
      head: "Drag the time slice",
      line: "Longer slices hide the switch. Shorter ones answer faster.",
      scene: {
        kind: "meter",
        label: "Time slice",
        unit: "µs",
        min: 10,
        max: 10000,
        start: 50,
        log: true,
        stops: [
          { upTo: 100, verdict: "Mostly switching, little work.", tone: "bad" },
          { upTo: 1000, verdict: "Noticeable cost.", tone: "warn" },
          { upTo: 10000, verdict: "Switching is noise.", tone: "good" },
        ],
      },
      predict: { q: "At 50 µs, how much CPU goes to switching?", options: ["Under 1%", "About a tenth"], answer: 1, why: "5 µs against a 55 µs cycle is about 9%." },
    },
    {
      tag: "catch",
      head: "A thread per connection",
      line: "Each thread reserves a stack, so idle connections add up fast.",
      scene: {
        kind: "bars",
        bars: [
          { label: "1 event loop", value: 1, shown: "1 MB", tone: "good" },
          { label: "1,000 threads", value: 1000, shown: "1 GB", tone: "warn" },
          { label: "20,000 threads", value: 20000, shown: "20 GB", tone: "bad" },
        ],
      },
    },
    {
      tag: "skip",
      head: "Pick by what you need",
      line: "Contain failures with processes. Share state with threads.",
      scene: {
        kind: "versus",
        left: { title: "Need isolation", points: ["Use processes", "A crash stays inside"] },
        right: { title: "Need shared state", points: ["Use threads", "Guard it with a lock"] },
      },
    },
  ],
};

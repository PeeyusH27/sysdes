import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Scanning a billion rows",
      line: "Without an index, one lookup reads the whole table.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Table rows", value: "1 billion" },
          { label: "Scan speed", value: "10M rows/s" },
        ],
        result: { label: "One lookup", value: "100 s" },
        verdict: { text: "Far too slow", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "A B-tree is wide, not deep",
      line: "Each page holds about 300 keys, so a few levels cover a huge table.",
      scene: {
        kind: "meter",
        label: "Rows in the table",
        unit: "rows",
        min: 1000,
        max: 10000000000,
        start: 1000000000,
        log: true,
        stops: [
          { upTo: 90000, verdict: "One or two levels.", tone: "good" },
          { upTo: 27000000, verdict: "Three levels.", tone: "good" },
          { upTo: 8100000000, verdict: "Four levels.", tone: "good" },
          { upTo: 10000000000, verdict: "Five levels. Still shallow.", tone: "warn" },
        ],
      },
      predict: { q: "Levels needed for a billion rows?", options: ["About 4", "About 30"], answer: 0, why: "300 to the fourth power is 8.1 billion, so four page reads reach any row." },
    },
    {
      tag: "choose",
      head: "B-tree or LSM-tree",
      line: "Both pay somewhere: one on writes, the other on reads.",
      scene: {
        kind: "versus",
        left: { title: "B-tree", points: ["In-place page updates", "Predictable reads"] },
        right: { title: "LSM-tree", points: ["Sequential appends", "Compaction later"] },
      },
    },
    {
      tag: "fix",
      head: "Which filter uses (a, b)?",
      line: "A composite index narrows by a leading run of equalities, then one range.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "a = 1", tone: "good", why: "Uses the index" },
          { label: "a = 1 and b > 5", tone: "good", why: "Uses both columns" },
          { label: "b = 5 only", tone: "bad", why: "Skips the first column" },
          { label: "a > 1 and b = 5", tone: "warn", why: "Range ends the prefix" },
        ],
      },
      predict: { q: "Can (a, b) serve a filter on b alone?", options: ["Yes", "No, not by seeking"], answer: 1, why: "The index is sorted by a first, so b alone has no sorted run to seek to." },
    },
    {
      tag: "catch",
      head: "Every index is a write tax",
      line: "An insert updates the table and every index on it.",
      scene: {
        kind: "bars",
        bars: [
          { label: "No extra index", value: 1, shown: "1 write", tone: "good" },
          { label: "5 indexes", value: 6, shown: "6 writes", tone: "warn" },
          { label: "10 indexes", value: 11, shown: "11 writes", tone: "bad" },
        ],
      },
    },
    {
      tag: "skip",
      head: "When to skip the index",
      line: "Check the query plan before adding one.",
      scene: {
        kind: "versus",
        left: { title: "Index helps", points: ["Few rows match", "Filter, join, sort"] },
        right: { title: "Skip it", points: ["Most rows match", "Tiny table"] },
      },
    },
  ],
};

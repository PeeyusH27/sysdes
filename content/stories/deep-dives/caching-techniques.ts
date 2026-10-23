import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The cache primer's picture (users, app, fast copy, slow database) is reused: same nodes, same scenarios.
const flow = getPrimer("cache")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Same question, slow every time",
      line: "A crowd asks for one product page. Each ask walks to the database.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Does the cache earn its place?",
      line: "The hit ratio is the share of reads the cache answers. Drag it, at 10,000 reads a second.",
      scene: {
        kind: "meter",
        label: "Hit ratio",
        unit: "% hits",
        min: 0,
        max: 100,
        start: 50,
        stops: [
          { upTo: 60, verdict: "Barely. An extra hop, little saved.", tone: "bad" },
          { upTo: 89, verdict: "So-so. Database still sees thousands.", tone: "warn" },
          { upTo: 100, verdict: "Good. Database sees 1,000 a second or less.", tone: "good" },
        ],
      },
      predict: { q: "Only half of reads hit the cache. Worth it?", options: ["Yes, any cache helps", "Barely, aim for 90%"], answer: 1, why: "At 50% the database still takes 5,000 reads a second. You added a hop for little." },
    },
    {
      tag: "idea",
      head: "Check the copy first",
      line: "A hit answers in about 1 ms. A miss asks the database, then saves the answer.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "choose",
      head: "Who keeps the copy fresh?",
      line: "Start with cache-aside. Losing the cache then costs only speed.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Cache-aside", tone: "good", why: "Default. If Redis dies, just slower" },
          { label: "Write-through", tone: "warn", why: "Fresh reads, but writes cost double" },
          { label: "Write-around", tone: "warn", why: "Only for written once, rarely read" },
          { label: "Write-behind", tone: "bad", why: "Unflushed writes die with the cache" },
        ],
      },
      predict: { q: "The cache dies mid flash sale. Which loses orders?", options: ["Cache-aside", "Write-behind"], answer: 1, why: "Write-behind saves to the database later. Orders still in the cache are gone." },
    },
    {
      tag: "fix",
      head: "On a write, delete the copy",
      line: "Update the database, then delete the key. A delete cannot arrive out of order.",
      scene: { kind: "flow", spec: flow, scenario: "stale" },
    },
    {
      tag: "catch",
      head: "The noon stampede",
      line: "A hot key expires and 5,000 reads a second hit the database at once.",
      scene: {
        kind: "versus",
        left: { title: "Same TTL", points: ["Hot key expires at noon", "All reads miss together", "Database drowns"] },
        right: { title: "The fix", points: ["Add random TTL jitter", "One request rebuilds, rest wait", "Redis lock across instances"] },
      },
    },
    {
      tag: "skip",
      head: "When not to cache",
      line: "Fix the slow query or add an index first. Some data should never be cached.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Hot product page", tone: "good", why: "Read often, changes rarely" },
          { label: "Slow query", tone: "warn", why: "Add an index first" },
          { label: "Read-once data", tone: "bad", why: "Nothing to reuse" },
          { label: "Changes constantly", tone: "bad", why: "The copy is always old" },
          { label: "Account balance", tone: "bad", why: "Must never be stale" },
        ],
      },
    },
  ],
};

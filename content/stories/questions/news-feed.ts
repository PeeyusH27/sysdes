import { pushVsPull } from "../../questions/news-feed/diagrams";
import type { Story } from "../types";

// The page's own push-versus-pull picture (six nodes): "pull" builds the feed on open, "push" has it ready.
export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Build the feed on open",
      line: "Ben follows 300 people. Every time he opens the app, 300 timelines are merged.",
      scene: { kind: "flow", spec: pushVsPull, scenario: "pull" },
    },
    {
      tag: "sum",
      head: "Reads outnumber posts 60 to 1",
      line: "So do the work when someone posts. Its price is many small writes.",
      scene: {
        kind: "sum",
        rows: [
          { label: "New posts a second", value: "580" },
          { label: "Average followers", value: "200" },
        ],
        result: { label: "Feed writes a second", value: "116,000" },
        verdict: { text: "Worth it: reads are 60x more", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Ready-made feeds",
      line: "Each post id is copied into every follower's feed ahead of time.",
      scene: { kind: "flow", spec: pushVsPull, scenario: "push" },
      predict: { q: "Ben opens a pre-built feed. How many lookups?", options: ["One", "Around 300"], answer: 0, why: "His feed is already assembled, so it is a single read of his own list." },
    },
    {
      tag: "sum",
      head: "Pushing has a size limit",
      line: "Say workers manage about 100K feed writes a second. Drag the follower count.",
      scene: {
        kind: "meter",
        label: "Followers",
        unit: "followers",
        min: 100,
        max: 50000000,
        start: 30000000,
        log: true,
        stops: [
          { upTo: 100000, verdict: "Push. Done in about a second.", tone: "good" },
          { upTo: 1000000, verdict: "Roughly 10 seconds. Borderline.", tone: "warn" },
          { upTo: 50000000, verdict: "Minutes of writes. 30M takes about 5 minutes.", tone: "bad" },
        ],
      },
      predict: { q: "A 30M-follower account posts. How long to push?", options: ["About a second", "About 5 minutes"], answer: 1, why: "30 million writes at 100K a second is 300 seconds." },
    },
    {
      tag: "choose",
      head: "Push or pull, by author",
      line: "Push for most. Pull the few celebrities and merge them in on open.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "200 followers", tone: "good", why: "Push. Instant" },
          { label: "100K followers", tone: "good", why: "Push. About a second" },
          { label: "30M followers", tone: "bad", why: "Do not push. Pull at read time" },
          { label: "Follows 5 stars", tone: "good", why: "Merging 5 extra timelines is cheap" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Keeping every feed warm",
      line: "Memory adds up fast, so cache feeds only for active users.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Users", value: "300 million" },
          { label: "Post ids per feed", value: "800" },
          { label: "Bytes per id", value: "~40" },
        ],
        result: { label: "Memory", value: "~9.6 TB" },
        verdict: { text: "Skip inactive users", tone: "warn" },
      },
    },
    {
      tag: "skip",
      head: "Small app? Just pull",
      line: "If nobody has many followers, skip the fan-out machinery.",
      scene: {
        kind: "versus",
        left: { title: "Just pull", points: ["Nobody has huge reach", "One write per post", "Merge on open"] },
        right: { title: "Hybrid", points: ["Push most authors", "Pull celebrities", "Cap feeds at 800 ids"] },
      },
    },
  ],
};

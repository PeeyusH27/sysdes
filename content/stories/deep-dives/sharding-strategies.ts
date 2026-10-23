import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The sharding primer's picture (one database, a router, three slices) is reused: same nodes, same scenarios.
const flow = getPrimer("sharding")!.flow;

export const story: Story | undefined = {
  learn: [
    {
      head: "What sharding means",
      body: "Sharding splits one big database into several smaller ones, each holding part of the data. A key, such as the user id, decides which one holds a given row.",
      eg: "A phone book split by surname",
      example: "A city splits one huge phone book into A to F, G to M and so on. You read the cover to pick the right volume, then look inside it.",
      doodle: "shard",
    },
    {
      head: "Why split at all",
      body: "One machine can take only so many writes a second and hold only so much data. When a tuned database hits either limit, a bigger box stops helping, so you add more boxes.",
      eg: "One till and a growing queue",
      example: "A shop can buy a faster till only up to a point. Opening more lanes, each serving its own customers, keeps every line short.",
    },
    {
      head: "The shard key decides everything",
      body: "The key picks the machine for every request. A good key has many different values, spreads load evenly and appears in your most common query. A poor key piles work onto one machine.",
      eg: "Sorting mail by postcode",
      example: "A sorting office routes letters by postcode. If most mail goes to one postcode, that one bin overflows while the others sit nearly empty.",
    },
    {
      head: "Hot keys unbalance the slices",
      body: "Even a good key can go wrong when one value is far more popular than the rest, like a celebrity account. All its traffic lands on one machine while the others stay quiet.",
      eg: "A famous account posts",
      example: "When a very popular account posts, millions read the same record at once. That single slice struggles even though the whole system has spare capacity.",
    },
    {
      head: "The price you pay",
      body: "A query without the key must ask every shard and merge the answers. Moving data between shards needs care. That is why teams shard last, after indexes, caching and replicas.",
      eg: "Finding a book without its title",
      example: "Asking a clerk for a blue book about boats means checking every section. Knowing the title sends you straight to one shelf.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "One database, a growing queue",
      line: "Every write lines up at one machine. Add users and the line only gets longer.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum before you split",
      line: "Size alone rarely forces it. 2.5 TB fits on one big machine.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Users", value: "500 million" },
          { label: "Data per user", value: "5 KB" },
        ],
        result: { label: "Total", value: "2.5 TB" },
        verdict: { text: "Fits on one machine", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "Writes are the real limit",
      line: "A tuned primary copes with a few thousand writes a second. Drag to see where it breaks.",
      scene: {
        kind: "meter",
        label: "Writes per second",
        unit: "writes/s",
        min: 100,
        max: 100000,
        start: 2000,
        log: true,
        stops: [
          { upTo: 5000, verdict: "No. One database copes.", tone: "good" },
          { upTo: 20000, verdict: "Not yet. Try a bigger machine, copies, a cache.", tone: "warn" },
          { upTo: 100000, verdict: "Yes. One primary cannot take this.", tone: "bad" },
        ],
      },
      predict: { q: "At 3,000 writes a second, do you shard?", options: ["Yes, right away", "No, try cheaper fixes first"], answer: 1, why: "Sharding is the last resort: joins and changes get harder forever." },
    },
    {
      tag: "idea",
      head: "Split the data by a key",
      line: "A router reads the key and sends each request to one slice. Each machine does only its share.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "choose",
      head: "The key decides everything",
      line: "A good key has many values, spreads evenly and matches your main question.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "user_id", tone: "good", why: "Many values, even spread" },
          { label: "country", tone: "warn", why: "One country can hold most users" },
          { label: "is_premium", tone: "bad", why: "Two values means two shards, ever" },
          { label: "created_at", tone: "bad", why: "Every new write hits the newest shard" },
        ],
      },
      predict: { q: "Which key would pile every new write on one shard?", options: ["user_id", "created_at"], answer: 1, why: "New rows always have the newest time, so they all land on the last shard." },
    },
    {
      tag: "catch",
      head: "A celebrity melts one slice",
      line: "A popular key sends all its traffic to one machine while the others sit idle.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Slice 1", value: 8, shown: "8%", tone: "good" },
          { label: "Slice 2", value: 12, shown: "12%", tone: "good" },
          { label: "Slice 3 (celebrity)", value: 96, shown: "96%", tone: "bad" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Questions across slices hurt",
      line: "No key in the query means asking every slice. Top 10 posts on 64 shards is 64 calls.",
      scene: { kind: "flow", spec: flow, scenario: "catch" },
    },
    {
      tag: "skip",
      head: "When not to shard",
      line: "Try these first. Shard only when writes or data outgrow one primary.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["A bigger machine", "Indexes", "A cache and copies", "Archive cold rows"] },
        right: { title: "Then shard when", points: ["Writes outgrow one primary", "Data will not fit"] },
      },
    },
  ],
};

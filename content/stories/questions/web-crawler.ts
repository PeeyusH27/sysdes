import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: a polite queue per host, and a spider trap meeting a per-host budget.
const polite: FlowSpec = {
  id: "story-crawler-polite",
  title: "A queue per host",
  description: "The frontier keeps one queue per site. A site that was just fetched rests, and the worker serves another site.",
  nodes: [
    { id: "queue", label: "Host queues", kind: "queue", col: 0, row: 1, sub: "one per site" },
    { id: "worker", label: "Fetcher", kind: "worker", col: 1, row: 1 },
    { id: "news", label: "News site", kind: "external", col: 2, row: 0 },
    { id: "blog", label: "Blog", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "queue", to: "worker", label: "next ready URL" },
    { from: "worker", to: "news" },
    { from: "worker", to: "blog" },
  ],
  scenarios: [
    {
      id: "polite",
      name: "Polite",
      steps: [
        { edge: "queue>worker", caption: "The next ready URL belongs to the news site." },
        { edge: "worker>news", caption: "Fetch it. That site now rests for 10 seconds.", mark: [{ node: "news", state: "busy" }] },
        { edge: "queue>worker", caption: "The news site is resting, so the queue serves the blog." },
        { edge: "worker>blog", tone: "ok", caption: "The worker stays busy. Neither site sees a crowd.", mark: [{ node: "blog", state: "ok" }] },
        { edge: "queue>worker", caption: "Ten seconds later the news site is ready again.", mark: [{ node: "news", state: null }, { node: "blog", state: null }] },
      ],
    },
  ],
};

const trap: FlowSpec = {
  id: "story-crawler-trap",
  title: "A spider trap",
  description: "A calendar links to the next month forever. Every URL is new, so only a per-host budget stops it.",
  nodes: [
    { id: "cal", label: "Calendar site", kind: "external", col: 0, row: 1, sub: "next month, forever" },
    { id: "parser", label: "Parser", kind: "worker", col: 1, row: 1 },
    { id: "seen", label: "Seen filter", kind: "cache", col: 2, row: 1, sub: "all new" },
    { id: "budget", label: "Host budget", kind: "service", col: 3, row: 1, sub: "10,000 URLs" },
  ],
  edges: [
    { from: "cal", to: "parser" },
    { from: "parser", to: "seen", label: "link" },
    { from: "seen", to: "budget", label: "new" },
  ],
  scenarios: [
    {
      id: "trap",
      name: "Trap",
      steps: [
        { edge: "cal>parser", caption: "Every calendar page links to the next month." },
        { edge: "parser>seen", caption: "Each link is a new URL, so the filter lets it through." },
        { edge: "seen>budget", tone: "error", caption: "Again and again, without end.", mark: [{ node: "seen", state: "busy" }] },
        { edge: "seen>budget", reverse: true, tone: "ok", caption: "At 10,000 queued URLs the budget says stop. The crawl moves on.", mark: [{ node: "seen", state: null }, { node: "budget", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Fast overall, gentle per site",
      line: "A crawler wants 386 pages a second. Each site should see one request every 10 seconds.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Pages a second", value: "386" },
          { label: "Gap per site", value: "10 seconds" },
        ],
        result: { label: "Sites in play", value: "3,860" },
        verdict: { text: "Spread out, or get blocked", tone: "warn" },
      },
      predict: { q: "Pages a second is 386, gap 10 s. How many sites?", options: ["About 39", "About 3,860"], answer: 1, why: "Each site gives 0.1 page a second, so you need 386 divided by 0.1 sites." },
    },
    {
      tag: "fix",
      head: "One queue per site",
      line: "A site that was just fetched rests. The worker serves another.",
      scene: { kind: "flow", spec: polite, scenario: "polite" },
    },
    {
      tag: "sum",
      head: "Remembering every URL",
      line: "Drag the number of URLs. Does a plain set still fit?",
      scene: {
        kind: "meter",
        label: "Distinct URLs",
        unit: "URLs",
        min: 1000000,
        max: 10000000000,
        start: 50000000,
        log: true,
        stops: [
          { upTo: 100000000, verdict: "A plain hash set in memory is fine.", tone: "good" },
          { upTo: 2000000000, verdict: "An exact set strains memory. Use a Bloom filter.", tone: "warn" },
          { upTo: 10000000000, verdict: "Exact needs 80 GB. A Bloom filter needs about 12.", tone: "bad" },
        ],
      },
      predict: { q: "50 million URLs. Is a plain hash set fine?", options: ["Yes, around 400 MB", "No, far too big"], answer: 0, why: "50 million times 8 bytes is 400 MB. Bloom filters pay off at billions." },
    },
    {
      tag: "choose",
      head: "Is this link new?",
      line: "Pick how to check it, for each of billions of links.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Ask the database", tone: "bad", why: "A lookup per link is too slow" },
          { label: "Exact hash set", tone: "warn", why: "Fast, but 40 GB for 5B URLs" },
          { label: "Bloom filter", tone: "good", why: "About 6 GB; skips 1% of new URLs" },
          { label: "No check", tone: "bad", why: "Loops and repeats forever" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The trap no filter catches",
      line: "A calendar makes new URLs without end. Only a limit stops it.",
      scene: { kind: "flow", spec: trap, scenario: "trap" },
    },
    {
      tag: "skip",
      head: "Start small",
      line: "Most of this arrives only when the crawl grows.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["One queue, one worker", "A plain set of seen URLs", "Obey robots.txt"] },
        right: { title: "Add when", points: ["Many sites: queue per host", "Billions: Bloom filter", "Mirrors: simhash dedupe"] },
      },
    },
  ],
};

import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A small redirect picture: click, app, Redis, Postgres, and a queue for counting clicks.
const flow: FlowSpec = {
  id: "story-url-redirect",
  title: "A short link redirect",
  description: "Clicks reach an app server. It asks Redis first, then Postgres on a miss, and drops click notes on a queue.",
  nodes: [
    { id: "client", label: "Click", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App server", kind: "service", col: 1, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "code to URL" },
    { id: "queue", label: "Click queue", kind: "queue", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "redis", label: "1 check" },
    { from: "app", to: "db", label: "2 if missing" },
    { from: "app", to: "queue", label: "count later", style: "async" },
  ],
  scenarios: [
    {
      id: "without",
      name: "No cache",
      steps: [
        { edge: "client>app", caption: "A crowd clicks the same short link.", with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }], mark: [{ node: "app", state: "busy" }] },
        { edge: "app>db", caption: "Every click becomes a Postgres lookup.", with: [{ edge: "app>db", caption: "" }, { edge: "app>db", caption: "" }], mark: [{ node: "db", state: "busy" }] },
        { edge: "app>db", reverse: true, tone: "error", caption: "At 4,000 a second the database starts to sweat.", mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "with",
      name: "With Redis",
      steps: [
        { edge: "client>app", caption: "The same crowd clicks the same link.", mark: [{ node: "db", state: null }, { node: "app", state: null }] },
        { edge: "app>redis", caption: "The app asks Redis first." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Found it in about 1 ms. Postgres is never touched.", mark: [{ node: "redis", state: "hit" }] },
        { edge: "client>app", reverse: true, tone: "ok", caption: "The browser is redirected." },
        { edge: "app>redis", tone: "miss", caption: "A rare old link is not in Redis.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "Only misses reach Postgres, then Redis keeps the answer." },
      ],
    },
    {
      id: "clicks",
      name: "Count clicks",
      steps: [
        { edge: "client>app", caption: "A click arrives and the app finds the long URL." },
        { edge: "app>queue", caption: "It drops a click note on a queue and does not wait.", with: [{ edge: "client>app", reverse: true, caption: "" }] },
        { edge: "client>app", reverse: true, tone: "ok", caption: "The user is already redirected. Counting never slows the redirect." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  learn: [
    {
      head: "What a URL shortener does",
      body: "It swaps a long web address for a short code, then sends anyone who opens the code to the long address. That forward step is called a redirect.",
      eg: "A coat check ticket",
      example: "You hand over a bulky coat and get a small numbered ticket. Showing the ticket later brings back exactly that coat.",
    },
    {
      head: "Far more clicks than links",
      body: "A link is created once but clicked again and again. About 40 new links a second turn into 4,000 redirects a second, so reading is the real load.",
      eg: "A shared party invite",
      example: "One person writes the invite link, then posts it in a group of hundreds. Everyone taps it, many more than once.",
      doodle: "cache",
    },
    {
      head: "Where short codes come from",
      body: "A counter hands out numbers in order, written with 62 symbols: digits and lower and upper case letters. Seven symbols give 3.5 trillion codes, more than enough.",
      eg: "Deli ticket numbers",
      example: "The machine at a deli counter prints the next number for each customer. Two people never get the same one, and nobody has to check.",
    },
    {
      head: "Keep popular links close",
      body: "Hot links are kept in a fast memory cache, so most clicks never reach the database. Only links nobody has opened lately need a database lookup.",
      eg: "Speed dial on a phone",
      example: "You save the five numbers you call most on speed dial. For anyone else you search your full contact list, which takes longer.",
    },
    {
      head: "Count clicks off to the side",
      body: "Analytics must never slow a redirect. Each click drops a small note on a queue, and a separate worker adds them up later.",
      eg: "A turnstile counter",
      example: "A stadium turnstile clicks a counter as each person passes. Nobody stops at the gate to fill in a form.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "Every click asks the database",
      line: "A short link is shared, then clicked again and again. Each click is the same lookup.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum first",
      line: "100 million new links a month is only 40 writes a second. Reads are the load.",
      scene: {
        kind: "sum",
        rows: [
          { label: "New links", value: "40 a second" },
          { label: "Redirects per link", value: "100" },
        ],
        result: { label: "Redirects", value: "4,000 a second" },
        verdict: { text: "The read path is the game", tone: "warn" },
      },
    },
    {
      tag: "sum",
      head: "When do you need Redis?",
      line: "Drag the redirect rate. A private link tool with 1,000 clicks a day needs none.",
      scene: {
        kind: "meter",
        label: "Redirects per second",
        unit: "redirects/s",
        min: 1,
        max: 100000,
        start: 40,
        log: true,
        stops: [
          { upTo: 100, verdict: "One database, no cache.", tone: "good" },
          { upTo: 10000, verdict: "Add Redis. The database would sweat.", tone: "warn" },
          { upTo: 100000, verdict: "CDN and Redis, no choice.", tone: "bad" },
        ],
      },
      predict: { q: "At 40 redirects a second, add Redis?", options: ["Yes, always", "No, one database copes"], answer: 1, why: "40 a second is tiny. The cache earns its place around 4,000." },
    },
    {
      tag: "idea",
      head: "Ask the fast copy first",
      line: "Hot links sit in Redis. At 95% hits, Postgres sees only 200 reads a second.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "choose",
      head: "Where do short codes come from?",
      line: "Seven base62 characters give 3.5 trillion codes. The question is how you pick one.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Counter, scrambled", tone: "good", why: "Unique and short. Hand out ids in blocks." },
          { label: "Plain counter", tone: "bad", why: "1000, 1001, 1002 are easy to guess" },
          { label: "Hash, cut to 7", tone: "warn", why: "Collisions: check and retry" },
          { label: "Random + check", tone: "warn", why: "A uniqueness check on every insert" },
        ],
      },
    },
    {
      tag: "catch",
      head: "301 or 302?",
      line: "Browsers remember a 301, so repeat clicks never reach you. A 302 keeps them coming.",
      scene: {
        kind: "versus",
        left: { title: "301 moved for good", points: ["Fastest", "Clicks vanish", "Mistakes stay cached"] },
        right: { title: "302 try here", points: ["Every click reaches you", "Easy to change", "One extra trip"] },
      },
      predict: { q: "You promised click analytics. Which redirect?", options: ["301", "302"], answer: 1, why: "Only a 302 sends every click to your servers, so you can count it." },
    },
    {
      tag: "fix",
      head: "Count clicks off to the side",
      line: "A queue takes the note. The redirect never waits for analytics.",
      scene: { kind: "flow", spec: flow, scenario: "clicks" },
    },
    {
      tag: "catch",
      head: "One viral link",
      line: "A single link can overload one Redis node. A tiny cache on each app server helps.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Normal day", value: 4000, shown: "4K/s", tone: "good" },
          { label: "Peak", value: 12000, shown: "12K/s", tone: "warn" },
          { label: "Viral link", value: 50000, shown: "50K/s", tone: "bad" },
        ],
      },
    },
  ],
};

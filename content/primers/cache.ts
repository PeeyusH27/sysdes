import type { Primer } from "./types";

export const primer: Primer = {
  id: "cache",
  title: "What is a cache?",
  idea: "A cache is a small, fast place that keeps the answers asked for most, so you stop visiting the slow place.",
  doodle: "cache",
  analogy: "Sticky notes on your monitor: the answers you need most sit within arm's reach, so you rarely walk to the filing room.",
  flow: {
    id: "primer-cache",
    title: "A request with and without a cache",
    description: "A crowd asks the same questions. Without a cache every one reaches the slow database. With a cache most are answered by a fast copy.",
    nodes: [
      { id: "users", label: "Users", kind: "client", col: 0, row: 1 },
      { id: "app", label: "Your app", kind: "service", col: 1, row: 1 },
      { id: "cache", label: "Fast copy", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
      { id: "db", label: "Slow database", kind: "database", col: 2, row: 2, sub: "~50 ms" },
    ],
    edges: [
      { from: "users", to: "app" },
      { from: "app", to: "cache", label: "1 check" },
      { from: "app", to: "db", label: "2 if missing" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a cache",
        steps: [
          {
            edge: "users>app",
            caption: "A crowd asks for the same product page.",
            with: [{ edge: "users>app", caption: "" }, { edge: "users>app", caption: "" }],
            mark: [{ node: "app", state: "busy" }],
          },
          {
            edge: "app>db",
            caption: "Every single request goes to the slow database.",
            with: [{ edge: "app>db", caption: "" }, { edge: "app>db", caption: "" }],
            mark: [{ node: "db", state: "busy" }],
          },
          { edge: "app>db", reverse: true, tone: "error", caption: "Each answer takes 50 ms, and the line keeps growing.", mark: [{ node: "db", state: "down" }] },
          { edge: "users>app", reverse: true, tone: "error", caption: "Users wait, though the answer was the same every time." },
        ],
      },
      {
        id: "with",
        name: "With a cache",
        steps: [
          {
            edge: "users>app",
            caption: "The same crowd asks for the same page.",
            with: [{ edge: "users>app", caption: "" }, { edge: "users>app", caption: "" }],
            mark: [{ node: "app", state: null }, { node: "db", state: null }],
          },
          { edge: "app>cache", caption: "The app checks the fast copy first." },
          { edge: "app>cache", reverse: true, tone: "ok", caption: "Found it. The answer returns in about 1 ms.", mark: [{ node: "cache", state: "hit" }] },
          { edge: "users>app", reverse: true, tone: "ok", caption: "Most users are served without the database being touched." },
          { edge: "app>cache", tone: "miss", caption: "A rare page is not in the copy. That is a miss.", mark: [{ node: "cache", state: "miss" }] },
          { edge: "app>db", caption: "Only now does the app ask the slow database." },
          { edge: "app>cache", caption: "The app saves the answer for next time.", mark: [{ node: "cache", state: "hit" }] },
        ],
      },
      {
        id: "stale",
        name: "When the copy is old",
        steps: [
          { edge: "app>db", caption: "Someone changes the product price in the database.", mark: [{ node: "cache", state: null }] },
          { edge: "app>cache", reverse: true, tone: "error", caption: "The fast copy still holds the old price.", mark: [{ node: "cache", state: "down" }] },
          { edge: "users>app", reverse: true, tone: "error", caption: "Users see the old price until the copy is refreshed." },
          { edge: "app>cache", tone: "ok", caption: "Fix: remove the old copy, or give it a short expiry.", mark: [{ node: "cache", state: null }] },
        ],
      },
    ],
  },
  remember: [
    "A cache is a fast copy kept close to the app.",
    "Most requests are answered without touching the slow database.",
    "It trades freshness for speed: the copy can be old.",
  ],
  whenToUse: "When the same read repeats thousands of times a minute and the answer rarely changes. Not for data nobody asks twice.",
  theCatch: "Someone changes a price, but the copy still shows the old one, and shoppers see it until the copy expires.",
  say: "I would cache hot reads in front of the database. It cuts latency and load, and I would use expiry or delete on write to limit stale data.",
  learnMore: [
    { href: "/learn/caching", label: "Caching" },
    { href: "/deep-dives/caching-techniques", label: "Caching techniques" },
  ],
};

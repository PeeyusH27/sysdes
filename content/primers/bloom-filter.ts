import type { Primer } from "./types";

export const primer: Primer = {
  id: "bloom-filter",
  title: "What is a Bloom filter?",
  idea: "A tiny, quick check that says \"definitely not here\" or \"maybe here\", so you skip slow lookups for missing things.",
  doodle: "bloom-filter",
  analogy:
    "A bouncer with a bit array: he can say 'definitely not on the list' or 'maybe', but he never wrongly turns away someone who is on it.",
  flow: {
    id: "primer-bloom-filter",
    title: "A filter in front of the database",
    description: "Bots ask for ids that do not exist. A filter in memory answers before the database does.",
    nodes: [
      { id: "client", label: "Bots and users", kind: "client", col: 0, row: 1 },
      { id: "app", label: "Your app", kind: "service", col: 1, row: 1 },
      { id: "filter", label: "Bloom filter", kind: "cache", col: 2, row: 0 },
      { id: "db", label: "Database", kind: "database", col: 2, row: 2 },
    ],
    edges: [
      { from: "client", to: "app" },
      { from: "app", to: "filter", label: "quick check" },
      { from: "app", to: "db", label: "slow lookup" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a filter",
        steps: [
          {
            edge: "client>app",
            caption: "Bots ask for thousands of ids that do not exist.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
            mark: [{ node: "app", state: "busy" }],
          },
          {
            edge: "app>db",
            caption: "Each one goes to the database to be checked.",
            with: [{ edge: "app>db", caption: "" }, { edge: "app>db", caption: "" }],
            mark: [{ node: "db", state: "busy" }],
          },
          {
            edge: "app>db",
            reverse: true,
            tone: "miss",
            caption: "Not found, every time. The database still did the work.",
            with: [{ edge: "app>db", reverse: true, tone: "miss", caption: "" }],
          },
          {
            edge: "client>app",
            reverse: true,
            tone: "error",
            caption: "Real customers wait behind the pointless lookups.",
            mark: [{ node: "db", state: "down" }],
          },
        ],
      },
      {
        id: "with",
        name: "With a filter",
        steps: [
          {
            edge: "client>app",
            caption: "The same bots ask for ids that do not exist.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
          },
          { edge: "app>filter", caption: "The app first asks a tiny filter held in memory." },
          {
            edge: "app>filter",
            reverse: true,
            tone: "ok",
            caption: "Definitely not here, says the filter. It never wrongly says no.",
            mark: [{ node: "filter", state: "hit" }],
          },
          {
            edge: "client>app",
            reverse: true,
            tone: "ok",
            caption: "The app answers not found without touching the database.",
          },
          {
            edge: "app>filter",
            reverse: true,
            caption: "A real id arrives, and the filter answers maybe.",
            mark: [{ node: "filter", state: null }],
          },
          { edge: "app>db", caption: "Only a maybe goes on to the database to be checked." },
          { edge: "app>db", reverse: true, tone: "ok", caption: "Found. The database answers for the real one." },
        ],
      },
      {
        id: "maybe",
        name: "When it says maybe wrongly",
        steps: [
          { edge: "app>filter", caption: "The app asks about an id that does not exist." },
          {
            edge: "app>filter",
            reverse: true,
            tone: "miss",
            caption: "Maybe, says the filter. Other ids had already set the same bits.",
            mark: [{ node: "filter", state: "miss" }],
          },
          { edge: "app>db", caption: "So the app checks the database, as it does for any maybe." },
          {
            edge: "app>db",
            reverse: true,
            tone: "miss",
            caption: "Not found. A false alarm costs one lookup, never a wrong no.",
            mark: [{ node: "filter", state: null }],
          },
        ],
      },
    ],
  },
  remember: [
    "It says definitely not, or maybe.",
    "It never wrongly says no to something that is there.",
    "It is tiny, because it stores bits, not the items.",
  ],
  whenToUse: "When most lookups find nothing, like bots guessing ids, and each database check is slow. Not when most lookups succeed.",
  theCatch: "It sometimes says maybe for ids that do not exist, wasting a lookup, and plain ones cannot delete items.",
  say: "I would put a Bloom filter in front of the database: a no is certain, a maybe still gets checked, so false positives only cost one extra lookup.",
  learnMore: [{ href: "/deep-dives/caching-techniques", label: "Caching techniques" }],
};

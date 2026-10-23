import type { Primer } from "./types";

export const primer: Primer = {
  id: "cap",
  title: "What is the CAP theorem?",
  idea: "When two copies of your data lose contact, you must pick: refuse to answer, or answer with maybe-old data.",
  doodle: "cap",
  analogy:
    "Picture a triangle: always right, always answering, survives a split. When the split hits, you keep only one of the first two.",
  flow: {
    id: "primer-cap",
    title: "Two copies, one broken link",
    description: "A writer updates Copy A while the link to Copy B is broken, and a reader asks Copy B.",
    nodes: [
      { id: "writer", label: "You", kind: "client", col: 0, row: 1 },
      { id: "a", label: "Copy A", kind: "database", col: 1, row: 1 },
      { id: "b", label: "Copy B", kind: "database", col: 2, row: 1 },
      { id: "reader", label: "A friend", kind: "client", col: 3, row: 1 },
    ],
    edges: [
      { from: "writer", to: "a" },
      { from: "a", to: "b", label: "keeps in sync", style: "replication" },
      { from: "reader", to: "b" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a plan",
        steps: [
          { edge: "writer>a", caption: "You change your balance from 100 to 50 on Copy A." },
          {
            edge: "a>b",
            tone: "error",
            caption: "The link between the copies breaks. The news never arrives.",
          },
          { edge: "reader>b", caption: "A friend asks Copy B for your balance." },
          {
            edge: "reader>b",
            reverse: true,
            tone: "error",
            caption: "Copy B answers 100. That is old, and nobody knows it is wrong.",
            mark: [{ node: "b", state: "miss" }],
          },
        ],
      },
      {
        id: "with",
        name: "With correctness first",
        steps: [
          { edge: "writer>a", caption: "A bank picks right over available. You set the balance to 50." },
          {
            edge: "a>b",
            tone: "error",
            caption: "The link breaks again. Copy B cannot be sure it is up to date.",
            mark: [{ node: "b", state: "busy" }],
          },
          { edge: "reader>b", caption: "A friend asks Copy B for your balance." },
          {
            edge: "reader>b",
            reverse: true,
            tone: "error",
            caption: "Copy B says: try again later. No answer, but no wrong answer.",
          },
          {
            edge: "a>b",
            tone: "ok",
            caption: "The link heals and Copy B catches up to 50.",
            mark: [{ node: "b", state: "hit" }],
          },
          {
            edge: "reader>b",
            reverse: true,
            tone: "ok",
            caption: "Now it answers 50. Correct, just late.",
            mark: [{ node: "b", state: null }],
          },
        ],
      },
      {
        id: "feed",
        name: "When a feed picks answers",
        steps: [
          { edge: "writer>a", caption: "A social feed picks answering. Copy A counts a new like." },
          { edge: "a>b", tone: "error", caption: "The link breaks. Copy B misses the new like." },
          { edge: "reader>b", caption: "A friend asks Copy B for the like count." },
          {
            edge: "reader>b",
            reverse: true,
            tone: "ok",
            caption: "Copy B answers with the old count. Slightly stale, but it answers.",
            mark: [{ node: "b", state: "hit" }],
          },
          { edge: "a>b", tone: "ok", caption: "Later the link heals and Copy B catches up.", mark: [{ node: "b", state: null }] },
        ],
      },
    ],
  },
  remember: [
    "Network splits happen, so you choose during one.",
    "Pick right and refuse, or answer and maybe be old.",
    "With no split, you can have both.",
  ],
  whenToUse: "Whenever data lives on several machines. For money, pick correct and refuse; for a like count, answer with maybe-old data.",
  theCatch: "Pick correct and a split makes the bank app say try later; pick answering and a feed shows old counts.",
  say: "CAP only bites during a network partition. Then I pick per feature: consistency for money, availability for feeds, and I say what users will see.",
  learnMore: [{ href: "/learn/consistency-cap", label: "Consistency and CAP" }],
};

import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two doctors leave at once",
      line: "Each checks that two are on call, then each goes off. Both commits succeed.",
      scene: {
        kind: "versus",
        left: { title: "Each transaction", points: ["Sees a count of 2", "Takes its doctor off"] },
        right: { title: "The result", points: ["Nobody on call", "No error raised"] },
      },
      predict: { q: "Does snapshot isolation stop this?", options: ["Yes", "No"], answer: 1, why: "They write different rows, so there is no write conflict to detect." },
    },
    {
      tag: "idea",
      head: "ACID is four mechanisms",
      line: "Each letter has a different thing behind it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Atomicity", tone: "info", why: "Undo information and the log" },
          { label: "Consistency", tone: "info", why: "Constraints, plus your code" },
          { label: "Isolation", tone: "info", why: "Locks or MVCC" },
          { label: "Durability", tone: "info", why: "Log flushed before commit" },
        ],
      },
    },
    {
      tag: "sum",
      head: "The lost update",
      line: "Both read the balance, both add 50, and one write overwrites the other.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Both read", value: "100" },
          { label: "Each adds", value: "50" },
        ],
        result: { label: "Final balance", value: "150, not 200" },
        verdict: { text: "One update was lost", tone: "bad" },
      },
    },
    {
      tag: "fix",
      head: "MVCC keeps old versions",
      line: "A write adds a version. Readers keep using the one from their snapshot.",
      scene: {
        kind: "versus",
        left: { title: "Reader", points: ["Uses its snapshot", "Never waits"] },
        right: { title: "Writer", points: ["Adds a new version", "Does not block readers"] },
      },
    },
    {
      tag: "choose",
      head: "Pick an isolation level",
      line: "Each level allows fewer surprises and costs more retries.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Read committed", tone: "warn", why: "Stops dirty reads only" },
          { label: "Repeatable read", tone: "warn", why: "Stable snapshot; write skew remains" },
          { label: "Serializable", tone: "good", why: "Stops all; you must retry" },
        ],
      },
      predict: { q: "Which level stops write skew?", options: ["Repeatable read", "Serializable"], answer: 1, why: "Only serializable aborts one of two transactions that conflict through what they read." },
    },
    {
      tag: "catch",
      head: "Keep transactions short",
      line: "Locks and old versions are held until commit.",
      scene: {
        kind: "meter",
        label: "Time inside a transaction",
        unit: "seconds",
        min: 0.01,
        max: 60,
        start: 0.05,
        log: true,
        stops: [
          { upTo: 0.5, verdict: "Short: locks are brief.", tone: "good" },
          { upTo: 5, verdict: "Others start to wait.", tone: "warn" },
          { upTo: 60, verdict: "Blocks writers and cleanup.", tone: "bad" },
        ],
      },
    },
  ],
};

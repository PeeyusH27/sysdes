import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A customer moves",
      line: "Their city is copied onto every order. Update them all, or the data disagrees.",
      scene: {
        kind: "versus",
        left: { title: "City on each order", points: ["10 orders repeat it", "Update 10 rows"] },
        right: { title: "One update fails", points: ["Rows disagree", "Which city is right?"] },
      },
    },
    {
      tag: "idea",
      head: "Normal forms, simply",
      line: "Each step removes one kind of repetition.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "1NF", tone: "info", why: "One value per column" },
          { label: "2NF", tone: "info", why: "No part-of-key dependency" },
          { label: "3NF", tone: "info", why: "Non-key columns depend on the key" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Normalize, then copy on purpose",
      line: "Copy a fact only for a measured hot read, and plan how it stays correct.",
      scene: {
        kind: "versus",
        left: { title: "Normalized", points: ["Change one place", "Reads need joins"] },
        right: { title: "Denormalized", points: ["One-row reads", "Copies can go stale"] },
      },
    },
    {
      tag: "sum",
      head: "What a join costs",
      line: "The same result, very different work.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Users", value: "100" },
          { label: "Orders", value: "1,000" },
          { label: "Nested loop", value: "100,000 steps" },
        ],
        result: { label: "Hash join", value: "1,100 steps" },
        verdict: { text: "Same rows, far less work", tone: "good" },
      },
      predict: { q: "Which join does fewer steps here?", options: ["Nested loop", "Hash join"], answer: 1, why: "Hash join builds a table of 100 and probes it 1,000 times." },
    },
    {
      tag: "fix",
      head: "Pick the join type",
      line: "The type decides what happens to rows with no match.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "INNER", tone: "info", why: "Only matching rows" },
          { label: "LEFT", tone: "info", why: "All left rows, NULLs if none" },
          { label: "Anti-join", tone: "info", why: "Left rows with no match" },
          { label: "CROSS", tone: "warn", why: "Every pair: n times m" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Joins on sharded data",
      line: "Rows on different machines make a join a network trip.",
      scene: {
        kind: "versus",
        left: { title: "Co-located rows", points: ["Join stays local", "Shard by one key"] },
        right: { title: "Spread out rows", points: ["Network per join", "Broadcast or denormalize"] },
      },
    },
  ],
};

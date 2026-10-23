import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/splitwise/diagrams";

// Ann owes Ben 10 and Ben owes Cam 10. "pairs" settles each debt; "net" settles from the net balances.
const debts: FlowSpec = {
  id: "story-splitwise",
  title: "Two debts in a chain",
  description: "Ann owes Ben, and Ben owes Cam. Ben's own net is zero.",
  nodes: [
    { id: "ann", label: "Ann", kind: "client", col: 0, row: 1 },
    { id: "ben", label: "Ben", kind: "client", col: 1, row: 0 },
    { id: "cam", label: "Cam", kind: "client", col: 2, row: 1 },
  ],
  edges: [
    { from: "ann", to: "ben" },
    { from: "ben", to: "cam" },
    { from: "ann", to: "cam" },
  ],
  scenarios: [
    {
      id: "pairs",
      name: "Pay each debt",
      steps: [
        { edge: "ann>ben", caption: "Ann owes Ben 10." },
        { edge: "ben>cam", caption: "Ben owes Cam 10." },
        { edge: "ann>ben", reverse: true, tone: "miss", caption: "Two payments settle both debts." },
      ],
    },
    {
      id: "net",
      name: "Pay from the nets",
      steps: [
        { edge: "ann>cam", caption: "Nets: Ann owes 10, Ben 0, Cam is owed 10.", mark: [{ node: "ben", state: "ok" }] },
        { edge: "ann>cam", tone: "ok", caption: "Ann pays Cam 10 directly." },
        { edge: "ann>cam", reverse: true, tone: "ok", caption: "One payment settles everyone." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The stray cent",
      line: "Split 1001 cents three ways, and cents vanish.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Bill", value: "1001" },
          { label: "People", value: "3" },
          { label: "Each, rounded down", value: "333" },
        ],
        result: { label: "Cents lost", value: "2" },
        verdict: { text: "The books do not balance", tone: "bad" },
      },
    },
    {
      tag: "choose",
      head: "Hand the leftover out",
      line: "Pick a rule that always adds back to the bill.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Decimals", tone: "bad", why: "Floats drift and lose cents" },
          { label: "Drop the cent", tone: "bad", why: "Shares sum to less" },
          { label: "Leftover to first", tone: "good", why: "334, 334, 333 adds to 1001" },
          { label: "Random person", tone: "warn", why: "Not repeatable" },
        ],
      },
      predict: { q: "1001 cents split equally among 3. Shares?", options: ["333, 333, 333", "334, 334, 333"], answer: 1, why: "Floors give 333 each. The two spare cents go to the first two people." },
    },
    {
      tag: "idea",
      head: "Each split is a strategy",
      line: "Equal, exact, percent and shares all return one share per person.",
      scene: { kind: "classes", spec: classes, stage: 2 },
    },
    {
      tag: "idea",
      head: "Debts form chains",
      line: "Paying each debt alone costs two payments.",
      scene: { kind: "flow", spec: debts, scenario: "pairs" },
    },
    {
      tag: "fix",
      head: "Simplify from the nets",
      line: "Pay the biggest debtor to the biggest creditor.",
      scene: { kind: "flow", spec: debts, scenario: "net" },
      predict: { q: "Ann owes Ben 10, Ben owes Cam 10. Payments needed?", options: ["Two", "One"], answer: 1, why: "Ben's net is zero, so Ann can pay Cam directly." },
    },
    {
      tag: "catch",
      head: "Two people settle at once",
      line: "Both tap pay on the same debt.",
      scene: {
        kind: "versus",
        left: { title: "Read, then subtract", points: ["Both see 100 owed", "Both pay", "The debt flips sign"] },
        right: { title: "One locked step", points: ["Check and subtract together", "The second sees 0", "It fails cleanly"] },
      },
    },
  ],
};

import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/atm/diagrams";

// A withdrawal of 100 that meets a jammed cash unit. "naive" debits first and has no undo; "safe" plans, debits, dispenses and undoes.
const withdraw: FlowSpec = {
  id: "story-atm",
  title: "A withdrawal meets a jam",
  description: "The customer asks for 100. The ATM talks to the account and to the cash unit.",
  nodes: [
    { id: "cust", label: "Customer", kind: "client", col: 0, row: 1 },
    { id: "atm", label: "ATM", kind: "service", col: 1, row: 1 },
    { id: "acct", label: "Account", kind: "database", col: 2, row: 0 },
    { id: "cash", label: "Cash unit", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "cust", to: "atm" },
    { from: "atm", to: "acct" },
    { from: "atm", to: "cash" },
  ],
  scenarios: [
    {
      id: "naive",
      name: "Debit, no undo",
      steps: [
        { edge: "cust>atm", caption: "Withdraw 100." },
        { edge: "atm>acct", caption: "The ATM debits 100 straight away." },
        { edge: "atm>cash", tone: "error", caption: "The cash unit jams.", mark: [{ node: "cash", state: "down" }] },
        { edge: "cust>atm", reverse: true, tone: "error", caption: "The customer is charged and gets no cash." },
      ],
    },
    {
      id: "safe",
      name: "Plan, debit, undo",
      steps: [
        { edge: "cust>atm", caption: "Withdraw 100. The ATM plans the notes first; nothing changes.", mark: [{ node: "cash", state: null }] },
        { edge: "atm>acct", caption: "Debit 100 in one locked step." },
        { edge: "atm>cash", caption: "Ask the cash unit to pay out the planned notes." },
        { edge: "atm>cash", reverse: true, tone: "error", caption: "It jams.", mark: [{ node: "cash", state: "down" }] },
        { edge: "atm>acct", tone: "ok", caption: "Credit the 100 back." },
        { edge: "cust>atm", reverse: true, tone: "ok", caption: "Rejected. Nothing was charged." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Charged, but no cash",
      line: "Debit first, then a jam, and the money is gone.",
      scene: { kind: "flow", spec: withdraw, scenario: "naive" },
      predict: { q: "The cash jams after the debit. The customer pays?", options: ["Yes, unless undone", "No, the bank refunds itself"], answer: 0, why: "Nothing undoes the debit unless the design does it." },
    },
    {
      tag: "fix",
      head: "Plan, debit, dispense, undo",
      line: "Plan changes nothing. Undo only the step that moved money.",
      scene: { kind: "flow", spec: withdraw, scenario: "safe" },
    },
    {
      tag: "sum",
      head: "Greedy gets stuck",
      line: "Biggest note first can strand a remainder.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Owed", value: "60" },
          { label: "Stock", value: "1×50, 3×20" },
          { label: "Greedy takes", value: "50" },
        ],
        result: { label: "Left over", value: "10" },
        verdict: { text: "Stuck, though 3×20 works", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Each step has its own events",
      line: "Idle, card in, authenticated. Unlisted events are rejected.",
      scene: { kind: "classes", spec: classes, stage: 1 },
    },
    {
      tag: "choose",
      head: "Chain or plain loop?",
      line: "Both backtrack. Pick by what the notes need.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Four fixed notes", tone: "warn", why: "A loop is enough" },
          { label: "Rules per note", tone: "good", why: "Each handler owns its rule" },
          { label: "Greedy only", tone: "bad", why: "Strands cash when stock is low" },
          { label: "Backtracking", tone: "good", why: "Finds 3×20 for 60" },
        ],
      },
      predict: { q: "Four fixed notes, no special rules. Build a chain?", options: ["Yes, always", "No, a loop does it"], answer: 1, why: "A pattern needs a reason. Equal handlers are just a loop." },
    },
    {
      tag: "catch",
      head: "Where the PIN count lives",
      line: "A session counter resets on the next card insert.",
      scene: {
        kind: "versus",
        left: { title: "In the session", points: ["Resets on eject", "Try 3 PINs per machine"] },
        right: { title: "On the account", points: ["Survives eject", "Shared by all machines", "Updated under its lock"] },
      },
    },
  ],
};

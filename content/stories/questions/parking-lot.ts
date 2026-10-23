import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A small picture of two gates and one list of free spots. "race" is check-then-take, "safe" is one atomic take(),
// "crash" is a gate dying between marking the spot and printing the ticket.
const lot: FlowSpec = {
  id: "story-parking-lot",
  title: "Two gates and one free spot",
  description: "Two gate servers ask the lot for the last free spot. The lot keeps a free list per spot type.",
  nodes: [
    { id: "g1", label: "Gate 1", kind: "client", col: 0, row: 0 },
    { id: "g2", label: "Gate 2", kind: "client", col: 0, row: 2 },
    { id: "lot", label: "Parking lot", kind: "service", col: 1, row: 1 },
    { id: "free", label: "Free spots", kind: "cache", col: 2, row: 1, sub: "0-C3 is last" },
  ],
  edges: [
    { from: "g1", to: "lot" },
    { from: "g2", to: "lot" },
    { from: "lot", to: "free" },
  ],
  scenarios: [
    {
      id: "race",
      name: "Check, then take",
      steps: [
        { edge: "g1>lot", caption: "Two cars reach two gates together.", with: [{ edge: "g2>lot", caption: "" }] },
        { edge: "lot>free", caption: "Both ask: is spot 0-C3 free?", with: [{ edge: "lot>free", caption: "" }] },
        { edge: "lot>free", reverse: true, tone: "ok", caption: "Both hear yes.", with: [{ edge: "lot>free", reverse: true, tone: "ok", caption: "" }] },
        { edge: "g1>lot", reverse: true, tone: "error", caption: "Both get a ticket for 0-C3.", with: [{ edge: "g2>lot", reverse: true, tone: "error", caption: "" }], mark: [{ node: "free", state: "down" }] },
        { edge: "lot>free", tone: "error", caption: "Two cars, one spot." },
      ],
    },
    {
      id: "safe",
      name: "One atomic take",
      steps: [
        { edge: "g1>lot", caption: "The same two cars arrive together.", with: [{ edge: "g2>lot", caption: "" }], mark: [{ node: "free", state: null }] },
        { edge: "lot>free", caption: "take() picks a spot and removes it in one step." },
        { edge: "lot>free", reverse: true, tone: "ok", caption: "The first car gets 0-C3.", mark: [{ node: "free", state: "hit" }] },
        { edge: "g1>lot", reverse: true, tone: "ok", caption: "Ticket for 0-C3." },
        { edge: "lot>free", reverse: true, tone: "miss", caption: "The second car finds none left: lot full." },
        { edge: "g2>lot", reverse: true, tone: "miss", caption: "It is turned away." },
      ],
    },
    {
      id: "crash",
      name: "Gate crash",
      steps: [
        { edge: "g1>lot", caption: "A car arrives at gate 1." },
        { edge: "lot>free", caption: "The lot marks spot 0-C3 as taken.", mark: [{ node: "free", state: "busy" }] },
        { edge: "g1>lot", reverse: true, tone: "error", caption: "The gate crashes before the ticket prints.", mark: [{ node: "g1", state: "down" }] },
        { edge: "lot>free", tone: "error", caption: "No ticket owns the spot. It stays lost.", mark: [{ node: "free", state: "down" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two gates, one spot",
      line: "Two cars ask for the last free spot at once.",
      scene: { kind: "flow", spec: lot, scenario: "race" },
      predict: { q: "Two gates check, then take the last spot. What happens?", options: ["One car waits", "Both get the spot"], answer: 1, why: "Both checks run before either take, so both see it free." },
    },
    {
      tag: "sum",
      head: "Do the sum on the lot",
      line: "About 500 cars an hour is under one a second.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Floors", value: "5" },
          { label: "Spots per floor", value: "200" },
        ],
        result: { label: "Spots", value: "1,000" },
        verdict: { text: "One small process copes", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "Is a rule worth a class?",
      line: "Drag the pricing rules. Strategies pay off only as rules pile up.",
      scene: {
        kind: "meter",
        label: "Pricing rules",
        unit: "rules",
        min: 1,
        max: 6,
        start: 2,
        stops: [
          { upTo: 1.5, verdict: "Hourly only: one function.", tone: "good" },
          { upTo: 2.5, verdict: "Plus a daily cap: borderline, one if reads fine.", tone: "warn" },
          { upTo: 6, verdict: "Weekends, EV, monthly: use strategies.", tone: "info" },
        ],
      },
      predict: { q: "Hourly rate plus a daily cap. Strategy classes yet?", options: ["Yes, one per rule", "No, one if reads fine"], answer: 1, why: "Two rules still fit in one function. Weekend and EV rules tip it." },
    },
    {
      tag: "idea",
      head: "Take the spot in one step",
      line: "Keep a free list per spot type. take() picks and removes together.",
      scene: { kind: "flow", spec: lot, scenario: "safe" },
    },
    {
      tag: "choose",
      head: "Pick the allocation",
      line: "One process or many gates decides which one is safe.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Check, then take", tone: "bad", why: "Both gates see the spot free" },
          { label: "take() in one app", tone: "good", why: "Atomic for free in Node" },
          { label: "SKIP LOCKED in DB", tone: "good", why: "Picks and locks one row" },
          { label: "Scan all spots", tone: "warn", why: "Fine now; cost grows with the lot" },
        ],
      },
    },
    {
      tag: "catch",
      head: "A crash loses the spot",
      line: "Save the spot and ticket in one transaction. A cleanup job frees orphans.",
      scene: { kind: "flow", spec: lot, scenario: "crash" },
    },
    {
      tag: "skip",
      head: "Start plain, add later",
      line: "Too many classes costs points. Add structure when the need shows up.",
      scene: {
        kind: "versus",
        left: { title: "Plain code first", points: ["One pricing function", "One process, atomic take()", "Hourly rate only"] },
        right: { title: "Add structure when", points: ["Pricing rules keep arriving", "Several gates share a database"] },
      },
    },
  ],
};

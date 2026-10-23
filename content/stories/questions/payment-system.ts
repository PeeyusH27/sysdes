import { getPrimer } from "../../primers";
import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// The idempotency primer's picture (phone, shop, seen keys, card company) shows the double charge and its fix.
const tap = getPrimer("idempotency")!.flow;

// A small inline picture for the duplicate webhook: the same event arrives twice.
const webhook: FlowSpec = {
  id: "story-payment-webhook",
  title: "A webhook that arrives twice",
  description: "The card company resends a payment event. Without a check the ledger posts it twice.",
  nodes: [
    { id: "psp", label: "Card company", kind: "external", col: 0, row: 1 },
    { id: "hook", label: "Webhook handler", kind: "service", col: 1, row: 1 },
    { id: "ledger", label: "Ledger", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "psp", to: "hook" },
    { from: "hook", to: "ledger" },
  ],
  scenarios: [
    {
      id: "dup",
      name: "A duplicate webhook",
      steps: [
        { edge: "psp>hook", caption: "Event evt_9 arrives: paid $50." },
        { edge: "hook>ledger", caption: "The handler posts $50 to the ledger.", mark: [{ node: "ledger", state: "ok" }] },
        { edge: "psp>hook", tone: "miss", caption: "Our reply was slow, so the card company sends evt_9 again." },
        { edge: "hook>ledger", tone: "error", caption: "Without a check it posts again. The books say $100.", mark: [{ node: "ledger", state: "down" }] },
        { edge: "hook>ledger", tone: "ok", caption: "Fix: the event id is unique, so the repeat is dropped.", mark: [{ node: "ledger", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Tap twice, charged twice",
      line: "The reply is lost, so you tap again. The shop cannot tell a retry from a new order.",
      scene: { kind: "flow", spec: tap, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Speed is not the problem",
      line: "Even on Black Friday, one Postgres primary keeps up. The risk is being wrong, not slow.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Payments a day", value: "10 million" },
          { label: "Average a second", value: "116" },
          { label: "Black Friday peak", value: "10x" },
        ],
        result: { label: "Peak a second", value: "about 1,160" },
        verdict: { text: "One Postgres copes", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "Tiny error rates add up",
      line: "At 10 million payments a day, a rate that looks tiny is still a lot of wrong charges.",
      scene: {
        kind: "bars",
        bars: [
          { label: "0.001% errors", value: 100, shown: "100 a day", tone: "good" },
          { label: "0.01% errors", value: 1000, shown: "1,000 a day", tone: "warn" },
          { label: "0.1% errors", value: 10000, shown: "10,000 a day", tone: "bad" },
        ],
      },
    },
    {
      tag: "idea",
      head: "One key per checkout",
      line: "Each checkout gets its own key, and a retry reuses it. Watch what the shop does.",
      scene: { kind: "flow", spec: tap, scenario: "with" },
      predict: { q: "The same key arrives twice. How many charges?", options: ["Two", "One"], answer: 1, why: "The second request finds the saved result under the key, so the card is not charged again." },
    },
    {
      tag: "choose",
      head: "The PSP never answered",
      line: "After 10 seconds of silence, the card may or may not be charged. What do you write down?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Failed", tone: "bad", why: "The customer taps again and pays twice" },
          { label: "Succeeded", tone: "bad", why: "You may never have been paid" },
          { label: "Retry, new key", tone: "bad", why: "If the first charge worked, that is two" },
          { label: "Unknown", tone: "good", why: "Retry with the same key, let the webhook decide" },
        ],
      },
      predict: { q: "A 10 second timeout. Which status is safe?", options: ["Failed", "Unknown", "Succeeded"], answer: 1, why: "Only unknown admits you do not know, and the webhook or a status check settles it." },
    },
    {
      tag: "fix",
      head: "Keep a ledger, not a balance",
      line: "Money is recorded as entries that only get added. A balance is just their sum.",
      scene: {
        kind: "versus",
        left: { title: "Balance column", points: ["Edits overwrite history", "Hard to audit", "A bug loses cents"] },
        right: { title: "Ledger", points: ["Entries only get added", "Each entry set sums to zero", "Fixes are new entries"] },
      },
    },
    {
      tag: "catch",
      head: "Webhooks arrive twice too",
      line: "One charge can be posted twice. Only the daily reconciliation would notice.",
      scene: { kind: "flow", spec: webhook, scenario: "dup" },
    },
  ],
};

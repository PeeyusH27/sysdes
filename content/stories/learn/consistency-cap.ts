import { leaderReplication } from "../../learn/06-consistency-cap/diagrams";
import { getPrimer } from "../../primers";
import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// The CAP primer shows the problem. The page's leader diagram plays both choices of one split.
const cap = getPrimer("cap")!.flow;

// A small inline picture for the fencing token: a paused client wakes up and overwrites the new lock owner.
const lock: FlowSpec = {
  id: "story-fenced-lock",
  title: "A paused client and an expired lock",
  description: "Client 1 takes a lock, freezes, and its lock expires. Client 2 takes the lock. Storage must reject Client 1 when it wakes.",
  nodes: [
    { id: "c1", label: "Client 1", kind: "client", col: 0, row: 0 },
    { id: "c2", label: "Client 2", kind: "client", col: 0, row: 2 },
    { id: "lock", label: "Lock service", kind: "external", col: 1, row: 1, sub: "10 s lease" },
    { id: "store", label: "Storage", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "c1", to: "lock" },
    { from: "c2", to: "lock" },
    { from: "c1", to: "store" },
    { from: "c2", to: "store" },
  ],
  scenarios: [
    {
      id: "pause",
      name: "Pause, expiry, overwrite",
      steps: [
        { edge: "c1>lock", caption: "Client 1 takes a 10 second lock.", mark: [{ node: "c1", state: "ok" }] },
        { edge: "c1>lock", tone: "error", caption: "Client 1 freezes for 15 seconds. The lock expires.", mark: [{ node: "c1", state: "busy" }] },
        { edge: "c2>lock", caption: "Client 2 takes the lock.", mark: [{ node: "c2", state: "ok" }] },
        { edge: "c2>store", tone: "ok", caption: "Client 2 writes safely." },
        { edge: "c1>store", tone: "error", caption: "Client 1 wakes, still thinks it holds the lock, and overwrites.", mark: [{ node: "store", state: "down" }, { node: "c1", state: null }] },
        { edge: "c1>store", reverse: true, tone: "ok", caption: "Fix: each lock grant has a rising token. Storage rejects the old one.", mark: [{ node: "store", state: null }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two copies disagree",
      line: "A link breaks mid-update. The far copy answers 100, and nobody knows it is wrong.",
      scene: { kind: "flow", spec: cap, scenario: "without" },
    },
    {
      tag: "idea",
      head: "Choice one: refuse to be wrong",
      line: "The minority side says try later. No seat sells twice, but Bob waits.",
      scene: { kind: "flow", spec: leaderReplication, scenario: "cp" },
    },
    {
      tag: "idea",
      head: "Choice two: answer, merge later",
      line: "Both sides keep answering. Last-writer-wins drops the book; a set merge keeps both.",
      scene: { kind: "flow", spec: leaderReplication, scenario: "ap" },
    },
    {
      tag: "choose",
      head: "Pick per feature",
      line: "Do not pick one level for the whole product.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Balance, stock", tone: "bad", why: "Strong: stale means double-spend" },
          { label: "Your own edit", tone: "warn", why: "Read-your-writes: see your save" },
          { label: "Chat in a thread", tone: "warn", why: "Same order for everyone" },
          { label: "Likes and views", tone: "good", why: "Eventual: a few off is fine" },
        ],
      },
      predict: { q: "Which can safely show slightly stale data?", options: ["A bank balance", "A like count"], answer: 1, why: "A like count a few off hurts nobody. A stale balance lets you spend twice." },
    },
    {
      tag: "sum",
      head: "Fresh answers cost a trip",
      line: "Even with no split, waiting on a far leader adds up.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Reads per page", value: "5" },
          { label: "Far leader round trip", value: "~80 ms" },
        ],
        result: { label: "Page waits", value: "~400 ms" },
        verdict: { text: "Pay it for balances, not likes", tone: "warn" },
      },
    },
    {
      tag: "choose",
      head: "Quorums: R plus W over N",
      line: "N copies, W must confirm a write, R are asked on a read.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "N=3, W=2, R=2", tone: "good", why: "Balanced. One node can be down." },
          { label: "N=3, W=1, R=1", tone: "warn", why: "Fast, but reads may be stale" },
          { label: "N=5, W=3, R=2", tone: "bad", why: "3 + 2 is not more than 5" },
        ],
      },
      predict: { q: "Which setup can read a stale value?", options: ["N=3, W=2, R=2", "N=5, W=3, R=2"], answer: 1, why: "R + W must exceed N so every read overlaps the latest write. 3 + 2 does not exceed 5." },
    },
    {
      tag: "catch",
      head: "A paused client overwrites",
      line: "A lock with an expiry is not enough. Storage must check a token.",
      scene: { kind: "flow", spec: lock, scenario: "pause" },
    },
  ],
};

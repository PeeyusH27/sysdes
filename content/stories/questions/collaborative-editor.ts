import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: two edits merged by a server, and recovery from the log.
const merge: FlowSpec = {
  id: "story-docs-merge",
  title: "Two edits at once",
  description: "A appends s, B deletes c, both starting from 'cat'. The server rewrites the later edit so both screens end as 'ats'.",
  nodes: [
    { id: "a", label: "Editor A", kind: "client", col: 0, row: 0, sub: "adds s" },
    { id: "b", label: "Editor B", kind: "client", col: 0, row: 2, sub: "deletes c" },
    { id: "server", label: "Session server", kind: "service", col: 1, row: 1, sub: "one order" },
  ],
  edges: [
    { from: "a", to: "server" },
    { from: "b", to: "server" },
  ],
  scenarios: [
    {
      id: "merge",
      name: "Merge",
      steps: [
        { edge: "a>server", caption: "A types s after 'cat'. A sees 'cats' at once." },
        { edge: "b>server", caption: "B deletes c at the same moment. B sees 'at' at once." },
        { edge: "a>server", reverse: true, caption: "The server orders A first, then fits B's delete after it.", mark: [{ node: "server", state: "ok" }] },
        { edge: "b>server", reverse: true, tone: "ok", caption: "Both screens now show 'ats'. Nobody waited.", mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }] },
      ],
    },
  ],
};

const recover: FlowSpec = {
  id: "story-docs-recover",
  title: "Recover a document",
  description: "A new server loads the latest snapshot and replays the operation log after it.",
  nodes: [
    { id: "snap", label: "Snapshot", kind: "storage", col: 0, row: 0, sub: "revision 500" },
    { id: "log", label: "Operation log", kind: "database", col: 0, row: 2, sub: "to revision 537" },
    { id: "server", label: "New server", kind: "service", col: 1, row: 1 },
    { id: "editors", label: "Editors", kind: "client", col: 2, row: 1 },
  ],
  edges: [
    { from: "snap", to: "server" },
    { from: "log", to: "server" },
    { from: "server", to: "editors" },
  ],
  scenarios: [
    {
      id: "recover",
      name: "Recover",
      steps: [
        { edge: "snap>server", caption: "The old server died. The new one loads the snapshot at revision 500." },
        { edge: "log>server", caption: "It replays 37 logged edits, up to revision 537.", mark: [{ node: "server", state: "ok" }] },
        { edge: "server>editors", tone: "ok", caption: "Editors reconnect and resend anything unacknowledged. Nothing is lost." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two people, one sentence",
      line: "Both edit at the same moment. What should happen?",
      scene: {
        kind: "versus",
        left: { title: "Last write wins", points: ["A adds an s", "B deletes the c", "One edit overwrites the other"] },
        right: { title: "What users expect", points: ["Both edits survive", "Everyone sees the same text", "Typing never waits"] },
      },
    },
    {
      tag: "fix",
      head: "One order, fitted edits",
      line: "The server orders edits and rewrites the later one to fit.",
      scene: { kind: "flow", spec: merge, scenario: "merge" },
    },
    {
      tag: "sum",
      head: "How many editors?",
      line: "Drag the editors in one document. One server owns it.",
      scene: {
        kind: "meter",
        label: "Editors in a document",
        unit: "editors",
        min: 1,
        max: 2000,
        start: 3,
        log: true,
        stops: [
          { upTo: 50, verdict: "One server orders edits easily.", tone: "good" },
          { upTo: 500, verdict: "Still one server. Throttle cursors.", tone: "warn" },
          { upTo: 2000, verdict: "Fan out read-only viewers.", tone: "bad" },
        ],
      },
      predict: { q: "A typical document has how many editors?", options: ["About 3", "About 300"], answer: 0, why: "Most documents have a few editors. Traffic is high overall but tiny per document." },
    },
    {
      tag: "choose",
      head: "How to resolve conflicts",
      line: "Four ways to handle two people typing together.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Last write wins", tone: "bad", why: "Silently loses edits" },
          { label: "Lock a paragraph", tone: "warn", why: "Blocks people from typing" },
          { label: "OT with a server", tone: "good", why: "Compact; needs a server" },
          { label: "CRDT", tone: "good", why: "Works offline; uses more memory" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The server dies",
      line: "The log is the truth. Rebuild from it.",
      scene: { kind: "flow", spec: recover, scenario: "recover" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "Real-time merging is costly to build and test.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Lock the whole document", "Save and reload", "Last write wins on save"] },
        right: { title: "Add when", points: ["Live typing: OT or CRDT", "Offline work: CRDT", "Heavy use: snapshots and a log"] },
      },
    },
  ],
};

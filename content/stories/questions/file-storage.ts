import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: ask-then-upload, and a conflicting edit.
const delta: FlowSpec = {
  id: "story-files-delta",
  title: "Upload only what is new",
  description: "The client names chunks by hash, asks which the server lacks, and uploads just those.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "256 chunks" },
    { id: "meta", label: "Metadata", kind: "database", col: 1, row: 0, sub: "knows the hashes" },
    { id: "blocks", label: "Block store", kind: "storage", col: 1, row: 2 },
  ],
  edges: [
    { from: "client", to: "meta", label: "which are new?" },
    { from: "client", to: "blocks", label: "upload" },
  ],
  scenarios: [
    {
      id: "delta",
      name: "Delta",
      steps: [
        { edge: "client>meta", caption: "A paragraph was edited. The client sends 256 chunk hashes." },
        { edge: "client>meta", reverse: true, caption: "The server already has 255. One is new.", mark: [{ node: "meta", state: "ok" }] },
        { edge: "client>blocks", tone: "ok", caption: "Upload that one chunk: 4 MiB, not 1 GiB.", mark: [{ node: "blocks", state: "ok" }] },
      ],
    },
  ],
};

const conflict: FlowSpec = {
  id: "story-files-conflict",
  title: "Two edits, one revision",
  description: "Both devices edited revision 7. The first commit wins; the second is kept as a conflicted copy.",
  nodes: [
    { id: "laptop", label: "Laptop", kind: "client", col: 0, row: 0 },
    { id: "phone", label: "Phone", kind: "client", col: 0, row: 2 },
    { id: "meta", label: "Metadata", kind: "database", col: 1, row: 1, sub: "file at rev 7" },
  ],
  edges: [
    { from: "laptop", to: "meta", label: "base 7" },
    { from: "phone", to: "meta", label: "base 7" },
  ],
  scenarios: [
    {
      id: "conflict",
      name: "Conflict",
      steps: [
        { edge: "laptop>meta", tone: "ok", caption: "The laptop commits from revision 7. Accepted: revision 8.", mark: [{ node: "meta", state: "ok" }] },
        { edge: "phone>meta", caption: "The phone also commits from revision 7." },
        { edge: "phone>meta", reverse: true, tone: "error", caption: "Refused. The file moved on to revision 8.", mark: [{ node: "phone", state: "miss" }] },
        { edge: "phone>meta", tone: "ok", caption: "The phone saves a conflicted copy. Nothing is lost.", mark: [{ node: "phone", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One edit, one gigabyte",
      line: "Upload the whole file on every save and a big file crawls.",
      scene: {
        kind: "sum",
        rows: [
          { label: "File size", value: "1 GiB" },
          { label: "Edited chunk", value: "4 MiB" },
        ],
        result: { label: "Needed upload", value: "0.4%" },
        verdict: { text: "Sending it all is wasteful", tone: "bad" },
      },
      predict: { q: "Change one paragraph in 1 GiB. Chunks resent?", options: ["All 256", "Just 1"], answer: 1, why: "Only the chunk holding the edit has a new hash." },
    },
    {
      tag: "fix",
      head: "Name chunks by content",
      line: "Same bytes, same name. Ask first, then upload only the new.",
      scene: { kind: "flow", spec: delta, scenario: "delta" },
    },
    {
      tag: "choose",
      head: "Where to cut",
      line: "Insert one byte at the front. What happens to the chunks?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Fixed 4 MiB", tone: "warn", why: "Every boundary shifts" },
          { label: "Content-defined", tone: "good", why: "Cuts re-sync after the edit" },
          { label: "One chunk per file", tone: "bad", why: "No savings at all" },
        ],
      },
    },
    {
      tag: "sum",
      head: "Dedupe at scale",
      line: "Drag the storage. Does the chunk index still fit one machine?",
      scene: {
        kind: "meter",
        label: "Stored data",
        unit: "TB",
        min: 1,
        max: 200000,
        start: 100,
        log: true,
        stops: [
          { upTo: 1000, verdict: "The index fits on one database.", tone: "good" },
          { upTo: 20000, verdict: "Shard the chunk index by hash.", tone: "warn" },
          { upTo: 200000, verdict: "200 PB: about 3 TB of index, sharded.", tone: "bad" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Two edits at once",
      line: "Both devices were offline. Never overwrite silently.",
      scene: { kind: "flow", spec: conflict, scenario: "conflict" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "Add each piece when the product needs it.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Whole-file upload", "Last write wins", "Poll every minute"] },
        right: { title: "Add when", points: ["Big files: chunk and hash", "Teams: conflicted copies", "Many devices: poke and cursor"] },
      },
    },
  ],
};

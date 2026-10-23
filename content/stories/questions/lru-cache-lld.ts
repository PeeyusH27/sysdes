import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/lru-cache-lld/diagrams";

// A cache of three keys. "hit" is a get, "evict" is a put on a full cache.
const cache: FlowSpec = {
  id: "story-lru-cache",
  title: "A map and a list",
  description: "The map finds a key in one step. The list remembers which key was used longest ago.",
  nodes: [
    { id: "caller", label: "Caller", kind: "client", col: 0, row: 1 },
    { id: "cache", label: "Cache", kind: "service", col: 1, row: 1 },
    { id: "map", label: "Hash map", kind: "cache", col: 2, row: 0 },
    { id: "list", label: "Order list", kind: "queue", col: 2, row: 2 },
  ],
  edges: [
    { from: "caller", to: "cache" },
    { from: "cache", to: "map" },
    { from: "cache", to: "list" },
  ],
  scenarios: [
    {
      id: "hit",
      name: "A read",
      steps: [
        { edge: "caller>cache", caption: "get a. The cache holds a, b and c." },
        { edge: "cache>map", caption: "The map finds a's node in one step.", mark: [{ node: "map", state: "hit" }] },
        { edge: "cache>list", caption: "Move a to the front of the list. It is now the newest." },
        { edge: "caller>cache", reverse: true, tone: "ok", caption: "Return a's value." },
      ],
    },
    {
      id: "evict",
      name: "A full put",
      steps: [
        { edge: "caller>cache", caption: "put d. The cache is full, with a at the front and b at the back.", mark: [{ node: "map", state: null }] },
        { edge: "cache>list", tone: "miss", caption: "The back of the list is b, the oldest." },
        { edge: "cache>map", tone: "miss", caption: "Drop b from the map as well. Both stay in step." },
        { edge: "cache>list", tone: "ok", caption: "Insert d at the front." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Scanning for the oldest",
      line: "Without extra structure, every get walks every entry.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Entries", value: "100,000" },
          { label: "Calls a second", value: "1,000" },
        ],
        result: { label: "Steps a second", value: "100,000,000" },
        verdict: { text: "A scan does not scale", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "A map finds, a list orders",
      line: "Every read moves its key to the front of the list.",
      scene: { kind: "flow", spec: cache, scenario: "hit" },
      predict: { q: "After get a, where is a in the order?", options: ["Back, the oldest", "Front, the newest"], answer: 1, why: "A read is a use, so it becomes the most recent." },
    },
    {
      tag: "fix",
      head: "Evict from the back",
      line: "A full put removes the back key from both structures.",
      scene: { kind: "flow", spec: cache, scenario: "evict" },
    },
    {
      tag: "fix",
      head: "Make the order swappable",
      line: "LRU, FIFO and LFU answer one question: who goes next?",
      scene: { kind: "classes", spec: classes, stage: 2 },
    },
    {
      tag: "choose",
      head: "Do you need a policy class?",
      line: "Add the interface when a second rule is likely.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Only LRU asked", tone: "warn", why: "Inline list and map is clearer" },
          { label: "LFU also asked", tone: "good", why: "One interface, one class each" },
          { label: "Factory for two", tone: "bad", why: "A constructor argument is enough" },
          { label: "Policy holds data", tone: "bad", why: "The cache owns values; policy owns order" },
        ],
      },
      predict: { q: "The interviewer says just LRU. Build a policy interface?", options: ["Yes, always", "No, keep it inline"], answer: 1, why: "A strategy earns its place with a second rule, not before." },
    },
    {
      tag: "catch",
      head: "A read is also a write",
      line: "A hit relinks the list, so reads cannot share a lock.",
      scene: {
        kind: "versus",
        left: { title: "Shared read lock", points: ["Two hits relink at once", "The list can corrupt"] },
        right: { title: "One exclusive lock", points: ["Hits take turns", "The list stays valid", "Stripe keys to scale"] },
      },
    },
  ],
};

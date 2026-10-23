import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/logger/diagrams";

// One request that logs a line. "sync" writes to a slow disk inside the request, "async" queues the line first.
const flow: FlowSpec = {
  id: "story-logger",
  title: "A request that logs",
  description: "The logger writes either straight to the disk or through a queue and a worker.",
  nodes: [
    { id: "req", label: "Request", kind: "client", col: 0, row: 1 },
    { id: "log", label: "Logger", kind: "service", col: 1, row: 1 },
    { id: "queue", label: "Bounded queue", kind: "queue", col: 2, row: 0 },
    { id: "worker", label: "Worker", kind: "worker", col: 3, row: 0 },
    { id: "disk", label: "Disk", kind: "storage", col: 3, row: 1 },
  ],
  edges: [
    { from: "req", to: "log" },
    { from: "log", to: "disk" },
    { from: "log", to: "queue", style: "async" },
    { from: "queue", to: "worker" },
    { from: "worker", to: "disk" },
  ],
  scenarios: [
    {
      id: "sync",
      name: "Write inline",
      steps: [
        { edge: "req>log", caption: "A request logs one line." },
        { edge: "log>disk", tone: "error", caption: "The logger writes to the disk and waits.", mark: [{ node: "disk", state: "busy" }] },
        { edge: "log>disk", reverse: true, tone: "error", caption: "The disk takes 50 ms." },
        { edge: "req>log", reverse: true, tone: "error", caption: "The request answers 50 ms late." },
      ],
    },
    {
      id: "async",
      name: "Queue first",
      steps: [
        { edge: "req>log", caption: "A request logs one line.", mark: [{ node: "disk", state: null }] },
        { edge: "log>queue", caption: "The logger puts the record on a bounded queue." },
        { edge: "req>log", reverse: true, tone: "ok", caption: "The request answers at once." },
        { edge: "queue>worker", caption: "The worker takes records in order." },
        { edge: "worker>disk", caption: "It pays the slow write, off the request path." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A slow disk slows the request",
      line: "Writing inline makes every caller wait for the disk.",
      scene: { kind: "flow", spec: flow, scenario: "sync" },
      predict: { q: "The disk write takes 50 ms. The request waits?", options: ["No, logging is free", "About 50 ms more"], answer: 1, why: "An inline write runs inside the request, so its time is added." },
    },
    {
      tag: "sum",
      head: "Build only when level is on",
      line: "Debug messages are cheap to ignore only if you never build them.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Debug calls per request", value: "20" },
          { label: "Requests a second", value: "1,000" },
        ],
        result: { label: "Strings built a second", value: "20,000" },
        verdict: { text: "Check the level first", tone: "warn" },
      },
    },
    {
      tag: "idea",
      head: "Format and place are swappable",
      line: "The logger hands a record to appenders. Each picks its own format.",
      scene: { kind: "classes", spec: classes, stage: 2 },
    },
    {
      tag: "fix",
      head: "Queue the slow part",
      line: "A decorator queues records so a worker pays for the disk.",
      scene: { kind: "flow", spec: flow, scenario: "async" },
    },
    {
      tag: "choose",
      head: "When the queue is full",
      line: "Pick a policy on purpose. A bound forces the choice.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Drop and count", tone: "good", why: "Fits debug and info noise" },
          { label: "Block the caller", tone: "warn", why: "Right for audit lines only" },
          { label: "Unbounded queue", tone: "bad", why: "Memory becomes the outage" },
          { label: "Throw to caller", tone: "bad", why: "Logging breaks the request" },
        ],
      },
      predict: { q: "Queue full of debug noise. Block the request?", options: ["Yes, keep every line", "No, drop and count"], answer: 1, why: "Noise is not worth a stalled request. Count the drops." },
    },
    {
      tag: "skip",
      head: "Skip the global logger",
      line: "A shared singleton cannot be reset between tests.",
      scene: {
        kind: "versus",
        left: { title: "Global logger", points: ["Tests share state", "Levels cannot be reset"] },
        right: { title: "Injected manager", points: ["Each test builds its own", "A default instance on top", "Swap sinks freely"] },
      },
    },
  ],
};

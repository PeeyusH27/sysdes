import { getPrimer } from "../../primers";
import { connectionPooling } from "../../deep-dives/05-connections-pooling/diagrams";
import type { Story } from "../types";

// The connection-pool primer's picture (requests, app, pool, database) is reused: same nodes, same scenarios.
const flow = getPrimer("connection-pool")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A new connection every time",
      line: "Each request opens its own line to the database. Too many and it refuses.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum first",
      line: "Before your first question, DNS, TCP and TLS each take a round trip.",
      scene: {
        kind: "sum",
        rows: [
          { label: "One round trip", value: "50 ms" },
          { label: "DNS, TCP, TLS", value: "3 trips" },
        ],
        result: { label: "Wait before the query", value: "150 ms" },
        verdict: { text: "Paid on every request", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Keep a few lines open",
      line: "The pool opens connections once and lends them out. Setup is paid once.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "sum",
      head: "Size it by the total",
      line: "Every instance has its own pool. Instances times pool size must fit the limit.",
      scene: {
        kind: "sum",
        rows: [
          { label: "max_connections", value: "200" },
          { label: "Kept for admin", value: "20" },
          { label: "App instances", value: "12" },
        ],
        result: { label: "Pool per instance", value: "15" },
        verdict: { text: "(200 minus 20) divided by 12", tone: "info" },
      },
    },
    {
      tag: "sum",
      head: "Bigger is not faster",
      line: "Useful connections are roughly twice the cores: about 17 on 8 cores.",
      scene: {
        kind: "meter",
        label: "Pool size, 8 cores",
        unit: "connections",
        min: 1,
        max: 200,
        start: 200,
        log: true,
        stops: [
          { upTo: 17, verdict: "Good. About twice the cores.", tone: "good" },
          { upTo: 50, verdict: "Waiting, not throughput.", tone: "warn" },
          { upTo: 200, verdict: "Slower. Queries fight each other.", tone: "bad" },
        ],
      },
      predict: { q: "Timeouts rise. Raise the pool to 200?", options: ["Yes, more lines", "No, it gets slower"], answer: 1, why: "Past the core count, extra connections only add waiting and contention." },
    },
    {
      tag: "catch",
      head: "One slow query dries the pool",
      line: "Busy connections are queries a second times seconds each. A pool of 15 runs out.",
      scene: {
        kind: "bars",
        bars: [
          { label: "100/s at 5 ms", value: 0.5, shown: "0.5 busy", tone: "good" },
          { label: "1,000/s at 5 ms", value: 5, shown: "5 busy", tone: "good" },
          { label: "1,000/s at 50 ms", value: 50, shown: "50 busy", tone: "bad" },
        ],
      },
    },
    {
      tag: "fix",
      head: "Many apps, few database lines",
      line: "PgBouncer takes many cheap app connections and runs them over a few real ones.",
      scene: { kind: "flow", spec: connectionPooling, scenario: "pgbouncer" },
    },
    {
      tag: "skip",
      head: "Do you need a pooler?",
      line: "With a few instances the pools already fit. Add one when they cannot.",
      scene: {
        kind: "versus",
        left: { title: "Skip PgBouncer", points: ["A few app instances", "Pools fit the limit"] },
        right: { title: "Add PgBouncer", points: ["50 instances times 20", "1,000 against a limit near 200"] },
      },
    },
  ],
};

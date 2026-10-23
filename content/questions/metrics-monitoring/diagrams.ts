import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "metrics-monitoring-architecture",
  title: "Metrics and monitoring architecture",
  description:
    "Agents on every host batch samples and push them through an ingest gateway into Kafka, which absorbs bursts. Writers append to a time-series database that keeps a recent in-memory head with a write-ahead log and flushes compressed blocks to object storage. A rollup job keeps coarser copies for long retention, the query service reads the right tier for dashboards, and an alert evaluator runs rules and pages through a notifier.",
  nodes: [
    { id: "agent", label: "Host agents", kind: "client", col: 0, row: 1, sub: "100K hosts", note: "A small process on every host. It reads about 100 metrics every 10 seconds, batches them and pushes. If the backend is down it keeps a bounded buffer and drops the oldest samples." },
    { id: "gw", label: "Ingest gateway", kind: "gateway", col: 1, row: 1, sub: "auth + validate" },
    { id: "kafka", label: "Kafka", kind: "queue", col: 2, row: 1, sub: "by series hash", note: "Partitioned by series id so all samples of one series land in order on one writer. It absorbs bursts, and lets a writer fall behind or restart without losing data." },
    { id: "writer", label: "TSDB writers", kind: "worker", col: 3, row: 1, sub: "append" },
    { id: "tsdb", label: "Time-series DB", kind: "database", col: 4, row: 1, sub: "head 2 h + WAL", note: "The newest two hours live in memory with a write-ahead log. Older data is cut into compressed blocks. Timestamps and values compress to about 1.4 bytes a sample." },
    { id: "obj", label: "Block storage", kind: "storage", col: 5, row: 1, sub: "compressed blocks" },
    { id: "query", label: "Query service", kind: "service", col: 4, row: 0, sub: "picks the tier" },
    { id: "dash", label: "Dashboards", kind: "client", col: 5, row: 0, sub: "10K open" },
    { id: "eval", label: "Alert evaluator", kind: "service", col: 3, row: 2, sub: "10K rules" },
    { id: "notify", label: "Notifier", kind: "external", col: 2, row: 2, sub: "page, Slack" },
    { id: "rollup", label: "Rollup job", kind: "worker", col: 4, row: 2, sub: "1 min, 1 h tiers" },
  ],
  edges: [
    { from: "agent", to: "gw", label: "batch / 10 s" },
    { from: "gw", to: "kafka", label: "publish" },
    { from: "kafka", to: "writer", label: "consume" },
    { from: "writer", to: "tsdb", label: "append" },
    { from: "tsdb", to: "obj", label: "flush blocks", style: "async" },
    { from: "dash", to: "query", label: "PromQL-style" },
    { from: "query", to: "tsdb", label: "range query" },
    { from: "rollup", to: "tsdb", label: "downsample" },
    { from: "eval", to: "tsdb", label: "rule queries" },
    { from: "eval", to: "notify", label: "page" },
  ],
  scenarios: [
    {
      id: "sample",
      name: "A sample's journey",
      steps: [
        { edge: "agent>gw", caption: "Every 10 seconds the agent sends one batch: about 100 samples of cpu, memory, requests and latency, each with labels such as host and service." },
        { edge: "gw>kafka", caption: "The gateway checks the token and the format, then publishes to Kafka, partitioned by series, so a series always goes to the same writer." },
        { edge: "kafka>writer", caption: "A writer consumes the batch. Kafka keeps the data until the writer confirms, so a crash replays instead of losing samples." },
        { edge: "writer>tsdb", caption: "The writer appends to the write-ahead log and to the in-memory head. Roughly 1 million samples a second arrive across all writers.", mark: [{ node: "tsdb", state: "ok" }] },
        { edge: "tsdb>obj", tone: "ok", caption: "Every two hours the head is compressed to about 1.4 bytes a sample and written to block storage as an immutable block." },
      ],
    },
    {
      id: "dashboard",
      name: "Dashboard query",
      steps: [
        { edge: "dash>query", caption: "An engineer opens a dashboard: p99 latency of the checkout service, last 30 days, one point per hour." },
        { edge: "query>tsdb", caption: "The query service picks the 1-hour rollup tier: 720 points per series, not 259,200 raw ones." },
        { edge: "query>tsdb", reverse: true, caption: "Block indexes find the series by label; only the relevant blocks are read.", mark: [{ node: "tsdb", state: "hit" }] },
        { edge: "dash>query", reverse: true, tone: "ok", caption: "The chart draws in well under a second. A 5 minute zoom would use raw data instead." },
      ],
    },
    {
      id: "alert",
      name: "Alert fires",
      steps: [
        { edge: "eval>tsdb", caption: "Every 30 seconds the evaluator runs the rule: average cpu over 1 minute is above 90%." },
        { edge: "eval>tsdb", reverse: true, tone: "miss", caption: "True. The rule becomes pending. A single blip must not wake anyone.", mark: [{ node: "eval", state: "busy" }] },
        { edge: "eval>tsdb", caption: "Five minutes later it is still true, so the rule turns firing." },
        { edge: "eval>notify", tone: "error", caption: "Thirty hosts in one cluster fire together. The notifier groups them into one page and will not repeat it for four hours.", mark: [{ node: "eval", state: "miss" }] },
        { edge: "eval>notify", reverse: true, tone: "ok", caption: "The on-call engineer is paged once, with the list of hosts." },
      ],
    },
    {
      id: "burst",
      name: "Ingest burst",
      steps: [
        { edge: "agent>gw", caption: "A network blip ends and 100K agents all send their buffered samples at once: a burst far above 1 million a second." },
        { edge: "gw>kafka", tone: "miss", caption: "The gateway publishes into Kafka. Kafka absorbs the burst on disk.", mark: [{ node: "kafka", state: "busy" }] },
        { edge: "kafka>writer", caption: "Writers consume at their own pace and fall behind for a few minutes. Dashboards show slightly old data, and nothing is dropped.", mark: [{ node: "writer", state: "busy" }] },
        { edge: "writer>tsdb", tone: "ok", caption: "As the burst drains, the lag falls back to seconds. An alert on consumer lag tells operators it happened.", mark: [{ node: "kafka", state: null }, { node: "writer", state: null }] },
      ],
    },
  ],
};

export const alertSequence: SequenceSpec = {
  id: "metrics-monitoring-alert-sequence",
  title: "From a spike to a page",
  description:
    "The evaluator checks a rule every 30 seconds. A condition must hold for the whole for-duration before it fires, which filters blips. When it fires, the notifier groups related alerts into one page. When the metric recovers, the alert resolves.",
  actors: [
    { id: "eval", label: "Evaluator", kind: "service" },
    { id: "tsdb", label: "Time-series DB", kind: "database" },
    { id: "notify", label: "Notifier", kind: "external" },
    { id: "oncall", label: "On-call", kind: "client" },
  ],
  items: [
    { from: "eval", to: "tsdb", label: "avg cpu 1m > 90%?" },
    { from: "tsdb", to: "eval", label: "yes (95%)", type: "reply" },
    { note: "State: pending, the 5 minute timer starts", over: ["eval", "tsdb"] },
    {
      alt: [
        {
          when: "blip",
          items: [
            { from: "eval", to: "tsdb", label: "30 s later: still > 90%?" },
            { from: "tsdb", to: "eval", label: "no (41%)", type: "reply" },
            { note: "Back to inactive. Nobody was paged", over: ["eval", "notify"] },
          ],
        },
        {
          when: "sustained",
          items: [
            { note: "10 more evaluations, all above 90%: 5 minutes", over: ["eval", "tsdb"] },
            { from: "eval", to: "notify", label: "fire: 30 hosts, cluster eu-1" },
            { from: "notify", to: "oncall", label: "one page, 30 hosts listed", type: "async" },
            { note: "Repeats are suppressed for 4 hours", over: ["notify", "oncall"] },
            { from: "eval", to: "notify", label: "later: resolved" },
            { from: "notify", to: "oncall", label: "recovered", type: "async" },
          ],
        },
        {
          when: "host went silent",
          items: [
            { from: "eval", to: "tsdb", label: "avg cpu 1m > 90%?" },
            { from: "tsdb", to: "eval", label: "no data", type: "reply" },
            { note: "Missing data counts as bad: a dead host must not look healthy", over: ["eval", "tsdb"] },
            { from: "eval", to: "notify", label: "fire: host-17 not reporting" },
          ],
        },
      ],
    },
  ],
};

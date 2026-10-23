import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: making ids with no network call, and a clock that steps back.
const local: FlowSpec = {
  id: "story-id-local",
  title: "Ids made in the server",
  description: "A server leases a worker id once, then makes every id from the clock, its worker id and a counter.",
  nodes: [
    { id: "app", label: "App server", kind: "service", col: 0, row: 1 },
    { id: "gen", label: "ID generator", kind: "idgen", col: 1, row: 1, sub: "in process" },
    { id: "reg", label: "Worker leases", kind: "database", col: 2, row: 0, sub: "used at boot" },
    { id: "clock", label: "Clock", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "gen", label: "nextId()" },
    { from: "gen", to: "reg", label: "lease" },
    { from: "gen", to: "clock", label: "now()" },
  ],
  scenarios: [
    {
      id: "local",
      name: "Local",
      steps: [
        { edge: "gen>reg", caption: "At boot, lease worker id 17 for 30 seconds.", mark: [{ node: "reg", state: "ok" }] },
        { edge: "app>gen", caption: "The app asks for an id." },
        { edge: "gen>clock", caption: "Read the time. Add worker 17 and a counter." },
        { edge: "app>gen", reverse: true, tone: "ok", caption: "One 64-bit id. No network call was made." },
      ],
    },
  ],
};

const back: FlowSpec = {
  id: "story-id-clock",
  title: "A clock that goes backwards",
  description: "If the clock steps back, an old timestamp could repeat an id. A big step makes the generator refuse.",
  nodes: [
    { id: "clock", label: "Clock", kind: "external", col: 0, row: 1, sub: "stepped back 60 ms" },
    { id: "gen", label: "ID generator", kind: "idgen", col: 1, row: 1 },
    { id: "app", label: "App server", kind: "service", col: 2, row: 1 },
  ],
  edges: [
    { from: "clock", to: "gen", label: "now()" },
    { from: "gen", to: "app", label: "id or error" },
  ],
  scenarios: [
    {
      id: "back",
      name: "Back",
      steps: [
        { edge: "clock>gen", tone: "error", caption: "The time is now earlier than the last id's time.", mark: [{ node: "clock", state: "miss" }] },
        { edge: "gen>app", tone: "error", caption: "Refuse, and alert. A repeated id would corrupt data.", mark: [{ node: "gen", state: "down" }] },
        { edge: "gen>app", tone: "ok", caption: "The app switches to another instance. A short error beats a duplicate.", mark: [{ node: "gen", state: null }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One counter, many servers",
      line: "Every new row needs a unique id, from every server.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Servers", value: "20" },
          { label: "Ids each, per second", value: "5,000" },
        ],
        result: { label: "Total ids", value: "100,000/s" },
        verdict: { text: "One shared counter is a bottleneck", tone: "warn" },
      },
    },
    {
      tag: "fix",
      head: "Make ids locally",
      line: "Time, worker and counter packed into 64 bits.",
      scene: { kind: "flow", spec: local, scenario: "local" },
    },
    {
      tag: "choose",
      head: "Compare the options",
      line: "Which way would you generate ids?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Auto-increment", tone: "warn", why: "One machine, a trip per id" },
          { label: "Random UUID", tone: "warn", why: "128 bits; scatters inserts" },
          { label: "Snowflake id", tone: "good", why: "64 bits, local, ordered" },
          { label: "Timestamp only", tone: "bad", why: "Two servers collide in a ms" },
        ],
      },
    },
    {
      tag: "sum",
      head: "Is 12 bits enough?",
      line: "Drag the ids one server makes in a single millisecond.",
      scene: {
        kind: "meter",
        label: "Ids per millisecond",
        unit: "ids",
        min: 1,
        max: 10000,
        start: 5,
        log: true,
        stops: [
          { upTo: 4096, verdict: "Fits in the 12 sequence bits.", tone: "good" },
          { upTo: 8192, verdict: "Overflow: wait for the next millisecond.", tone: "warn" },
          { upTo: 10000, verdict: "Add sequence bits or more workers.", tone: "bad" },
        ],
      },
      predict: { q: "How many ids fit in 12 bits?", options: ["1,024", "4,096"], answer: 1, why: "2 to the power 12 is 4,096 values per millisecond." },
    },
    {
      tag: "catch",
      head: "The clock steps back",
      line: "NTP corrects a fast clock. Old timestamps could repeat ids.",
      scene: { kind: "flow", spec: back, scenario: "back" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "A fancy id scheme is not always needed.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Database auto-increment", "UUID v7 if 128 bits is fine", "One writer, one counter"] },
        right: { title: "Add when", points: ["Many writers: Snowflake", "Strict order: use a log", "Lots of ids: lease workers"] },
      },
    },
  ],
};

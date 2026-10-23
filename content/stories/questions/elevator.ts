import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A hall button, one controller and two cars. "double" is no owner, "owner" is one owner per call,
// "fail" is a car going out of service with calls assigned to it.
const building: FlowSpec = {
  id: "story-elevator",
  title: "One press, two cars",
  description: "A hall button talks to one controller, which decides which car answers.",
  nodes: [
    { id: "hall", label: "Floor 5 button", kind: "client", col: 0, row: 1 },
    { id: "ctl", label: "Controller", kind: "service", col: 1, row: 1 },
    { id: "a", label: "Car A", kind: "worker", col: 2, row: 0 },
    { id: "b", label: "Car B", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "hall", to: "ctl" },
    { from: "ctl", to: "a" },
    { from: "ctl", to: "b" },
  ],
  scenarios: [
    {
      id: "double",
      name: "No owner",
      steps: [
        { edge: "hall>ctl", caption: "Monday 9 am. Someone presses 5 up." },
        { edge: "ctl>a", caption: "Nobody owns the call, so both cars start.", with: [{ edge: "ctl>b", caption: "" }], mark: [{ node: "a", state: "busy" }, { node: "b", state: "busy" }] },
        { edge: "ctl>a", reverse: true, tone: "ok", caption: "Car A picks up the rider.", mark: [{ node: "a", state: "hit" }] },
        { edge: "ctl>b", reverse: true, tone: "error", caption: "Car B rides up empty.", mark: [{ node: "b", state: "down" }] },
      ],
    },
    {
      id: "owner",
      name: "One owner",
      steps: [
        { edge: "hall>ctl", caption: "Someone presses 5 up.", mark: [{ node: "a", state: null }, { node: "b", state: null }] },
        { edge: "ctl>a", caption: "The controller picks one owner: the nearest car.", mark: [{ node: "a", state: "busy" }] },
        { edge: "ctl>a", reverse: true, tone: "ok", caption: "Car A arrives and picks up the rider.", mark: [{ node: "a", state: "hit" }] },
        { edge: "ctl>b", caption: "Car B stays free for the next call.", mark: [{ node: "b", state: "ok" }] },
        { edge: "hall>ctl", tone: "miss", caption: "A second press finds the call owned. Nothing changes." },
      ],
    },
    {
      id: "fail",
      name: "A car fails",
      steps: [
        { edge: "ctl>b", caption: "Car B holds two calls from the hall.", mark: [{ node: "b", state: "busy" }] },
        { edge: "ctl>b", reverse: true, tone: "error", caption: "Car B faults and goes out of service.", mark: [{ node: "b", state: "down" }] },
        { edge: "ctl>a", caption: "The controller hands both calls to Car A.", mark: [{ node: "a", state: "busy" }] },
        { edge: "ctl>a", reverse: true, tone: "ok", caption: "Nobody waits forever.", mark: [{ node: "a", state: "hit" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two cars answer one press",
      line: "With no single owner, every car goes. One rides empty.",
      scene: { kind: "flow", spec: building, scenario: "double" },
    },
    {
      tag: "sum",
      head: "Add up one trip",
      line: "A 20-floor office, 10 riders. Where does the time go?",
      scene: {
        kind: "sum",
        rows: [
          { label: "Travel", value: "52 s" },
          { label: "Stops", value: "72 s" },
          { label: "Transfers", value: "24 s" },
        ],
        result: { label: "Round trip", value: "148 s" },
        verdict: { text: "Stopping costs more than moving", tone: "warn" },
      },
      predict: { q: "Per trip, which takes longer?", options: ["Moving between floors", "Stopping at floors"], answer: 1, why: "Doors and braking take about 8 s at every stop." },
    },
    {
      tag: "sum",
      head: "How many cars for the rush?",
      line: "Drag the rush size. Each car moves about 20 people per 5 minutes.",
      scene: {
        kind: "meter",
        label: "People in a 5 minute rush",
        unit: "people",
        min: 10,
        max: 150,
        start: 120,
        stops: [
          { upTo: 20, verdict: "One car clears it.", tone: "good" },
          { upTo: 81, verdict: "Up to four cars cover it.", tone: "good" },
          { upTo: 121, verdict: "Up to six cars cover it.", tone: "warn" },
          { upTo: 150, verdict: "Beyond six cars. Add cars or cut stops.", tone: "bad" },
        ],
      },
      predict: { q: "120 people press in 5 minutes. How many cars?", options: ["One", "Four", "Six"], answer: 2, why: "Four move about 81 people in 5 minutes. Six move about 121." },
    },
    {
      tag: "idea",
      head: "One owner for every call",
      line: "Presses go to one controller. The first is assigned. Repeats do nothing.",
      scene: { kind: "flow", spec: building, scenario: "owner" },
    },
    {
      tag: "choose",
      head: "How a car orders stops",
      line: "LOOK sweeps one way, then turns at the last request.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "First come first", tone: "warn", why: "Zig-zags and waits long" },
          { label: "Nearest stop first", tone: "bad", why: "A far floor can starve" },
          { label: "LOOK sweep", tone: "good", why: "No floor waits over two sweeps" },
          { label: "Collective", tone: "warn", why: "Simple, but cars bunch" },
        ],
      },
      predict: { q: "Which rule can leave a far floor waiting forever?", options: ["Nearest stop first", "LOOK sweep"], answer: 0, why: "Closer stops keep jumping the queue. LOOK always reaches every stop ahead." },
    },
    {
      tag: "catch",
      head: "A car breaks mid-shift",
      line: "Its calls would wait forever. The controller reassigns them.",
      scene: { kind: "flow", spec: building, scenario: "fail" },
    },
    {
      tag: "skip",
      head: "Dispatch only for many cars",
      line: "Match the layer to the building.",
      scene: {
        kind: "versus",
        left: { title: "Small building", points: ["1 car, 5 floors: a queue", "1 car, 20 floors: LOOK"] },
        right: { title: "Many cars", points: ["4 cars, 20 floors: dispatch", "One owner per call"] },
      },
    },
  ],
};

import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Two buyers, the booking API and the seats table. "race" is select-then-update, "safe" is one conditional UPDATE,
// "late" is a payment that lands after the hold expired. The page's own diagram has 8 nodes, so this one is smaller.
const seats: FlowSpec = {
  id: "story-movie-booking",
  title: "Two buyers, one seat",
  description: "Alice and Bob click seat A5 at the same moment. The booking API talks to the seats table.",
  nodes: [
    { id: "alice", label: "Alice", kind: "client", col: 0, row: 0 },
    { id: "bob", label: "Bob", kind: "client", col: 0, row: 2 },
    { id: "api", label: "Booking API", kind: "service", col: 1, row: 1 },
    { id: "seats", label: "Seats table", kind: "database", col: 2, row: 1, sub: "A5 available" },
    { id: "pay", label: "Payment", kind: "external", col: 2, row: 0 },
  ],
  edges: [
    { from: "alice", to: "api" },
    { from: "bob", to: "api" },
    { from: "api", to: "seats" },
    { from: "api", to: "pay" },
  ],
  scenarios: [
    {
      id: "race",
      name: "Select, then update",
      steps: [
        { edge: "alice>api", caption: "Alice and Bob click A5 together.", with: [{ edge: "bob>api", caption: "" }] },
        { edge: "api>seats", caption: "Both ask: is A5 available?", with: [{ edge: "api>seats", caption: "" }] },
        { edge: "api>seats", reverse: true, tone: "ok", caption: "Both are told yes.", with: [{ edge: "api>seats", reverse: true, tone: "ok", caption: "" }] },
        { edge: "api>seats", tone: "error", caption: "Both mark A5 held.", mark: [{ node: "seats", state: "down" }] },
        { edge: "alice>api", reverse: true, tone: "error", caption: "Both pay. One seat, two tickets.", with: [{ edge: "bob>api", reverse: true, tone: "error", caption: "" }] },
      ],
    },
    {
      id: "safe",
      name: "One conditional UPDATE",
      steps: [
        { edge: "alice>api", caption: "Same click, same millisecond.", with: [{ edge: "bob>api", caption: "" }], mark: [{ node: "seats", state: null }] },
        { edge: "api>seats", caption: "Each runs: hold A5 only if still available.", with: [{ edge: "api>seats", caption: "" }] },
        { edge: "api>seats", reverse: true, tone: "ok", caption: "Alice's UPDATE gets the row lock and commits.", mark: [{ node: "seats", state: "hit" }] },
        { edge: "alice>api", reverse: true, tone: "ok", caption: "A5 is Alice's for 5 minutes." },
        { edge: "api>seats", reverse: true, tone: "miss", caption: "Bob's UPDATE re-checks and matches 0 rows." },
        { edge: "bob>api", reverse: true, tone: "miss", caption: "Bob gets 409 and picks another seat." },
      ],
    },
    {
      id: "late",
      name: "Late payment",
      steps: [
        { edge: "alice>api", caption: "Alice holds A5 and starts to pay.", mark: [{ node: "seats", state: null }] },
        { edge: "bob>api", caption: "At 5 minutes her hold expires. Bob takes A5." },
        { edge: "api>pay", reverse: true, caption: "At 7 minutes, Alice's payment succeeds." },
        { edge: "api>seats", tone: "error", caption: "Confirm finds A5 is Bob's. Zero rows.", mark: [{ node: "seats", state: "down" }] },
        { edge: "api>pay", tone: "ok", caption: "The API refunds Alice automatically.", mark: [{ node: "pay", state: "ok" }] },
        { edge: "alice>api", reverse: true, caption: "Alice is told: hold expired, money returning." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two clicks, one seat",
      line: "Check availability, then update: both buyers pass the check.",
      scene: { kind: "flow", spec: seats, scenario: "race" },
      predict: { q: "Two buyers click A5 together. Select, then update. Result?", options: ["Alice wins", "Both pay"], answer: 1, why: "Each check sees the seat free before either update lands." },
    },
    {
      tag: "sum",
      head: "The average is tiny",
      line: "The launch spike is the real problem, not the average.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Bookings a month", value: "10 million" },
          { label: "Seconds in a month", value: "~2.6 million" },
        ],
        result: { label: "Bookings a second", value: "about 4" },
        verdict: { text: "The UPDATE alone copes", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "How long to hold a seat?",
      line: "Drag the hold. Idle holds block other buyers.",
      scene: {
        kind: "meter",
        label: "Hold length",
        unit: "minutes",
        min: 1,
        max: 20,
        start: 5,
        stops: [
          { upTo: 1.5, verdict: "Too short to type a card.", tone: "bad" },
          { upTo: 5.5, verdict: "Enough to pay. Abandoned seats return soon.", tone: "good" },
          { upTo: 10, verdict: "Idle holds start to block buyers.", tone: "warn" },
          { upTo: 20, verdict: "At 15, 150 shoppers lock 300 seats.", tone: "bad" },
        ],
      },
      predict: { q: "Does a longer hold sell more seats?", options: ["Yes", "No, idle holds lock seats"], answer: 1, why: "Unpaid holds keep others out until they expire." },
    },
    {
      tag: "idea",
      head: "One UPDATE, one winner",
      line: "Postgres locks the seat row. The loser re-checks and matches nothing.",
      scene: { kind: "flow", spec: seats, scenario: "safe" },
    },
    {
      tag: "choose",
      head: "Who decides the seat?",
      line: "The database is the truth. Everything else is a helper.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "SELECT then UPDATE", tone: "bad", why: "Both see available, both pay" },
          { label: "Conditional UPDATE", tone: "good", why: "A row lock picks one winner" },
          { label: "Redis as the truth", tone: "warn", why: "Fine as a front filter only" },
          { label: "Show-level lock", tone: "bad", why: "Every booking waits in line" },
          { label: "Browser confirms", tone: "bad", why: "Trust the payment webhook instead" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Payment lands after expiry",
      line: "Book it if the seat is still mine. Otherwise refund.",
      scene: { kind: "flow", spec: seats, scenario: "late" },
    },
    {
      tag: "skip",
      head: "Launch tools, launch days",
      line: "Normal days need none of this extra machinery.",
      scene: {
        kind: "versus",
        left: { title: "Normal day", points: ["About 4 bookings a second", "The UPDATE alone copes"] },
        right: { title: "Launch day", points: ["Waiting room: 200 a second", "CDN-cached seat maps", "Rate limits and CAPTCHA"] },
      },
    },
  ],
};

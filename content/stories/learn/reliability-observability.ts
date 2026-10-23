import { circuitBreaker } from "../../learn/07-reliability-observability/diagrams";
import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The circuit-breaker primer's picture shows one stuck service dragging everything down. The page's own diagram shows
// the breaker tripping and a fallback answering.
const stuck = getPrimer("circuit-breaker")!.flow;

export const story: Story | undefined = {
  learn: [
    {
      head: "Something is always broken",
      body: "A request often passes through many services. Each one fails now and then, so at scale some part is failing at any moment. Plan for it instead of hoping.",
      eg: "Christmas lights in a chain",
      example: "Old fairy lights go dark when one bulb fails, because every bulb sits on one wire. Ten services in a row behave the same way.",
      doodle: "circuit-breaker",
    },
    {
      head: "Never wait forever",
      body: "A timeout is the longest you will wait for an answer. Without one, a stuck service holds your workers until none are left, and healthy pages slow down too.",
      eg: "Waiting on hold",
      example: "If a helpline keeps you on hold for an hour, you cannot make other calls. Hanging up after five minutes frees your phone for the rest of the day.",
    },
    {
      head: "Stop calling what is down",
      body: "A circuit breaker counts failures. After too many, it stops calling the service for a while and returns a fallback, such as a cached answer, straight away.",
      eg: "A tripped fuse at home",
      example: "When a heater shorts, the fuse cuts that circuit so the rest of the house keeps its lights. You reset it once the heater is fixed.",
    },
    {
      head: "Retry gently, not all at once",
      body: "Retries help with brief blips, but thousands of clients retrying together bury a struggling service. Wait a little longer each time, with a random extra delay.",
      eg: "A busy phone line",
      example: "If everyone redials the second a line is free, it jams again. Waiting a random minute or two lets calls get through one by one.",
    },
    {
      head: "Measure what users feel",
      body: "Pick a number users notice, like requests answered in under 300 ms, and a target such as 99.9%. Alert when that slips, not when a server's CPU is high.",
      eg: "A delivery firm's promise",
      example: "Customers care that parcels arrive on time, not how hot the vans run. The firm tracks on-time deliveries and acts when that number drops.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "One stuck service drags all",
      line: "Waiting calls use up the workers, so even pages that never needed prices go slow.",
      scene: { kind: "flow", spec: stuck, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Chains multiply failure",
      line: "Each link looks reliable. Together they are not.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Services in the chain", value: "10" },
          { label: "Each one succeeds", value: "99.9%" },
        ],
        result: { label: "Whole request succeeds", value: "~99%" },
        verdict: { text: "1 request in 100 fails", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "A breaker fails fast",
      line: "After 5 failures it opens. A fallback answers, and the dependency gets room.",
      scene: { kind: "flow", spec: circuitBreaker, scenario: "trip" },
    },
    {
      tag: "choose",
      head: "Decide the fallback early",
      line: "Pick what each page shows before the outage, not during it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Recommendations", tone: "good", why: "Show cached bestsellers" },
          { label: "Reviews", tone: "good", why: "Show nothing; the page still sells" },
          { label: "Search", tone: "good", why: "Show cached popular queries" },
          { label: "Database writes", tone: "warn", why: "Read-only mode with a banner" },
        ],
      },
      predict: { q: "Reviews are down. What should the product page do?", options: ["Show an error page", "Load without reviews"], answer: 1, why: "The page still sells without reviews. Fail small, not whole." },
    },
    {
      tag: "sum",
      head: "Downtime you can afford",
      line: "Each extra nine cuts downtime ten times. That gap is the error budget.",
      scene: {
        kind: "bars",
        bars: [
          { label: "99%", value: 432, shown: "7.2 h" },
          { label: "99.9%", value: 43.2, shown: "43.2 min", tone: "warn" },
          { label: "99.99%", value: 4.32, shown: "4.32 min", tone: "bad" },
        ],
      },
      predict: { q: "A 45-minute outage lands in a 99.9% month. Budget left?", options: ["Some left", "None, it is spent"], answer: 1, why: "99.9% allows 43.2 minutes a month. A 45-minute outage uses all of it." },
    },
    {
      tag: "catch",
      head: "Retries can bury a service",
      line: "Every layer retries, so one failure becomes a flood.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Layers that retry", value: "3" },
          { label: "Tries per layer", value: "3" },
        ],
        result: { label: "Calls at the service", value: "27" },
        verdict: { text: "Retry in one layer only", tone: "bad" },
      },
    },
    {
      tag: "fix",
      head: "Alert on what users feel",
      line: "Page on the error budget burning. Keep CPU on a dashboard.",
      scene: {
        kind: "versus",
        left: { title: "Page someone", points: ["Error budget burning fast", "p99 slower than target", "Users seeing failures"] },
        right: { title: "Dashboard only", points: ["CPU", "Disk", "Memory"] },
      },
    },
    {
      tag: "catch",
      head: "Two of them, not redundant",
      line: "Check what fails together before counting nines.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "2 apps, 1 database", tone: "bad", why: "The database fails, both fail" },
          { label: "2 apps, 1 zone", tone: "bad", why: "One zone outage takes both" },
          { label: "2 apps, 1 deploy", tone: "bad", why: "One bad release hits both" },
          { label: "3 zones + spare", tone: "good", why: "Losing one zone is covered" },
        ],
      },
    },
  ],
};

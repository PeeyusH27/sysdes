import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The load balancer primer's picture (users, a balancer, three servers) and the idempotency primer's picture are reused.
const lb = getPrimer("load-balancer")!.flow;
const idem = getPrimer("idempotency")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One server takes the crowd",
      line: "Every user hits Server A. Its queue grows until it crashes, while two servers sit idle.",
      scene: { kind: "flow", spec: lb, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do you need one yet?",
      line: "Drag the peak load. Capacity is only half the reason.",
      scene: {
        kind: "meter",
        label: "Peak requests per second",
        unit: "req/s",
        min: 50,
        max: 50000,
        start: 200,
        log: true,
        stops: [
          { upTo: 1000, verdict: "One server has room. A spare covers deploys.", tone: "good" },
          { upTo: 4000, verdict: "Getting tight. Add a balancer and a second server.", tone: "warn" },
          { upTo: 50000, verdict: "Capacity now needs a fleet behind a balancer.", tone: "bad" },
        ],
      },
      predict: { q: "At 200 requests a second, is a balancer needed for capacity?", options: ["Yes", "No, but it still helps"], answer: 1, why: "One server has room. A second still makes deploys and crashes cost nothing." },
    },
    {
      tag: "idea",
      head: "A balancer shares the work",
      line: "Requests go out in turns. Each server answers fast with a third of the load.",
      scene: { kind: "flow", spec: lb, scenario: "with" },
    },
    {
      tag: "fix",
      head: "A dead server is skipped",
      line: "Health checks catch it. Three failed checks mark it down, so a blip cannot flap it.",
      scene: { kind: "flow", spec: lb, scenario: "dead" },
    },
    {
      tag: "choose",
      head: "Which server gets the next one?",
      line: "The rule matters when one server is slow or calls are uneven.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Round robin", tone: "warn", why: "Simple, but feeds a slow server" },
          { label: "Least connections", tone: "good", why: "Fits mixed calls, needs counts" },
          { label: "Power of 2 choices", tone: "good", why: "Pick two, take the lighter" },
          { label: "Hash on a key", tone: "warn", why: "A celebrity key swamps one server" },
        ],
      },
      predict: { q: "Server C turns slow. Which rule keeps feeding it?", options: ["Round robin", "Least connections"], answer: 0, why: "Round robin ignores load, so C's turn keeps coming while its queue grows." },
    },
    {
      tag: "idea",
      head: "Keep state off the servers",
      line: "Any instance must serve any user, and any can die.",
      scene: {
        kind: "versus",
        left: { title: "Sticky sessions", points: ["Session lives on one box", "A crash logs users out", "Deploys break the pin"] },
        right: { title: "Shared store", points: ["Sessions live in Redis", "Any instance serves anyone", "A crash loses nothing"] },
      },
    },
    {
      tag: "fix",
      head: "Retries need a key",
      line: "Networks fail after the work is done. The same key makes the retry harmless.",
      scene: { kind: "flow", spec: idem, scenario: "with" },
    },
    {
      tag: "catch",
      head: "One optional check, whole site down",
      line: "Never fail readiness on a dependency the page can live without.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Instances", value: "3" },
          { label: "Fail if recommendations down", value: "all 3" },
        ],
        result: { label: "Still serving", value: "0" },
        verdict: { text: "Whole site returns 503", tone: "bad" },
      },
    },
  ],
};

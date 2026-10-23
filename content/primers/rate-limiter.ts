import type { Primer } from "./types";

export const primer: Primer = {
  id: "rate-limiter",
  title: "What is a rate limiter?",
  idea: "Count how many requests each client sends, and politely turn away the extras, so one noisy client cannot slow everyone down.",
  doodle: "rate-limiter",
  analogy:
    "A turnstile with a counter. Only a few people get through each second, and the rest wait their turn instead of crowding the door.",
  flow: {
    id: "primer-rate-limiter",
    title: "No limit, or a count per client",
    description: "Without a limit one noisy client floods the service. With a limit, extra requests are refused at the entry.",
    nodes: [
      { id: "noisy", label: "Noisy client", kind: "client", col: 0, row: 1 },
      { id: "lim1", label: "Entry server 1", kind: "gateway", col: 1, row: 0 },
      { id: "counter", label: "Shared count", kind: "cache", col: 1, row: 1 },
      { id: "lim2", label: "Entry server 2", kind: "gateway", col: 1, row: 2 },
      { id: "service", label: "Your service", kind: "service", col: 2, row: 1 },
    ],
    edges: [
      { from: "noisy", to: "lim1" },
      { from: "noisy", to: "lim2" },
      { from: "lim1", to: "service" },
      { from: "lim2", to: "service" },
      { from: "lim1", to: "counter" },
      { from: "lim2", to: "counter" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a limit",
        steps: [
          {
            edge: "noisy>lim1",
            tone: "error",
            caption: "One noisy client sends 1,000 requests a second.",
            with: [{ edge: "noisy>lim1", tone: "error", caption: "" }, { edge: "noisy>lim1", tone: "error", caption: "" }],
          },
          {
            edge: "lim1>service",
            tone: "error",
            caption: "With no limit, every one of them goes through to your service.",
            with: [{ edge: "lim1>service", tone: "error", caption: "" }, { edge: "lim1>service", tone: "error", caption: "" }],
            mark: [{ node: "service", state: "busy" }],
          },
          {
            edge: "lim1>service",
            reverse: true,
            tone: "error",
            caption: "Your service is swamped and slows down for everyone.",
            mark: [{ node: "service", state: "down" }],
          },
          { edge: "lim2>service", caption: "A normal user sends one request." },
          { edge: "lim2>service", reverse: true, tone: "error", caption: "It times out. One client broke it for everybody." },
        ],
      },
      {
        id: "with",
        name: "With a limit",
        steps: [
          {
            edge: "noisy>lim1",
            caption: "The same client sends 1,000 requests a second.",
            with: [{ edge: "noisy>lim1", caption: "" }, { edge: "noisy>lim1", caption: "" }],
            mark: [{ node: "service", state: null }],
          },
          {
            edge: "noisy>lim1",
            reverse: true,
            tone: "miss",
            caption: "Past 10 a second, the entry says \"slow down\" (HTTP 429) and passes nothing on.",
            mark: [{ node: "lim1", state: "miss" }],
          },
          { edge: "lim1>service", caption: "Only the allowed requests reach your service.", mark: [{ node: "lim1", state: null }] },
          { edge: "lim1>service", reverse: true, tone: "ok", caption: "Your service stays calm and answers quickly." },
          { edge: "lim2>service", caption: "Every client has its own count, so normal users are not slowed." },
          { edge: "lim2>service", reverse: true, tone: "ok", caption: "Their request is answered as usual." },
        ],
      },
      {
        id: "shared",
        name: "When counts are not shared",
        steps: [
          { edge: "noisy>lim1", caption: "The client sends 10 requests to Entry server 1. All are allowed." },
          { edge: "noisy>lim2", caption: "Then 10 more to Entry server 2. Its own count says all allowed." },
          {
            edge: "lim1>counter",
            tone: "error",
            caption: "The client got double the limit, because each server counts alone.",
            mark: [{ node: "counter", state: "down" }],
          },
          {
            edge: "lim2>counter",
            caption: "Fix: both servers read and update one shared count.",
            mark: [{ node: "counter", state: "hit" }],
          },
          { edge: "lim2>counter", reverse: true, tone: "miss", caption: "The shared total says over the limit, so the request is refused." },
        ],
      },
    ],
  },
  remember: [
    "Each client gets its own allowance, so one cannot starve the rest.",
    "Extra requests are refused quickly with a polite \"slow down\".",
    "With many servers, the counts must live in one shared place.",
  ],
  whenToUse: "On any public API, so one buggy client looping at 1,000 requests a second cannot slow everyone. Internal-only tools may skip it.",
  theCatch: "With two entry servers each counting alone, a client with a limit of 10 quietly gets 20, so counts must be shared.",
  say: "I would limit per client in the gateway, with counts in a shared fast store like Redis, and return 429 with a Retry-After header.",
  learnMore: [{ href: "/questions/rate-limiter", label: "Design a rate limiter" }],
};

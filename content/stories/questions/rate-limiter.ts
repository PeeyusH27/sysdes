import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The rate-limiter primer's picture: a noisy client, two entry servers, one shared count and the service.
const flow = getPrimer("rate-limiter")!.flow;

export const story: Story | undefined = {
  learn: [
    {
      head: "What a rate limiter does",
      body: "A rate limiter counts how many requests each client made recently and refuses the extras. The refusal is a quick answer, HTTP 429, so the service behind it stays healthy.",
      eg: "A bouncer with a clicker",
      example: "A club bouncer counts people through the door. When it is full he turns the next person away at the entrance, so the dance floor never gets crushed.",
      doodle: "rate-limiter",
    },
    {
      head: "Why you need one",
      body: "One buggy script or greedy client can send thousands of requests and make everyone else time out. A limit gives each client a fair share and protects the service.",
      eg: "A shared water tap",
      example: "If one neighbour fills a huge tank from the shared tap, the street's trickle dries up. A cap per household keeps water for everyone.",
    },
    {
      head: "The token bucket",
      body: "Picture a bucket that gets a few tokens every second, up to a maximum. Each request takes a token. No token, no entry. Short bursts are fine, but the long-run rate stays fixed.",
      eg: "Arcade tokens",
      example: "You earn one token a minute and can hold ten. Spend them all in a burst, then wait for more. Over a day you still play at a steady rate.",
    },
    {
      head: "Counting across many servers",
      body: "With many app servers, each counting alone lets a client slip through by visiting different ones. So the count lives in one shared place, such as Redis, and every server asks it.",
      eg: "Two doormen, one clicker",
      example: "Two doormen with separate clickers each admit ten, so twenty people get in instead of ten. One shared clicker at both doors keeps the count right.",
    },
    {
      head: "When the limiter itself fails",
      body: "If Redis is down you must choose: let requests through and risk abuse, or block them and risk an outage. Most endpoints fail open. Login and payments usually fail closed.",
      eg: "A jammed turnstile",
      example: "If a metro turnstile jams open, people flow through for a while and little is lost. If a bank vault lock breaks, nobody enters until it is fixed.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "One client breaks everyone",
      line: "A buggy loop floods the service, and normal users time out.",
      scene: { kind: "flow", spec: flow, scenario: "without" },
    },
    {
      tag: "idea",
      head: "Say no early, with a 429",
      line: "Past its allowance, a client is refused before the service sees it.",
      scene: { kind: "flow", spec: flow, scenario: "with" },
    },
    {
      tag: "sum",
      head: "Does Redis keep up?",
      line: "Each request costs one script call.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Peak traffic", value: "10K req/s" },
          { label: "One primary can do", value: "~100K ops/s" },
          { label: "Memory, 1M keys", value: "~200 MB" },
        ],
        result: { label: "Redis primaries", value: "1" },
        verdict: { text: "One primary handles this", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "Count alone, send more",
      line: "Each server counts by itself. Drag the number of servers.",
      scene: {
        kind: "meter",
        label: "Servers counting alone",
        unit: "servers",
        min: 1,
        max: 50,
        start: 10,
        stops: [
          { upTo: 1.5, verdict: "One server: exactly 100 a minute.", tone: "good" },
          { upTo: 10, verdict: "Up to 1,000 a minute get through.", tone: "warn" },
          { upTo: 50, verdict: "Up to 5,000 a minute get through.", tone: "bad" },
        ],
      },
      predict: { q: "Limit 100 a minute, 50 servers counting alone. Maximum sent?", options: ["100", "5,000"], answer: 1, why: "Each server lets 100 through, so the user gets 50 times the limit." },
    },
    {
      tag: "fix",
      head: "Share one count",
      line: "Both servers read and update the same count, so doubles are refused.",
      scene: { kind: "flow", spec: flow, scenario: "shared" },
    },
    {
      tag: "choose",
      head: "Match algorithm to traffic",
      line: "The real question is how much burst you allow.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Token bucket", tone: "good", why: "A 20-call page burst passes" },
          { label: "Sliding window", tone: "good", why: "Strict quota, 100 a minute" },
          { label: "Leaky bucket", tone: "good", why: "Steady rate for a fragile partner" },
          { label: "Sliding log", tone: "warn", why: "Exact, but memory grows" },
          { label: "Fixed window", tone: "bad", why: "Edge bursts double the limit" },
        ],
      },
      predict: { q: "Fixed window, 100 a minute. Most sent in 2 seconds?", options: ["100", "200"], answer: 1, why: "100 at 11:59:59 and 100 at 12:00:00 land in different windows." },
    },
    {
      tag: "catch",
      head: "Redis dies, then what?",
      line: "Fail fast with a 50 ms timeout, then pick a policy per rule.",
      scene: {
        kind: "versus",
        left: { title: "Fail open", points: ["Search, browse, normal API", "Use a local bucket", "Brief overshoot is accepted"] },
        right: { title: "Fail closed", points: ["Login, OTP, payments", "Answer 503, no guessing", "Abuse stays blocked"] },
      },
    },
  ],
};

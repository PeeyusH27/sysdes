import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The first byte is slow",
      line: "Nothing is cached, so four stages must finish before the page starts.",
      scene: {
        kind: "versus",
        left: { title: "You type a URL", points: ["Nothing is cached", "Four stages wait"] },
        right: { title: "You wait for", points: ["DNS, TCP, TLS", "Then the request"] },
      },
    },
    {
      tag: "sum",
      head: "Count the round trips",
      line: "Each stage needs at least one round trip to the server.",
      scene: {
        kind: "sum",
        rows: [
          { label: "One round trip", value: "50 ms" },
          { label: "DNS, TCP, TLS, GET", value: "4 trips" },
        ],
        result: { label: "Time to response", value: "200 ms" },
        verdict: { text: "Before any server work", tone: "warn" },
      },
    },
    {
      tag: "idea",
      head: "Repeat visits skip the setup",
      line: "Caches and kept-alive connections remove whole stages.",
      scene: {
        kind: "versus",
        left: { title: "First visit", points: ["DNS lookup", "TCP and TLS handshakes"] },
        right: { title: "Repeat visit", points: ["Address cached", "Connection reused"] },
      },
    },
    {
      tag: "choose",
      head: "Pick a DNS TTL",
      line: "Caches obey the TTL, so it sets how fast a change spreads.",
      scene: {
        kind: "meter",
        label: "DNS TTL",
        unit: "seconds",
        min: 10,
        max: 86400,
        start: 300,
        log: true,
        stops: [
          { upTo: 60, verdict: "Fast failover, many lookups.", tone: "good" },
          { upTo: 3600, verdict: "A sensible balance.", tone: "good" },
          { upTo: 86400, verdict: "Stale for hours after a change.", tone: "bad" },
        ],
      },
      predict: { q: "TTL is one day. You switch IPs now. Who sees it?", options: ["Everyone, instantly", "Some wait up to a day"], answer: 1, why: "Resolvers may keep the old answer for the whole TTL." },
    },
    {
      tag: "choose",
      head: "Which HTTP version?",
      line: "The difference is what one lost packet does.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "HTTP/1.1", tone: "warn", why: "One request per connection" },
          { label: "HTTP/2", tone: "info", why: "Streams share TCP; loss stalls all" },
          { label: "HTTP/3", tone: "good", why: "Streams are independent" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Setup is the real cost",
      line: "At a 50 ms round trip, reusing a connection beats any new protocol.",
      scene: {
        kind: "bars",
        bars: [
          { label: "TLS 1.2, cold", value: 250, shown: "250 ms", tone: "bad" },
          { label: "TLS 1.3, cold", value: 200, shown: "200 ms", tone: "warn" },
          { label: "HTTP/3, cold", value: 150, shown: "150 ms", tone: "warn" },
          { label: "Warm connection", value: 50, shown: "50 ms", tone: "good" },
        ],
      },
    },
  ],
};

import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The retry that charges twice",
      line: "The reply was lost, so the client cannot tell if the payment worked.",
      scene: {
        kind: "versus",
        left: { title: "Client retries", points: ["Reply never arrived", "Server already charged"] },
        right: { title: "Without a key", points: ["Charged twice", "An angry customer"] },
      },
    },
    {
      tag: "idea",
      head: "Methods carry promises",
      line: "Idempotent methods can be repeated. Others cannot.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "GET", tone: "good", why: "Safe and idempotent" },
          { label: "PUT", tone: "good", why: "Idempotent: retry freely" },
          { label: "DELETE", tone: "good", why: "Idempotent: retry freely" },
          { label: "POST", tone: "bad", why: "Needs an idempotency key" },
        ],
      },
      predict: { q: "Which method needs an idempotency key?", options: ["PUT", "POST"], answer: 1, why: "POST creates something new each time unless the key lets the server spot a repeat." },
    },
    {
      tag: "sum",
      head: "A 304 saves the bytes",
      line: "An unchanged resource costs one round trip and almost no data.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Body size", value: "200 KB" },
          { label: "ETag still matches", value: "304" },
        ],
        result: { label: "Bytes sent back", value: "under 1 KB" },
        verdict: { text: "Round trip still paid", tone: "warn" },
      },
    },
    {
      tag: "catch",
      head: "GraphQL's N+1",
      line: "One query per post for its author. A loader batches them.",
      scene: {
        kind: "bars",
        bars: [
          { label: "No loader", value: 101, shown: "101 queries", tone: "bad" },
          { label: "With a loader", value: 2, shown: "2 queries", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Which API style?",
      line: "Match the style to who calls it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Public API", tone: "info", why: "REST over JSON" },
          { label: "Internal streaming", tone: "info", why: "gRPC over HTTP/2" },
          { label: "Varied clients", tone: "info", why: "GraphQL, with limits" },
        ],
      },
    },
    {
      tag: "skip",
      head: "Neither is a free upgrade",
      line: "Each one swaps a problem for another.",
      scene: {
        kind: "versus",
        left: { title: "GraphQL costs", points: ["N+1 queries", "Cost limits needed"] },
        right: { title: "gRPC costs", points: ["Browser needs a proxy", "Not human-readable"] },
      },
    },
  ],
};

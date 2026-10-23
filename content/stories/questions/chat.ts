import { getPrimer } from "../../primers";
import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// The realtime primer's picture (you, a chat server, your friend) shows asking again and again.
const poll = getPrimer("realtime")!.flow;

// A small inline picture of two gateways: store, ack, then route the message to whoever holds Bob's line.
const route: FlowSpec = {
  id: "story-chat-route",
  title: "A message across two gateways",
  description: "Alice's gateway stores the message, acks her, then pub/sub routes it to the gateway holding Bob's open line.",
  nodes: [
    { id: "alice", label: "Alice", kind: "client", col: 0, row: 0 },
    { id: "gw1", label: "Gateway 1", kind: "gateway", col: 1, row: 0 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
    { id: "redis", label: "Pub/sub", kind: "pubsub", col: 2, row: 0 },
    { id: "gw2", label: "Gateway 2", kind: "gateway", col: 3, row: 0 },
    { id: "bob", label: "Bob", kind: "client", col: 4, row: 0 },
  ],
  edges: [
    { from: "alice", to: "gw1" },
    { from: "gw1", to: "db", label: "store" },
    { from: "gw1", to: "redis", label: "publish" },
    { from: "redis", to: "gw2", label: "route" },
    { from: "gw2", to: "bob" },
    { from: "gw2", to: "db", label: "sync" },
  ],
  scenarios: [
    {
      id: "send",
      name: "Send",
      steps: [
        { edge: "alice>gw1", caption: "Alice sends a message down her open line." },
        { edge: "gw1>db", caption: "Store first. The message is now safe.", mark: [{ node: "db", state: "ok" }] },
        { edge: "alice>gw1", reverse: true, tone: "ok", caption: "Then ack. Alice sees one tick." },
        { edge: "gw1>redis", caption: "Publish to Bob's channel." },
        { edge: "redis>gw2", caption: "Pub/sub finds the gateway holding Bob's line." },
        { edge: "gw2>bob", tone: "ok", caption: "Pushed down Bob's open line, well under 200 ms.", mark: [{ node: "bob", state: "ok" }] },
      ],
    },
    {
      id: "offline",
      name: "Bob was offline",
      steps: [
        { edge: "gw2>bob", tone: "error", caption: "Bob is offline. The push has nowhere to go.", mark: [{ node: "bob", state: "down" }] },
        { edge: "gw1>db", caption: "The message is already stored, so nothing is lost.", mark: [{ node: "db", state: "ok" }] },
        { edge: "gw2>bob", reverse: true, caption: "Bob reconnects and asks: anything after message 1042?", mark: [{ node: "bob", state: null }] },
        { edge: "gw2>db", caption: "The gateway reads what he missed." },
        { edge: "gw2>bob", tone: "ok", caption: "Missed messages arrive. Sync also repairs any lost live one.", mark: [{ node: "bob", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Asking again and again",
      line: "Most trips come back empty. A new message waits for the next ask.",
      scene: { kind: "flow", spec: poll, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Polling melts as users grow",
      line: "Everyone asks every 5 seconds. Drag the crowd.",
      scene: {
        kind: "meter",
        label: "Users polling",
        unit: "users",
        min: 100,
        max: 10000000,
        start: 10000000,
        log: true,
        stops: [
          { upTo: 1000, verdict: "About 200 requests a second. Polling is fine.", tone: "good" },
          { upTo: 100000, verdict: "About 20,000 a second, mostly empty. Try long polling.", tone: "warn" },
          { upTo: 10000000, verdict: "2 million requests a second. Use WebSockets.", tone: "bad" },
        ],
      },
      predict: { q: "10 million users poll every 5 seconds. Requests per second?", options: ["20,000", "200,000", "2 million"], answer: 2, why: "10 million divided by 5 seconds is 2 million asks every second." },
    },
    {
      tag: "sum",
      head: "Open lines are the real cost",
      line: "Only 23K messages a second, but every online user holds a line.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Open sockets", value: "10 million" },
          { label: "Per gateway", value: "~50K" },
        ],
        result: { label: "Gateways", value: "~200" },
        verdict: { text: "Connections shape the design", tone: "info" },
      },
    },
    {
      tag: "idea",
      head: "Store, ack, then route",
      line: "Gateways only hold lines. Pub/sub hands each message to the right one.",
      scene: { kind: "flow", spec: route, scenario: "send" },
    },
    {
      tag: "choose",
      head: "When do you ack Alice?",
      line: "The tick tells her the message is safe.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Ack, then store", tone: "bad", why: "A crash loses an acked message" },
          { label: "Send, then store", tone: "bad", why: "Bob may read a message that vanishes" },
          { label: "Store, ack, send", tone: "good", why: "An ack always means safe" },
        ],
      },
      predict: { q: "When should the server ack Alice?", options: ["Before storing", "After storing"], answer: 1, why: "Store first, so an acked message survives any crash." },
    },
    {
      tag: "catch",
      head: "A lost ack means a retry",
      line: "Alice never saw the tick, so she sends again.",
      scene: {
        kind: "versus",
        left: { title: "No client id", points: ["Ack is lost", "Alice sends again", "Bob sees it twice"] },
        right: { title: "With a client id", points: ["Same id on the retry", "A unique index spots it", "Server just re-acks"] },
      },
    },
    {
      tag: "catch",
      head: "Bob was offline",
      line: "A push can miss. The database is the truth, so Bob syncs on reconnect.",
      scene: { kind: "flow", spec: route, scenario: "offline" },
    },
    {
      tag: "skip",
      head: "Small apps can keep polling",
      line: "Sockets cost memory and reconnect work. Use them when speed matters.",
      scene: {
        kind: "versus",
        left: { title: "Poll instead", points: ["Around 1,000 users", "Seconds late is fine", "No open lines to run"] },
        right: { title: "Use sockets", points: ["Instant replies expected", "Many thousands of users", "Two-way features"] },
      },
    },
  ],
};

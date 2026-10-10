import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const realtimeTechniques: SequenceSpec = {
  id: "realtime-techniques",
  title: "Four ways to deliver the same three events",
  description:
    "Three events happen on the server at t = 1, 3 and 6 seconds. Pick a technique to see how many requests it costs and when the client actually learns about each event.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
    { id: "bus", label: "Event bus", kind: "pubsub" },
  ],
  items: [
    {
      alt: [
        {
          when: "Short polling",
          items: [
            { note: "Poll every 5 s. Events at t = 1, 3 and 6 s.", over: ["client", "server"] },
            { from: "client", to: "server", label: "GET /updates (t = 0)", type: "call" },
            { from: "server", to: "client", label: "200 [] nothing new", type: "reply" },
            { from: "bus", to: "server", label: "event A (t = 1 s)", type: "async" },
            { from: "bus", to: "server", label: "event B (t = 3 s)", type: "async" },
            { from: "client", to: "server", label: "GET /updates (t = 5 s)", type: "call" },
            { from: "server", to: "client", label: "200 [A, B]: A is 4 s late", type: "reply" },
            { from: "bus", to: "server", label: "event C (t = 6 s)", type: "async" },
            { from: "client", to: "server", label: "GET /updates (t = 10 s)", type: "call" },
            { from: "server", to: "client", label: "200 [C]: 4 s late", type: "reply" },
            { note: "3 requests, 1 of them empty. Average delay is about half the interval.", over: ["client", "server", "bus"] },
          ],
        },
        {
          when: "Long polling",
          items: [
            { from: "client", to: "server", label: "GET /events?since=0", type: "call" },
            { note: "held open, up to 30 s", over: ["server"] },
            { from: "bus", to: "server", label: "event A (t = 1 s)", type: "async" },
            { from: "server", to: "client", label: "200 [A] at t = 1 s", type: "reply" },
            { from: "client", to: "server", label: "GET /events?since=1", type: "call" },
            { from: "bus", to: "server", label: "event B (t = 3 s)", type: "async" },
            { from: "server", to: "client", label: "200 [B] at t = 3 s", type: "reply" },
            { from: "client", to: "server", label: "GET /events?since=2", type: "call" },
            { from: "bus", to: "server", label: "event C (t = 6 s)", type: "async" },
            { from: "server", to: "client", label: "200 [C] at t = 6 s", type: "reply" },
            { from: "client", to: "server", label: "GET /events?since=3", type: "call" },
            { note: "Near real time, but every event costs a full HTTP request and response.", over: ["client", "server", "bus"] },
          ],
        },
        {
          when: "SSE",
          items: [
            { from: "client", to: "server", label: "GET /stream (EventSource)", type: "call" },
            { from: "server", to: "client", label: "200 text/event-stream", type: "reply" },
            { from: "bus", to: "server", label: "event A (t = 1 s)", type: "async" },
            { from: "server", to: "client", label: "id: 1 · data: A", type: "async" },
            { from: "bus", to: "server", label: "event B (t = 3 s)", type: "async" },
            { from: "server", to: "client", label: "id: 2 · data: B", type: "async" },
            { from: "server", to: "client", label: ": ping (heartbeat)", type: "async" },
            { note: "Network blip: the stream drops at t = 5 s", over: ["client", "server"] },
            { from: "bus", to: "server", label: "event C (t = 6 s)", type: "async" },
            { from: "client", to: "server", label: "GET · Last-Event-ID: 2", type: "call" },
            { from: "server", to: "client", label: "replay id: 3 · data: C", type: "async" },
            { note: "One request, one-way, real time. Resume after a drop is built in.", over: ["client", "server", "bus"] },
          ],
        },
        {
          when: "WebSocket",
          items: [
            { from: "client", to: "server", label: "GET · Upgrade: websocket", type: "call" },
            { from: "server", to: "client", label: "101 Switching Protocols", type: "reply" },
            { from: "bus", to: "server", label: "event A (t = 1 s)", type: "async" },
            { from: "server", to: "client", label: "frame: A", type: "async" },
            { from: "client", to: "server", label: "frame: typing…", type: "async" },
            { from: "bus", to: "server", label: "event B (t = 3 s)", type: "async" },
            { from: "server", to: "client", label: "frame: B", type: "async" },
            { from: "server", to: "client", label: "ping", type: "async" },
            { from: "client", to: "server", label: "pong", type: "async" },
            { from: "bus", to: "server", label: "event C (t = 6 s)", type: "async" },
            { from: "server", to: "client", label: "frame: C", type: "async" },
            { note: "Both directions on one socket. Reconnect and resume are up to you.", over: ["client", "server", "bus"] },
          ],
        },
      ],
    },
  ],
};

export const wsScaling: FlowSpec = {
  id: "ws-scaling",
  title: "WebSockets across several servers",
  description:
    "Alice and Bob hold sockets on different gateway nodes. A Redis pub/sub backplane carries messages between nodes, heartbeats find dead peers, and deploys drain sockets gracefully.",
  nodes: [
    { id: "alice", label: "Alice", kind: "client", col: 0, row: 0 },
    { id: "bob", label: "Bob", kind: "client", col: 0, row: 2 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1, sub: "L4 / Upgrade" },
    { id: "ws1", label: "WS node 1", kind: "service", col: 2, row: 0, sub: "~50K sockets" },
    { id: "ws2", label: "WS node 2", kind: "service", col: 2, row: 2, sub: "~50K sockets" },
    { id: "redis", label: "Redis pub/sub", kind: "pubsub", col: 3, row: 1, sub: "backplane" },
  ],
  edges: [
    { from: "alice", to: "lb" },
    { from: "bob", to: "lb" },
    { from: "lb", to: "ws1" },
    { from: "lb", to: "ws2" },
    { from: "ws1", to: "redis", label: "publish", style: "async" },
    { from: "ws2", to: "redis", label: "subscribe", style: "async" },
  ],
  scenarios: [
    {
      id: "cross-node",
      name: "Message across nodes",
      steps: [
        { edge: "alice>lb", caption: "Alice sends a chat message to Bob over her open socket." },
        { edge: "lb>ws1", caption: "Her socket lives on node 1. Bob's socket lives on node 2, so node 1 can't write to it directly." },
        { edge: "ws1>redis", caption: "Node 1 publishes the message to the channel user:bob." },
        { edge: "ws2>redis", reverse: true, tone: "ok", caption: "Node 2 subscribed to user:bob when Bob connected, so it receives the message." },
        { edge: "lb>ws2", reverse: true, caption: "Node 2 writes a frame to Bob's socket." },
        { edge: "bob>lb", reverse: true, tone: "ok", caption: "Bob sees the message. Because every message goes through pub/sub, no sticky sessions are needed." },
      ],
    },
    {
      id: "heartbeat",
      name: "Dead peer",
      steps: [
        { edge: "lb>ws1", reverse: true, caption: "Every 30 s node 1 pings each of its sockets." },
        {
          edge: "alice>lb",
          reverse: true,
          tone: "miss",
          caption: "Alice's laptop went to sleep, so the ping goes unanswered. No error is raised: a dead TCP peer is silent.",
          mark: [{ node: "alice", state: "down" }],
        },
        { edge: "lb>ws1", reverse: true, tone: "error", caption: "No pong by the next round, so node 1 terminates the socket and frees its memory and file descriptor." },
        { edge: "ws1>redis", caption: "It also unsubscribes from user:alice. Without heartbeats, dead sockets would pile up until the node ran out of memory." },
      ],
    },
    {
      id: "deploy",
      name: "Deploy drain",
      steps: [
        { edge: "lb>ws1", caption: "Node 1 receives SIGTERM. Its readiness check fails, so the load balancer sends it no new sockets.", mark: [{ node: "ws1", state: "busy" }] },
        {
          edge: "lb>ws1",
          reverse: true,
          caption: "Node 1 sends close frame 1001 (going away) to all of its sockets.",
          with: [{ edge: "alice>lb", reverse: true, caption: "" }],
        },
        { edge: "alice>lb", caption: "Each client waits a random 0–N s (full jitter) before reconnecting, so node 2 isn't hit by 50K handshakes in one second.", ms: 1800 },
        { edge: "lb>ws2", caption: "The load balancer routes the reconnect to node 2.", mark: [{ node: "ws1", state: "down" }] },
        { edge: "ws2>redis", caption: "Node 2 subscribes to user:alice. The client sends its last seen message id, and node 2 replays anything newer.", mark: [{ node: "ws2", state: "ok" }] },
      ],
    },
  ],
};

export const webhookDelivery: SequenceSpec = {
  id: "webhook-delivery",
  title: "Receiving a webhook reliably",
  description:
    "The provider calls your endpoint. You verify the signature, enqueue the event, acknowledge within a second, and process it idempotently, because the provider will retry.",
  actors: [
    { id: "provider", label: "Provider", kind: "external" },
    { id: "api", label: "Webhook API", kind: "gateway" },
    { id: "queue", label: "Queue", kind: "queue" },
    { id: "worker", label: "Worker", kind: "worker" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "provider", to: "api", label: "POST /webhook (evt_42)", type: "call" },
    { from: "api", to: "api", label: "verify HMAC + timestamp", type: "call" },
    {
      alt: [
        {
          when: "Valid",
          items: [
            { from: "api", to: "queue", label: "enqueue evt_42", type: "async" },
            { from: "api", to: "provider", label: "200 OK in ~50 ms", type: "reply" },
            { from: "queue", to: "worker", label: "deliver evt_42", type: "async" },
            { from: "worker", to: "db", label: "INSERT processed(evt_42)", type: "call" },
            { from: "db", to: "worker", label: "new: do the work", type: "reply" },
          ],
        },
        {
          when: "Bad signature",
          items: [
            { from: "api", to: "provider", label: "401 Unauthorized", type: "reply" },
            { note: "Forged, or replayed after 5 minutes: nothing is enqueued", over: ["provider", "api", "queue"] },
          ],
        },
        {
          when: "Duplicate",
          items: [
            { note: "Our 200 was lost on the way back, so the provider retries", over: ["provider", "api", "queue"] },
            { from: "provider", to: "api", label: "POST /webhook (evt_42 again)", type: "call" },
            { from: "api", to: "queue", label: "enqueue evt_42", type: "async" },
            { from: "api", to: "provider", label: "200 OK", type: "reply" },
            { from: "queue", to: "worker", label: "deliver evt_42", type: "async" },
            { from: "worker", to: "db", label: "INSERT processed(evt_42)", type: "call" },
            { from: "db", to: "worker", label: "conflict: already done", type: "reply" },
            { note: "The unique key turns the retry into a no-op", over: ["worker", "db"] },
          ],
        },
      ],
    },
  ],
};

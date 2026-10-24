import type { DecisionSpec, FlowSpec, SequenceSpec } from "@/components/diagram/types";

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

/* ---------- Picking a technique ---------- */

export const transportPicker: DecisionSpec = {
  id: "transport-picker",
  title: "Which delivery technique?",
  start: "consumer",
  nodes: {
    consumer: { q: "Is the receiver another server, not a browser or app?", yes: "webhook", no: "delay" },
    webhook: {
      result: "Webhook",
      why: "The provider POSTs to your endpoint. Verify the signature, acknowledge fast, process idempotently, and reconcile by polling.",
    },
    delay: { q: "Is a delay of 10 to 30 seconds fine?", yes: "poll", no: "talks" },
    poll: {
      result: "Short polling (the default)",
      why: "A timer and a fetch. 1,000 dashboards on a 30 s timer is about 33 requests per second. Move only when users notice.",
    },
    talks: { q: "Does the client send messages often, like chat or cursors?", yes: "ws", no: "stream" },
    ws: {
      result: "WebSocket",
      why: "One two-way socket. You own heartbeats, reconnect, resume and a pub/sub backplane to scale it.",
    },
    stream: { q: "Can your proxies and load balancer stream a long response?", yes: "sse", no: "long" },
    sse: {
      result: "Server-Sent Events",
      why: "Plain HTTP, one-way, with automatic reconnect and Last-Event-ID resume built into EventSource.",
    },
    long: {
      result: "Long polling",
      why: "Works everywhere plain HTTP works. Each event costs a full request, and you must close the subscribe-then-read gap.",
    },
  },
};

/* ---------- Short polling ---------- */

export const shortPolling: FlowSpec = {
  id: "short-polling",
  title: "Short polling, three polls",
  description:
    "A timer asks the API for the latest version. Usually nothing changed and a 304 comes back. Play the third story to see why 100,000 tabs on the same clock minute hurt.",
  nodes: [
    { id: "browser", label: "Browser", kind: "client", col: 0, row: 1, sub: "every 30 s" },
    { id: "api", label: "API", kind: "service", col: 1, row: 1 },
    { id: "store", label: "Redis", kind: "cache", col: 2, row: 1, sub: "version 41" },
  ],
  edges: [
    { from: "browser", to: "api", label: "poll" },
    { from: "api", to: "store", label: "version" },
  ],
  scenarios: [
    {
      id: "unchanged",
      name: "Nothing changed",
      steps: [
        { edge: "browser>api", caption: "The timer fires: GET /status with If-None-Match set to version 41." },
        { edge: "api>store", caption: "The API checks the current version. It reads one small key, not the full data." },
        { edge: "api>store", reverse: true, tone: "ok", caption: "Still version 41.", mark: [{ node: "store", state: "hit" }] },
        { edge: "browser>api", reverse: true, tone: "ok", caption: "304 Not Modified: headers only, no body. The next poll is scheduled after this reply, 30 s later." },
      ],
    },
    {
      id: "changed",
      name: "Something changed",
      steps: [
        { edge: "browser>api", caption: "The next poll arrives. The score changed 4 s ago." },
        { edge: "api>store", caption: "The API reads the version." },
        { edge: "api>store", reverse: true, tone: "miss", caption: "It is now version 42, not 41.", mark: [{ node: "store", state: "miss" }] },
        { edge: "browser>api", reverse: true, tone: "ok", caption: "200 with the new body and ETag 42. This user waited 4 s: delay is at most one interval, 15 s on average at 30 s." },
      ],
    },
    {
      id: "herd",
      name: "Polls in lockstep",
      steps: [
        {
          edge: "browser>api",
          tone: "miss",
          caption: "Midnight. 100,000 tabs scheduled their poll on the clock minute, so every one fires in the same second.",
          with: [{ edge: "browser>api", tone: "miss", caption: "" }, { edge: "browser>api", tone: "miss", caption: "" }],
          mark: [{ node: "api", state: "busy" }],
        },
        { edge: "api>store", tone: "error", caption: "The API sees a spike of 100,000 requests in one second, then silence. Capacity must fit the spike, not the average." },
        {
          edge: "browser>api",
          caption: "Fix: start each tab at a random offset in the interval, and schedule the next poll after the reply. The load flattens to about 3,300 per second.",
          mark: [{ node: "api", state: null }],
        },
      ],
    },
  ],
};

/* ---------- Long polling ---------- */

export const longPolling: SequenceSpec = {
  id: "long-polling",
  title: "Long polling: wait for news",
  description:
    "The client asks with a cursor and the server holds the request until there is news or the timeout passes. The last two tabs show the subscribe-then-read gap bug and its fix.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
    { id: "bus", label: "Event bus", kind: "pubsub" },
  ],
  items: [
    {
      alt: [
        {
          when: "Event arrives",
          items: [
            { from: "client", to: "server", label: "GET /events?since=41", type: "call" },
            { note: "held open, up to 30 s", over: ["server"] },
            { from: "bus", to: "server", label: "event 42 (4 s later)", type: "async" },
            { from: "server", to: "client", label: "200 [42] at once", type: "reply" },
            { from: "client", to: "server", label: "GET /events?since=42", type: "call" },
            { note: "The client re-asks immediately, with the cursor of the last event it has.", over: ["client", "server"] },
          ],
        },
        {
          when: "30 s timeout",
          items: [
            { from: "client", to: "server", label: "GET /events?since=42", type: "call" },
            { note: "30 s pass and nothing happens", over: ["server"] },
            { from: "server", to: "client", label: "204 No Content", type: "reply" },
            { from: "client", to: "server", label: "GET /events?since=42", type: "call" },
            { note: "Silence still costs one request per client per 30 s: 100K clients is about 3,300 requests per second.", over: ["client", "server"] },
          ],
        },
        {
          when: "Gap bug",
          items: [
            { from: "client", to: "server", label: "GET /events?since=41", type: "call" },
            { from: "server", to: "server", label: "1. read backlog: empty", type: "call" },
            { from: "bus", to: "server", label: "event 42 published", type: "async" },
            { from: "server", to: "bus", label: "2. subscribe (too late)", type: "call" },
            { note: "Event 42 fell between the read and the subscribe. The client waits 30 s, then asks again. If events are not stored, it is lost for good.", over: ["client", "server", "bus"] },
          ],
        },
        {
          when: "Fix: subscribe first",
          items: [
            { from: "client", to: "server", label: "GET /events?since=41", type: "call" },
            { from: "server", to: "bus", label: "1. subscribe, buffer live", type: "call" },
            { from: "server", to: "server", label: "2. read backlog after 41", type: "call" },
            { from: "bus", to: "server", label: "event 42 (buffered)", type: "async" },
            { from: "server", to: "client", label: "200 [backlog + 42], no dupes", type: "reply" },
            { note: "Subscribe first, read second, drop buffered ids already in the backlog.", over: ["client", "server", "bus"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- Server-Sent Events ---------- */

export const sseStream: FlowSpec = {
  id: "sse-stream",
  title: "One SSE stream through a proxy",
  description:
    "The browser opens one long response. Events flow down it. After a drop, EventSource reconnects with Last-Event-ID and the server replays from an event log. A buffering proxy is the classic way to break it.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1, sub: "EventSource" },
    { id: "proxy", label: "Proxy", kind: "lb", col: 1, row: 1, sub: "nginx / LB" },
    { id: "sse", label: "SSE node", kind: "service", col: 2, row: 1, sub: "~50K streams" },
    { id: "log", label: "Event log", kind: "queue", col: 3, row: 1, sub: "ids 1..N" },
  ],
  edges: [
    { from: "client", to: "proxy" },
    { from: "proxy", to: "sse" },
    { from: "sse", to: "log" },
  ],
  scenarios: [
    {
      id: "live",
      name: "Live stream",
      steps: [
        { edge: "client>proxy", caption: "EventSource opens GET /stream. It is one ordinary HTTP request that never finishes." },
        { edge: "proxy>sse", caption: "The proxy forwards it. The node answers 200 with Content-Type text/event-stream and keeps the response open." },
        { edge: "proxy>sse", reverse: true, tone: "ok", caption: "Event 41 is written as id: 41 and data: ... and flushed at once." },
        { edge: "client>proxy", reverse: true, tone: "ok", caption: "The browser fires a message event. No new request, no new headers." },
        { edge: "client>proxy", reverse: true, caption: "Every 15 s a : ping comment keeps idle timeouts from closing the stream." },
      ],
    },
    {
      id: "resume",
      name: "Drop and resume",
      steps: [
        { edge: "client>proxy", reverse: true, tone: "ok", caption: "Events 41 and 42 arrive. The browser remembers id 42." },
        { edge: "client>proxy", tone: "error", caption: "The Wi-Fi drops. The stream closes with no error the server can act on.", mark: [{ node: "client", state: "down" }] },
        { edge: "client>proxy", caption: "After a short delay (the server can set it with retry:), EventSource reconnects by itself and sends Last-Event-ID: 42.", mark: [{ node: "client", state: null }] },
        { edge: "sse>log", caption: "The node asks the log for every id after 42." },
        { edge: "sse>log", reverse: true, tone: "ok", caption: "The log returns 43 and 44." },
        { edge: "client>proxy", reverse: true, tone: "ok", caption: "The node replays 43 and 44, then goes live. Nothing was missed." },
      ],
    },
    {
      id: "buffering",
      name: "Buffering proxy",
      steps: [
        { edge: "proxy>sse", reverse: true, caption: "The node writes event 43 to the stream." , mark: [{ node: "proxy", state: "busy" }] },
        { edge: "client>proxy", reverse: true, tone: "miss", caption: "The proxy buffers the response until its buffer fills, so nothing reaches the browser. The feed looks frozen." },
        { edge: "client>proxy", tone: "error", caption: "After about 60 s of silence the proxy's read timeout fires and closes the stream. Many proxies default to 60 s.", mark: [{ node: "client", state: "down" }] },
        {
          edge: "proxy>sse",
          reverse: true,
          tone: "ok",
          caption: "Fix: send X-Accel-Buffering: no (nginx), disable buffering on the route, and ping every 15 s. Events now flow through.",
          mark: [{ node: "proxy", state: "ok" }, { node: "client", state: null }],
        },
      ],
    },
  ],
};

/* ---------- WebSocket lifecycle ---------- */

export const wsLifecycle: SequenceSpec = {
  id: "ws-lifecycle",
  title: "A WebSocket from connect to resume",
  description:
    "The upgrade is authenticated once, frames flow both ways, heartbeats catch a silent drop, and the client resumes from its last message id after reconnecting.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "gw", label: "WS gateway", kind: "gateway" },
    { id: "store", label: "Message log", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "Connect and talk",
          items: [
            { from: "client", to: "gw", label: "GET /chat · Upgrade: websocket", type: "call" },
            { from: "gw", to: "gw", label: "check cookie and Origin", type: "call" },
            { from: "gw", to: "client", label: "101 Switching Protocols", type: "reply" },
            { note: "Same TCP connection, now two-way frames", over: ["client", "gw"] },
            { from: "client", to: "gw", label: "frame: join room 7", type: "async" },
            { from: "gw", to: "client", label: "frame: msg 88", type: "async" },
            { from: "client", to: "gw", label: "frame: my message", type: "async" },
            { from: "gw", to: "client", label: "ping (every ~30 s)", type: "async" },
            { from: "client", to: "gw", label: "pong", type: "async" },
          ],
        },
        {
          when: "Drop and resume",
          items: [
            { note: "The train enters a tunnel. No close frame, no error.", over: ["client", "gw"] },
            { from: "gw", to: "client", label: "ping, no pong", type: "async" },
            { from: "gw", to: "gw", label: "terminate, free memory", type: "call" },
            { from: "client", to: "gw", label: "reconnect after jittered wait", type: "call" },
            { from: "gw", to: "client", label: "101 Switching Protocols", type: "reply" },
            { from: "client", to: "gw", label: "frame: resume, last id 88", type: "async" },
            { from: "gw", to: "store", label: "messages after 88?", type: "call" },
            { from: "store", to: "gw", label: "89, 90, 91", type: "reply" },
            { from: "gw", to: "client", label: "frames 89, 90, 91, then live", type: "async" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Pub/sub fan-out ---------- */

export const roomFanout: FlowSpec = {
  id: "room-fanout",
  title: "Fan-out to a room of 10,000",
  description:
    "One message is published once. Redis delivers one copy per gateway node that has subscribers, and each node writes to its own local sockets. Redis pub/sub does not store messages for a node that is offline.",
  nodes: [
    { id: "sender", label: "Sender", kind: "client", col: 0, row: 1 },
    { id: "ws1", label: "WS node 1", kind: "service", col: 1, row: 1 },
    { id: "bus", label: "Redis pub/sub", kind: "pubsub", col: 2, row: 1, sub: "room:7" },
    { id: "ws2", label: "WS node 2", kind: "service", col: 3, row: 0, sub: "~5K members" },
    { id: "ws3", label: "WS node 3", kind: "service", col: 3, row: 2, sub: "~5K members" },
    { id: "room", label: "10K members", kind: "client", col: 4, row: 1 },
  ],
  edges: [
    { from: "sender", to: "ws1" },
    { from: "ws1", to: "bus", label: "publish", style: "async" },
    { from: "bus", to: "ws2", label: "deliver", style: "async" },
    { from: "bus", to: "ws3", label: "deliver", style: "async" },
    { from: "ws2", to: "room" },
    { from: "ws3", to: "room" },
  ],
  scenarios: [
    {
      id: "room",
      name: "Room message",
      steps: [
        { edge: "sender>ws1", caption: "Alice posts to room 7. Its 10,000 members hold sockets on nodes 2 and 3." },
        { edge: "ws1>bus", caption: "Node 1 publishes once to the channel room:7. It does not look up 10,000 sockets." },
        {
          edge: "bus>ws2",
          caption: "Redis delivers one copy to each node subscribed to room:7. That is 2 deliveries, not 10,000.",
          with: [{ edge: "bus>ws3", caption: "" }],
        },
        {
          edge: "ws2>room",
          tone: "ok",
          caption: "Each node loops over its own local sockets and writes about 5,000 frames. Total socket writes: 10,000, spread across the fleet.",
          with: [{ edge: "ws3>room", tone: "ok", caption: "" }],
        },
      ],
    },
    {
      id: "offline",
      name: "Node misses it",
      steps: [
        { edge: "bus>ws3", tone: "error", caption: "Node 3 lost its Redis connection for 4 s.", mark: [{ node: "ws3", state: "down" }] },
        { edge: "sender>ws1", caption: "Alice sends a message during those 4 s." },
        { edge: "ws1>bus", caption: "Node 1 publishes to room:7." },
        { edge: "bus>ws2", caption: "Node 2 receives it and delivers it.", tone: "ok" },
        { edge: "bus>ws3", tone: "error", caption: "Redis pub/sub is fire and forget: nothing is queued for a subscriber that is not connected. Node 3's 5,000 members never get it." },
        {
          edge: "ws3>room",
          tone: "ok",
          caption: "Fix: write each message to a log with an id before publishing. Clients resume by last id and node 3 replays the gap.",
          mark: [{ node: "ws3", state: "ok" }],
        },
      ],
    },
  ],
};

/* ---------- Sticky sessions or not ---------- */

export const stickySockets: FlowSpec = {
  id: "sticky-sockets",
  title: "Where does socket state live?",
  description:
    "A socket is pinned to one node, but its state does not have to be. Keep rooms and sessions in Redis and any node can take the reconnect.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
    { id: "a", label: "Node A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Node B", kind: "service", col: 2, row: 2 },
    { id: "state", label: "Redis", kind: "cache", col: 3, row: 1, sub: "rooms, session" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "a", to: "state", label: "save" },
    { from: "b", to: "state", label: "load" },
  ],
  scenarios: [
    {
      id: "memory",
      name: "State in memory",
      steps: [
        { edge: "client>lb", caption: "The client connects. Round robin picks node A." },
        { edge: "lb>a", caption: "Node A keeps the user's joined rooms (3 and 7) in a local map. Nothing is shared." },
        { edge: "lb>a", reverse: true, tone: "error", caption: "Node A restarts for a deploy. The socket and the map are gone.", mark: [{ node: "a", state: "down" }] },
        { edge: "lb>b", caption: "The client reconnects. Without stickiness it lands on node B." },
        { edge: "lb>b", reverse: true, tone: "miss", caption: "Node B has no record of rooms 3 and 7, so the user sees an empty chat until the client rejoins." },
      ],
    },
    {
      id: "redis",
      name: "State in Redis",
      steps: [
        { edge: "client>lb", caption: "The client connects and lands on node A." },
        { edge: "a>state", caption: "On join, node A saves rooms 3 and 7 for this user to Redis." },
        { edge: "lb>a", reverse: true, tone: "error", caption: "Node A restarts for a deploy.", mark: [{ node: "a", state: "down" }] },
        { edge: "lb>b", caption: "The client reconnects. Any node will do, so no sticky sessions are needed." },
        { edge: "b>state", caption: "Node B loads the user's rooms from Redis." },
        { edge: "b>state", reverse: true, tone: "ok", caption: "Rooms 3 and 7 come back. Node B resubscribes and resumes from the last id.", mark: [{ node: "b", state: "ok" }] },
      ],
    },
  ],
};

/* ---------- Webhooks that go missing ---------- */

export const webhookRetries: FlowSpec = {
  id: "webhook-retries",
  title: "When a webhook is late or lost",
  description:
    "The provider retries a failed delivery on a schedule. If it gives up, or never retries, a reconcile job polls the provider API and fills the gap.",
  nodes: [
    { id: "provider", label: "Provider", kind: "external", col: 0, row: 1 },
    { id: "api", label: "Your endpoint", kind: "gateway", col: 1, row: 1 },
    { id: "queue", label: "Queue", kind: "queue", col: 2, row: 1 },
    { id: "recon", label: "Reconcile job", kind: "worker", col: 1, row: 2, sub: "hourly" },
  ],
  edges: [
    { from: "provider", to: "api", label: "POST" },
    { from: "api", to: "queue", label: "enqueue", style: "async" },
    { from: "recon", to: "provider", label: "list" },
    { from: "recon", to: "queue", label: "enqueue", style: "async" },
  ],
  scenarios: [
    {
      id: "retry",
      name: "Endpoint down, retried",
      steps: [
        { edge: "provider>api", caption: "The provider POSTs evt_42 during your deploy." },
        { edge: "provider>api", reverse: true, tone: "error", caption: "503: the endpoint is down. The provider marks the delivery failed.", mark: [{ node: "api", state: "down" }] },
        { edge: "provider>api", caption: "It retries with growing delays: seconds, then minutes, then hours. Stripe keeps trying for up to three days.", ms: 1600 },
        { edge: "api>queue", caption: "The endpoint is back. It verifies the signature and enqueues evt_42.", mark: [{ node: "api", state: "ok" }] },
        { edge: "provider>api", reverse: true, tone: "ok", caption: "200 OK in about 50 ms. The provider stops retrying." },
      ],
    },
    {
      id: "reconcile",
      name: "Retries run out",
      steps: [
        { edge: "provider>api", tone: "error", caption: "An outage outlasts the retries, or the provider never retries (GitHub does not redeliver failed deliveries on its own).", mark: [{ node: "api", state: "down" }] },
        { edge: "recon>provider", caption: "An hourly job asks the provider API for events after the last id it saw." },
        { edge: "recon>provider", reverse: true, caption: "The provider returns evt_42 and evt_43.", tone: "ok" },
        { edge: "recon>queue", caption: "The job enqueues them. The unique key on the event id makes any already-processed one a no-op.", tone: "ok" },
      ],
    },
  ],
};

/* ---------- Reconnect storm ---------- */

export const reconnectStorm: FlowSpec = {
  id: "reconnect-storm",
  title: "Reconnect storm: with and without jitter",
  description:
    "One gateway node holding 50,000 sockets dies. If every client retries after the same delay, the 19 surviving nodes take 50,000 handshakes in one second. Spreading the retries over 30 s makes it about 1,700 per second.",
  nodes: [
    { id: "clients", label: "50K clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
    { id: "dead", label: "WS node 1", kind: "service", col: 2, row: 0, sub: "50K sockets" },
    { id: "rest", label: "Nodes 2 to 20", kind: "service", col: 2, row: 2, sub: "19 nodes" },
  ],
  edges: [
    { from: "clients", to: "lb" },
    { from: "lb", to: "dead" },
    { from: "lb", to: "rest" },
  ],
  scenarios: [
    {
      id: "nojitter",
      name: "No jitter",
      steps: [
        { edge: "lb>dead", tone: "error", caption: "Friday 20:00, kickoff. Node 1 crashes and drops all 50,000 of its sockets at the same instant.", mark: [{ node: "dead", state: "down" }] },
        {
          edge: "clients>lb",
          tone: "miss",
          caption: "Every client waits exactly 1 s, then reconnects. All 50,000 arrive in the same second.",
          with: [{ edge: "clients>lb", tone: "miss", caption: "" }, { edge: "clients>lb", tone: "miss", caption: "" }],
        },
        {
          edge: "lb>rest",
          tone: "error",
          caption: "50,000 handshakes over 19 nodes is about 2,600 each in one second. If a node accepts roughly 1,000 new connections per second (an assumption), it falls behind.",
          mark: [{ node: "rest", state: "busy" }],
        },
        { edge: "clients>lb", tone: "error", caption: "Handshakes time out, so clients retry together again. The storm repeats and can take down the nodes that were healthy." },
      ],
    },
    {
      id: "jitter",
      name: "Full jitter",
      steps: [
        { edge: "lb>dead", tone: "error", caption: "The same crash: 50,000 sockets drop.", mark: [{ node: "dead", state: "down" }] },
        { edge: "clients>lb", caption: "Each client picks a random wait between 0 and 30 s, then backs off further on repeated failures." },
        {
          edge: "lb>rest",
          tone: "ok",
          caption: "50,000 over 30 s is about 1,700 arrivals per second in total, around 90 per surviving node. Well under the 1,000 assumption.",
          with: [{ edge: "lb>rest", tone: "ok", caption: "" }],
          mark: [{ node: "rest", state: "ok" }],
        },
        { edge: "lb>rest", reverse: true, tone: "ok", caption: "Everyone is back in about 30 s and the nodes never saturated. The cost is that the last client waits up to 30 s." },
      ],
    },
  ],
};

/* ---------- Lost events ---------- */

export const lostEvents: SequenceSpec = {
  id: "lost-events",
  title: "Lost events and the fix",
  description:
    "A socket drops for six seconds. Without message ids the client never learns what it missed. With an id on every message and a log, it asks for everything after the last id.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
    { id: "log", label: "Event log", kind: "queue" },
  ],
  items: [
    {
      alt: [
        {
          when: "No ids: events lost",
          items: [
            { from: "server", to: "client", label: "msg: hello", type: "async" },
            { note: "Socket down for 6 s", over: ["client", "server"] },
            { from: "server", to: "client", label: "msg: A (nobody home)", type: "async" },
            { from: "server", to: "client", label: "msg: B (nobody home)", type: "async" },
            { from: "client", to: "server", label: "reconnect", type: "call" },
            { from: "server", to: "client", label: "msg: C", type: "async" },
            { note: "The client shows hello then C. Nothing tells it A and B exist.", over: ["client", "server"] },
          ],
        },
        {
          when: "Ids and replay",
          items: [
            { from: "server", to: "log", label: "append A as 42, B as 43", type: "async" },
            { note: "Socket down for 6 s. The log keeps 42 and 43.", over: ["client", "server"] },
            { from: "client", to: "server", label: "reconnect · last id 41", type: "call" },
            { from: "server", to: "log", label: "read after 41", type: "call" },
            { from: "log", to: "server", label: "42, 43", type: "reply" },
            { from: "server", to: "client", label: "replay 42, 43, then live 44", type: "async" },
            { note: "The client needs to store one number: the last id it saw. Delivery is at least once, so dedupe by id.", over: ["client", "server", "log"] },
          ],
        },
      ],
    },
  ],
};

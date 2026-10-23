import type { Primer } from "./types";

export const primer: Primer = {
  id: "realtime",
  title: "What are live updates?",
  idea: "Instead of asking the server again and again, keep one line open so the server can tell you the moment something happens.",
  doodle: "websocket",
  analogy:
    "Two tin cans joined by a string. Once the string is pulled tight, either side can speak at any moment, with no need to ring first.",
  flow: {
    id: "primer-realtime",
    title: "Asking again and again, or one open line",
    description: "Polling asks the server over and over. A WebSocket or server-sent events connection stays open so the server can speak first.",
    nodes: [
      { id: "you", label: "You", kind: "client", col: 0, row: 1 },
      { id: "server", label: "Chat server", kind: "service", col: 1, row: 1 },
      { id: "friend", label: "Your friend", kind: "client", col: 2, row: 1 },
    ],
    edges: [
      { from: "you", to: "server" },
      { from: "friend", to: "server" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a live connection",
        steps: [
          { edge: "you>server", caption: "Your phone asks: any new messages?" },
          { edge: "you>server", reverse: true, tone: "miss", caption: "No. That trip was wasted." },
          { edge: "you>server", caption: "Two seconds later it asks again." },
          { edge: "you>server", reverse: true, tone: "miss", caption: "No again. Most trips come back empty." },
          { edge: "friend>server", caption: "Your friend sends a message. The server can only hold it." },
          { edge: "you>server", caption: "Up to two seconds late, your phone asks again." },
          { edge: "you>server", reverse: true, tone: "ok", caption: "Only now do you see the message." },
        ],
      },
      {
        id: "with",
        name: "With a live connection",
        steps: [
          { edge: "you>server", caption: "Your phone opens one connection and leaves it open." },
          { edge: "friend>server", caption: "Your friend sends a message." },
          { edge: "you>server", reverse: true, tone: "ok", caption: "The server pushes it down the open line at once." },
          { edge: "you>server", reverse: true, tone: "ok", caption: "No asking and no waiting. Quiet moments cost almost nothing." },
        ],
      },
      {
        id: "drops",
        name: "When the line drops",
        steps: [
          {
            edge: "you>server",
            tone: "error",
            caption: "Your phone loses signal. The open line breaks.",
            mark: [{ node: "you", state: "down" }],
          },
          { edge: "friend>server", caption: "A message arrives while you are away." },
          { edge: "you>server", reverse: true, tone: "error", caption: "The server cannot push it, so it must keep it for you." },
          { edge: "you>server", caption: "Your phone reconnects and asks what it missed.", mark: [{ node: "you", state: null }] },
          { edge: "you>server", reverse: true, tone: "ok", caption: "The server sends the missed messages. Then pushing resumes." },
        ],
      },
    ],
  },
  remember: [
    "Asking over and over wastes trips and still arrives late.",
    "An open connection lets the server speak first.",
    "Use server-sent events for one-way updates, WebSockets for two-way.",
  ],
  whenToUse: "When people expect changes within a second, like chat or a delivery map. Asking every minute is fine for hourly reports.",
  theCatch: "Each open line holds server memory, so 100,000 chat users means 100,000 open lines, and every dropped line must catch up.",
  say: "For chat I would use WebSockets so the server can push. Clients reconnect and resume from the last message ID. For one-way feeds, server-sent events are simpler.",
  learnMore: [{ href: "/deep-dives/polling-sse-websockets", label: "Polling, SSE and WebSockets" }],
};

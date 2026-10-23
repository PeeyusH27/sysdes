import type { Primer } from "./types";

export const primer: Primer = {
  id: "pub-sub",
  title: "What is publish and subscribe?",
  idea: "Announce news once to a shared board, and every service that signed up for that kind of news hears it.",
  doodle: "pubsub",
  analogy:
    "Think of a radio tower. The station broadcasts once, and everyone tuned to that channel hears it, whether the station knows them or not.",
  flow: {
    id: "primer-pub-sub",
    title: "One announcement, many listeners",
    description: "Without a topic, Orders phones each service itself. With a topic, it announces once and the listeners hear it.",
    nodes: [
      { id: "orders", label: "Orders", kind: "service", col: 0, row: 1 },
      { id: "topic", label: "Topic", kind: "pubsub", col: 1, row: 1 },
      { id: "email", label: "Email", kind: "service", col: 2, row: 0 },
      { id: "analytics", label: "Analytics", kind: "service", col: 2, row: 1 },
      { id: "rewards", label: "Rewards", kind: "service", col: 2, row: 2 },
    ],
    edges: [
      { from: "orders", to: "email" },
      { from: "orders", to: "rewards" },
      { from: "orders", to: "topic", style: "async" },
      { from: "topic", to: "email", style: "async" },
      { from: "topic", to: "analytics", style: "async" },
      { from: "topic", to: "rewards", style: "async" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a topic",
        steps: [
          { edge: "orders>email", caption: "A customer orders. The Orders service phones Email itself." },
          { edge: "orders>email", reverse: true, tone: "ok", caption: "Email answers. One call done." },
          { edge: "orders>rewards", caption: "Now Orders phones Rewards too." },
          {
            edge: "orders>rewards",
            reverse: true,
            tone: "error",
            caption: "Rewards is down, and Orders is stuck waiting.",
            mark: [{ node: "rewards", state: "down" }, { node: "orders", state: "busy" }],
          },
          { edge: "orders>email", caption: "Each new service means changing Orders to call one more.", mark: [{ node: "orders", state: null }] },
        ],
      },
      {
        id: "with",
        name: "With a topic",
        steps: [
          { edge: "orders>topic", caption: "Orders announces once: \"order placed\". It does not know who listens." },
          {
            edge: "topic>email",
            caption: "The topic passes the news to everyone who subscribed.",
            with: [{ edge: "topic>rewards", caption: "" }, { edge: "topic>analytics", caption: "" }],
          },
          { edge: "topic>email", tone: "ok", caption: "Email hears it and sends the receipt.", mark: [{ node: "email", state: "hit" }] },
          {
            edge: "topic>rewards",
            tone: "error",
            caption: "Rewards is down, but Orders carries on without waiting.",
            mark: [{ node: "rewards", state: "down" }],
          },
          { edge: "topic>rewards", caption: "A topic that stores messages can hold the news until Rewards returns." },
        ],
      },
      {
        id: "unknown",
        name: "When nobody knows who listens",
        steps: [
          { edge: "orders>topic", caption: "Orders announces \"order placed\", as it always has." },
          {
            edge: "topic>analytics",
            caption: "A team added Analytics last month. It listens too.",
            mark: [{ node: "rewards", state: null }],
          },
          { edge: "orders>topic", caption: "Orders never changed, so it cannot say who got the news." },
          {
            edge: "topic>analytics",
            tone: "error",
            caption: "Change the message shape, and a listener you forgot about breaks.",
            mark: [{ node: "analytics", state: "down" }],
          },
        ],
      },
    ],
  },
  remember: [
    "The sender announces once and does not know who listens.",
    "Adding a listener never means changing the sender.",
    "Loose coupling is the gain, and hidden dependencies are the price.",
  ],
  whenToUse: "When one event, like order placed, feeds email, rewards and analytics, and more listeners will come later. One receiver? Call it directly.",
  theCatch: "Orders cannot see who listens, so renaming one field in the message can quietly break Analytics, which nobody remembered.",
  say: "I would publish an event to a topic so new consumers can subscribe without touching the producer. I would version messages, since I cannot see every subscriber.",
  learnMore: [
    { href: "/learn/async-messaging", label: "Async messaging" },
    { href: "/questions/chat", label: "Design a chat app" },
  ],
};

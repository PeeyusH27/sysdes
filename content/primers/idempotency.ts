import type { Primer } from "./types";

export const primer: Primer = {
  id: "idempotency",
  title: "What is idempotency?",
  idea: "Doing the same request twice has the same effect as doing it once, so retries and double taps are safe.",
  doodle: "idempotency",
  analogy:
    "A PAID stamp on a receipt: stamp it a second time and it still says paid once. A repeat tap should leave things as they are.",
  flow: {
    id: "primer-idempotency",
    title: "Tapping Pay twice",
    description: "A phone sends a payment to a shop, which charges a card company and remembers payment keys.",
    nodes: [
      { id: "phone", label: "Your phone", kind: "client", col: 0, row: 1 },
      { id: "shop", label: "Shop", kind: "service", col: 1, row: 1 },
      { id: "keys", label: "Seen keys", kind: "cache", col: 2, row: 0 },
      { id: "card", label: "Card company", kind: "external", col: 2, row: 2 },
    ],
    edges: [
      { from: "phone", to: "shop" },
      { from: "shop", to: "keys" },
      { from: "shop", to: "card" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a key",
        steps: [
          { edge: "phone>shop", caption: "You tap Pay on a slow connection." },
          { edge: "shop>card", caption: "The shop charges your card 20 dollars." },
          {
            edge: "phone>shop",
            reverse: true,
            tone: "error",
            caption: "The reply gets lost. Your screen still says loading.",
            mark: [{ node: "phone", state: "busy" }],
          },
          { edge: "phone>shop", caption: "You tap Pay again." },
          {
            edge: "shop>card",
            tone: "error",
            caption: "The shop sees a new request and charges another 20 dollars.",
            mark: [{ node: "card", state: "miss" }],
          },
          {
            edge: "phone>shop",
            reverse: true,
            tone: "error",
            caption: "You are charged 40 dollars for one order.",
            mark: [{ node: "phone", state: null }],
          },
        ],
      },
      {
        id: "with",
        name: "With a unique key",
        steps: [
          { edge: "phone>shop", caption: "Each payment carries its own unique key, like pay-7f3a." },
          { edge: "shop>keys", caption: "The shop checks whether it has seen that key. It has not." },
          {
            edge: "shop>card",
            tone: "ok",
            caption: "It charges your card 20 dollars once, then saves the result under the key.",
          },
          {
            edge: "phone>shop",
            reverse: true,
            tone: "error",
            caption: "The reply is lost, so you tap Pay again.",
          },
          { edge: "phone>shop", caption: "The retry arrives with the same key, pay-7f3a." },
          {
            edge: "shop>keys",
            reverse: true,
            tone: "ok",
            caption: "Seen it. The saved result is found, and the card is not touched.",
            mark: [{ node: "keys", state: "hit" }],
          },
          {
            edge: "phone>shop",
            reverse: true,
            tone: "ok",
            caption: "The shop replies with the saved result. You are charged once.",
            mark: [{ node: "keys", state: null }],
          },
        ],
      },
    ],
  },
  remember: [
    "Retries happen, so repeat requests must be safe.",
    "Make one unique key per action, and reuse it on retries.",
    "A repeat gets the saved result, not a second effect.",
  ],
  whenToUse: "On anything that charges money or creates an order, since a flaky connection makes people tap Pay twice. Reads are already safe.",
  theCatch: "The server must store every key and its saved result for a while, and a retry racing the first request needs care.",
  say: "I would make the payment endpoint idempotent: the client sends a unique key, the server stores the result under it, and any retry returns that same result.",
  learnMore: [
    { href: "/learn/api-load-balancing", label: "APIs and load balancing" },
    { href: "/questions/payment-system", label: "Design a payment system" },
  ],
};

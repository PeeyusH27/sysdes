import type { Primer } from "./types";

export const primer: Primer = {
  id: "api-gateway",
  title: "What is an API gateway?",
  idea: "Put one front door before your services. It checks who is knocking, limits how often, and sends each request where it belongs.",
  doodle: "api-gateway",
  analogy:
    "A doorman at the gate. He checks every ticket and counts how often you come, so the people inside can just do their jobs.",
  flow: {
    id: "primer-api-gateway",
    title: "Every service on its own, or one front door",
    description: "Without a gateway each service checks logins itself. With one, a single door checks, limits and routes.",
    nodes: [
      { id: "client", label: "Mobile app", kind: "client", col: 0, row: 1 },
      { id: "gateway", label: "Front door", kind: "gateway", col: 1, row: 1 },
      { id: "orders", label: "Orders", kind: "service", col: 2, row: 0 },
      { id: "payments", label: "Payments", kind: "service", col: 2, row: 2 },
    ],
    edges: [
      { from: "client", to: "orders" },
      { from: "client", to: "payments" },
      { from: "client", to: "gateway" },
      { from: "gateway", to: "orders" },
      { from: "gateway", to: "payments" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a gateway",
        steps: [
          { edge: "client>orders", caption: "The app calls Orders. Orders checks the login itself." },
          { edge: "client>orders", reverse: true, tone: "ok", caption: "Fine, but that check is now Orders' job." },
          { edge: "client>payments", caption: "Then the app calls Payments. Payments checks the login again." },
          {
            edge: "client>payments",
            reverse: true,
            tone: "error",
            caption: "Each team wrote its own check. Payments has a bug and lets a bad request in.",
            mark: [{ node: "payments", state: "down" }],
          },
        ],
      },
      {
        id: "with",
        name: "With a gateway",
        steps: [
          { edge: "client>gateway", caption: "Now every request goes to one front door first.", mark: [{ node: "payments", state: null }] },
          { edge: "client>gateway", reverse: true, tone: "error", caption: "A request with no valid login is turned away at the door." },
          { edge: "client>gateway", caption: "A good request arrives. The gateway checks the login and the limit." },
          { edge: "gateway>orders", caption: "It routes the request to the right service: Orders." },
          { edge: "gateway>orders", reverse: true, tone: "ok", caption: "Orders just does its job and answers." },
          { edge: "client>gateway", reverse: true, tone: "ok", caption: "The answer goes back out through the same door." },
        ],
      },
      {
        id: "down",
        name: "When the door is down",
        steps: [
          {
            edge: "client>gateway",
            tone: "error",
            caption: "The gateway goes down.",
            mark: [{ node: "gateway", state: "down" }],
          },
          { edge: "client>gateway", reverse: true, tone: "error", caption: "Every request is stuck at the door." },
          { edge: "gateway>payments", caption: "Orders and Payments are fine, but nobody can reach them." },
          { edge: "gateway>orders", caption: "So run several gateways behind a load balancer.", mark: [{ node: "gateway", state: null }] },
        ],
      },
    ],
  },
  remember: [
    "One front door handles login, limits and routing for everyone.",
    "Services stay simple because the shared chores live at the door.",
    "It is a single point of failure unless you run several.",
  ],
  whenToUse: "When ten services each need login checks and rate limits, do it once at a front door. With two, skip it.",
  theCatch: "Every request passes through it, so a slow or crashed gateway hurts all ten services at once, even if each is healthy.",
  say: "I would put a gateway in front for login checks, rate limits and routing, and run several copies behind a load balancer so it never fails alone.",
  learnMore: [{ href: "/learn/api-load-balancing", label: "APIs and load balancing" }],
};

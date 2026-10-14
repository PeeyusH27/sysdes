// Data for the home page and the site navigation. Lists are built from the registries, so a new lesson,
// question or pattern shows up in the menus and on the home page without touching this file.
import type { FlowSpec } from "@/components/diagram/types";
import { questions, type Question } from "./registry";
import { getPattern } from "./dsa/registry";

export const requestJourney: FlowSpec = {
  id: "request-journey",
  title: "A request's journey",
  description: "A request travels from the browser through the CDN and load balancer to a service, which reads Redis and falls back to Postgres on a miss.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 2, row: 1 },
    { id: "svc", label: "Service ×3", kind: "service", col: 3, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 4, row: 0 },
    { id: "db", label: "Postgres", kind: "database", col: 4, row: 2 },
    { id: "queue", label: "Queue", kind: "queue", col: 3, row: 2 },
  ],
  edges: [
    { from: "client", to: "cdn" },
    { from: "cdn", to: "lb" },
    { from: "lb", to: "svc" },
    { from: "svc", to: "cache" },
    { from: "svc", to: "db" },
    { from: "svc", to: "queue", style: "async" },
  ],
  scenarios: [
    {
      id: "loop",
      name: "Loop",
      steps: [
        { edge: "client>cdn", caption: "GET /products/42", ms: 700 },
        { edge: "cdn>lb", caption: "CDN miss", ms: 700 },
        { edge: "lb>svc", caption: "Balanced to a healthy instance", ms: 700 },
        { edge: "svc>cache", tone: "ok", caption: "Cache hit", ms: 700, mark: [{ node: "cache", state: "hit" }] },
        { edge: "client>cdn", reverse: true, caption: "200 OK in 12 ms", ms: 900 },
        { edge: "client>cdn", caption: "POST /orders", ms: 700, mark: [{ node: "cache", state: null }] },
        { edge: "cdn>lb", caption: "Writes go straight through", ms: 700 },
        { edge: "lb>svc", caption: "Validated by the service", ms: 700 },
        { edge: "svc>db", caption: "Committed to Postgres", ms: 700 },
        { edge: "svc>queue", caption: "order.created published for async work", ms: 900 },
      ],
    },
  ],
};

/** Menu label for a question: "Design a Parking Lot (LLD)" → "Parking Lot", "Build an Autocomplete (Typeahead)" → "Autocomplete". */
export const questionLabel = (title: string) =>
  title
    .replace(/^(Design|Build)\s+(an?\s+)?/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

export const isLowLevel = (q: Question) => q.tags.includes("lld");

/** Questions grouped the way the menus and hubs show them: low-level design first, then by category. */
export function questionGroups(): { title: string; items: Question[] }[] {
  const groups = [
    { title: "Low-level design", items: questions.filter(isLowLevel) },
    ...(["Backend", "Frontend", "Full-stack"] as const).map((c) => ({ title: c, items: questions.filter((q) => q.category === c && !isLowLevel(q)) })),
  ];
  return groups.filter((g) => g.items.length);
}

/** The "Play with it" strip on the home page: a simulator or lab, where it lives, and one line on what to try. */
export type PlayItem = { href: string; title: string; hook: string; art: PlayArt };
export type PlayArt = "parking" | "elevator" | "vending" | "rides" | "payment" | "leaderboard" | "pointers" | "window" | "halving" | "bfs" | "union" | "grid";

const q = (slug: string, art: PlayArt, hook: string): PlayItem | null => {
  const found = questions.find((x) => x.slug === slug);
  return found ? { href: `/questions/${slug}`, title: questionLabel(found.title), hook, art } : null;
};
const p = (slug: string, art: PlayArt, hook: string): PlayItem | null => {
  const found = getPattern(slug);
  return found ? { href: `/dsa/patterns/${slug}`, title: found.short, hook, art } : null;
};
const present = (xs: (PlayItem | null)[]) => xs.filter((x): x is PlayItem => x !== null);

export const playSimulators: PlayItem[] = present([
  q("parking-lot", "parking", "Two gates, one free spot, the same millisecond."),
  q("elevator", "elevator", "Call a lift and watch the dispatcher pick a car."),
  q("vending-machine", "vending", "Every coin and button press hits a state machine."),
  q("ride-sharing", "rides", "Nearest driver wins, and only one of them."),
  q("payment-system", "payment", "Retry the charge all you like. Pay once."),
  q("leaderboard", "leaderboard", "Scores land, ranks reshuffle, ties get settled."),
]);

export const playLabs: PlayItem[] = present([
  p("two-pointers", "pointers", "Squeeze a sorted array from both ends."),
  p("sliding-window", "window", "Grow on the right, shrink on the left."),
  p("binary-search", "halving", "Throw away half the range every guess."),
  p("graph-traversal", "bfs", "Watch the frontier ripple out, one ring at a time."),
  p("union-find", "union", "Merge groups, then ask who is connected."),
  p("dp-2d", "grid", "Fill the table cell by cell, read the answer off the corner."),
]);

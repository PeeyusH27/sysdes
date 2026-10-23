import type { FlowSpec } from "@/components/diagram/types";
import { typeaheadFlow } from "../../questions/typeahead/diagrams";
import type { Story } from "../types";

// Two small inline pictures: the stale answer that wins, and the cancel that stops it.
const race: FlowSpec = {
  id: "story-typeahead-race",
  title: "An old answer arrives last",
  description: "Two requests are in flight. Without a cancel, the older one can overwrite the newer one. With a cancel, it is dropped.",
  nodes: [
    { id: "key", label: "You type", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Suggest API", kind: "service", col: 1, row: 1 },
    { id: "list", label: "Suggestion list", kind: "client", col: 2, row: 1 },
  ],
  edges: [
    { from: "key", to: "api" },
    { from: "api", to: "list" },
  ],
  scenarios: [
    {
      id: "stale",
      name: "No cancel",
      steps: [
        { edge: "key>api", caption: "You pause on rea. Request A goes out, and the server is slow." },
        { edge: "key>api", caption: "You type c. Request B for reac goes out too." },
        { edge: "api>list", tone: "ok", caption: "B answers first. The list shows reac suggestions.", mark: [{ node: "list", state: "ok" }] },
        { edge: "api>list", tone: "error", caption: "A answers last and overwrites them with rea suggestions.", mark: [{ node: "list", state: "down" }] },
      ],
    },
    {
      id: "abort",
      name: "Cancel the old one",
      steps: [
        { edge: "key>api", caption: "You pause on rea. Request A goes out." },
        { edge: "key>api", tone: "miss", caption: "You type c. A is cancelled before B goes out.", mark: [{ node: "api", state: "miss" }] },
        { edge: "api>list", tone: "ok", caption: "Only B answers. The list shows reac suggestions.", mark: [{ node: "list", state: "ok" }] },
        { edge: "api>list", tone: "ok", caption: "If A still arrives late, its cancelled signal makes us drop it." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Every key is a request",
      line: "Typing one word fires a request per letter, and a busy page has many typists.",
      scene: {
        kind: "sum",
        rows: [
          { label: "People typing", value: "10,000" },
          { label: "Keys a second each", value: "5" },
        ],
        result: { label: "Requests a second", value: "50,000" },
        verdict: { text: "Far too many", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Wait for a pause",
      line: "Each key resets a 250 ms timer. Count the requests that leave.",
      scene: { kind: "flow", spec: typeaheadFlow, scenario: "fast-typing" },
      predict: { q: "You type r-e-a-c-t quickly. How many requests?", options: ["Five", "One"], answer: 1, why: "Every key clears the timer. Only the pause after react lets it fire." },
    },
    {
      tag: "catch",
      head: "The old answer arrives last",
      line: "Two requests are in flight. The server is slow right now.",
      scene: { kind: "flow", spec: race, scenario: "stale" },
      predict: { q: "Request A is older but slower. Which list stays?", options: ["reac, the newer", "rea, the older"], answer: 1, why: "A lands last and overwrites the screen. Waiting is not enough." },
    },
    {
      tag: "fix",
      head: "Cancel the stale request",
      line: "Each new query aborts the previous one. A late answer is ignored.",
      scene: { kind: "flow", spec: race, scenario: "abort" },
    },
    {
      tag: "idea",
      head: "Backspace should be instant",
      line: "Keep recent answers in a small cache. Check it before starting the timer.",
      scene: { kind: "flow", spec: typeaheadFlow, scenario: "backspace" },
    },
    {
      tag: "sum",
      head: "How big is the list?",
      line: "Drag the size. The right backend changes with how many suggestions exist.",
      scene: {
        kind: "meter",
        label: "Suggestions to search",
        unit: "entries",
        min: 1000,
        max: 100000000,
        start: 100000,
        log: true,
        stops: [
          { upTo: 5000, verdict: "Filter in memory. No server needed.", tone: "good" },
          { upTo: 100000, verdict: "An indexed prefix query is enough.", tone: "good" },
          { upTo: 100000000, verdict: "Short prefixes break LIKE. Use a trie behind a CDN.", tone: "bad" },
        ],
      },
      predict: { q: "100,000 products. Do you need a trie?", options: ["Yes", "No, an index is enough"], answer: 1, why: "An indexed prefix query handles about 50 requests a second. A trie is for far bigger lists." },
    },
    {
      tag: "choose",
      head: "Pick the debounce",
      line: "Too short floods the server. Too long feels laggy.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "No debounce", tone: "bad", why: "A request on every key" },
          { label: "250 ms", tone: "good", why: "Fires on the pause, feels instant" },
          { label: "1 second", tone: "warn", why: "Safe, but feels slow" },
          { label: "Throttle", tone: "warn", why: "Updates mid-burst, but sends more" },
        ],
      },
    },
    {
      tag: "skip",
      head: "Small list? Skip the server",
      line: "A local list needs none of the timer and request machinery.",
      scene: {
        kind: "versus",
        left: { title: "Local list", points: ["5,000 countries", "Filter in memory", "No debounce needed"] },
        right: { title: "Remote data", points: ["Debounce and abort", "Trie, top 8 per node", "CDN for hot prefixes"] },
      },
    },
  ],
};

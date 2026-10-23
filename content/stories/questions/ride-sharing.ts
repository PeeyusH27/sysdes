import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: the location overwrite, the match search, and the two-matchers race.
const locations: FlowSpec = {
  id: "story-ride-locations",
  title: "Overwrite the latest position",
  description: "Each driver fix overwrites the old position in a per-city geo index. History is batched off to a log, away from the hot path.",
  nodes: [
    { id: "driver", label: "Driver app", kind: "client", col: 0, row: 1, sub: "fix every 4 s" },
    { id: "loc", label: "Location service", kind: "service", col: 1, row: 1 },
    { id: "geo", label: "Geo index", kind: "cache", col: 2, row: 0, sub: "latest only" },
    { id: "log", label: "History log", kind: "queue", col: 2, row: 2, sub: "batched" },
  ],
  edges: [
    { from: "driver", to: "loc" },
    { from: "loc", to: "geo", label: "overwrite" },
    { from: "loc", to: "log", label: "batch", style: "async" },
  ],
  scenarios: [
    {
      id: "overwrite",
      name: "Overwrite",
      steps: [
        { edge: "driver>loc", caption: "A driver reports lat and lon, every 4 seconds." },
        { edge: "loc>geo", caption: "The new position overwrites the old one. A sticky note, not a diary.", mark: [{ node: "geo", state: "ok" }] },
        { edge: "loc>log", caption: "History is batched off to a log. Nothing waits on it." },
        { edge: "loc>geo", tone: "ok", caption: "5 million latest positions fit in about 1 GB of memory." },
      ],
    },
  ],
};

const search: FlowSpec = {
  id: "story-ride-search",
  title: "Find and offer a driver",
  description: "The matcher searches the rider's cell and its 8 neighbours, ranks by arrival time and offers to one driver at a time.",
  nodes: [
    { id: "rider", label: "Rider", kind: "client", col: 0, row: 1 },
    { id: "matcher", label: "Matcher", kind: "service", col: 1, row: 1 },
    { id: "geo", label: "Geo index", kind: "cache", col: 2, row: 0 },
    { id: "eta", label: "ETA service", kind: "service", col: 2, row: 2 },
    { id: "driver", label: "Driver", kind: "client", col: 3, row: 1 },
  ],
  edges: [
    { from: "rider", to: "matcher" },
    { from: "matcher", to: "geo", label: "cell + 8" },
    { from: "matcher", to: "eta", label: "rank" },
    { from: "matcher", to: "driver", label: "offer" },
  ],
  scenarios: [
    {
      id: "match",
      name: "Match",
      steps: [
        { edge: "rider>matcher", caption: "A rider requests a ride." },
        { edge: "matcher>geo", caption: "Search the rider's cell and its 8 neighbours: about 600 cars, not 100,000." },
        { edge: "matcher>eta", caption: "Rank the best few by arrival time. Across a river, nearest is not quickest." },
        { edge: "matcher>driver", caption: "Offer to one driver, who has 10 to 15 seconds to answer." },
        { edge: "matcher>driver", reverse: true, tone: "miss", caption: "A decline or silence passes the offer to the next driver.", mark: [{ node: "driver", state: "miss" }] },
      ],
    },
  ],
};

const race: FlowSpec = {
  id: "story-ride-race",
  title: "Two matchers, one driver",
  description: "Two matchers want the same driver. A compare-and-set lets only one reserve them before an offer goes out.",
  nodes: [
    { id: "a", label: "Matcher A", kind: "service", col: 0, row: 0 },
    { id: "b", label: "Matcher B", kind: "service", col: 0, row: 2 },
    { id: "state", label: "Driver state", kind: "cache", col: 1, row: 1, sub: "AVAILABLE?" },
    { id: "driver", label: "Driver", kind: "client", col: 2, row: 1 },
  ],
  edges: [
    { from: "a", to: "state" },
    { from: "b", to: "state" },
    { from: "state", to: "driver", label: "offer" },
  ],
  scenarios: [
    {
      id: "cas",
      name: "Compare-and-set",
      steps: [
        { edge: "a>state", caption: "Matcher A: mark the driver OFFERED, only if still AVAILABLE." },
        { edge: "b>state", caption: "Matcher B asks for the same driver at the same moment." },
        { edge: "a>state", reverse: true, tone: "ok", caption: "A gets 1. It holds the driver.", mark: [{ node: "state", state: "ok" }] },
        { edge: "b>state", reverse: true, tone: "error", caption: "B gets 0. It moves on to its next candidate.", mark: [{ node: "b", state: "miss" }] },
        { edge: "state>driver", tone: "ok", caption: "Only A's offer goes out. No driver gets two rides." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A firehose of locations",
      line: "Every driver reports a position every 4 seconds. Writing each to a database drowns it.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Online drivers", value: "5 million" },
          { label: "A fix every", value: "4 seconds" },
        ],
        result: { label: "Updates a second", value: "1.25 million" },
        verdict: { text: "Too many database rows", tone: "bad" },
      },
    },
    {
      tag: "fix",
      head: "Overwrite, do not append",
      line: "Only the latest position matters. Keep it in fast memory.",
      scene: { kind: "flow", spec: locations, scenario: "overwrite" },
    },
    {
      tag: "sum",
      head: "Do you need a geo index?",
      line: "Matching means finding drivers within about 2 km. Drag the number of drivers.",
      scene: {
        kind: "meter",
        label: "Online drivers",
        unit: "drivers",
        min: 100,
        max: 5000000,
        start: 500,
        log: true,
        stops: [
          { upTo: 2000, verdict: "Scan them all. No index needed.", tone: "good" },
          { upTo: 100000, verdict: "Thousands of checks. Use a cell index.", tone: "warn" },
          { upTo: 5000000, verdict: "Millions of checks. A cell index still reads ~600.", tone: "bad" },
        ],
      },
      predict: { q: "A town with 500 drivers. Need a geo index?", options: ["Yes", "No, just scan"], answer: 1, why: "500 checks per search is cheap. The index pays off at thousands of cars." },
    },
    {
      tag: "idea",
      head: "Search the cell and neighbours",
      line: "Cut the map into grid cells. Read the rider's cell plus the 8 around it.",
      scene: { kind: "flow", spec: search, scenario: "match" },
    },
    {
      tag: "choose",
      head: "Which car to offer first",
      line: "Rank the candidates, then offer to exactly one at a time.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Nearest on map", tone: "warn", why: "Across a river, farther can be faster" },
          { label: "Shortest ETA", tone: "good", why: "Ranks by real arrival time" },
          { label: "Offer to everyone", tone: "bad", why: "Several accept one ride" },
        ],
      },
      predict: { q: "Which ranking finds the car that arrives first?", options: ["Nearest on the map", "Shortest estimated arrival"], answer: 1, why: "Roads and rivers change travel time. Distance alone can mislead." },
    },
    {
      tag: "catch",
      head: "Two matchers, one driver",
      line: "Both pick the same free car in the same instant.",
      scene: { kind: "flow", spec: race, scenario: "cas" },
    },
    {
      tag: "skip",
      head: "Start simple, add when needed",
      line: "Each piece earns its place only as the city grows.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Scan drivers in a town", "Overwrite the latest fix", "One offer at a time"] },
        right: { title: "Add when", points: ["Thousands of drivers: cell index", "Many matchers: compare-and-set", "Huge city: split by zone"] },
      },
    },
  ],
};

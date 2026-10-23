import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// One small inline picture: searching a few cells instead of every business.
const cells: FlowSpec = {
  id: "story-nearby-cells",
  title: "Search a few cells",
  description: "The search server asks an in-memory index for the cells around the user and returns the nearest 20.",
  nodes: [
    { id: "app", label: "User", kind: "client", col: 0, row: 1 },
    { id: "search", label: "Search server", kind: "service", col: 1, row: 1 },
    { id: "index", label: "Geo index", kind: "cache", col: 2, row: 1, sub: "in memory" },
  ],
  edges: [
    { from: "app", to: "search", label: "near me" },
    { from: "search", to: "index", label: "cells" },
  ],
  scenarios: [
    {
      id: "cells",
      name: "Cells",
      steps: [
        { edge: "app>search", caption: "Restaurants within 1 km of here." },
        { edge: "search>index", caption: "Look up the few cells covering that circle, not all 200 million places.", mark: [{ node: "index", state: "hit" }] },
        { edge: "search>index", reverse: true, caption: "A few hundred candidates come back. Check exact distances." },
        { edge: "app>search", reverse: true, tone: "ok", caption: "The nearest 20, in milliseconds." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Scanning everything",
      line: "Check every place for every search, and the checks pile up.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Businesses", value: "200 million" },
          { label: "Searches a second", value: "17,000" },
        ],
        result: { label: "Checks a second", value: "3.4 trillion" },
        verdict: { text: "A scan cannot keep up", tone: "bad" },
      },
    },
    {
      tag: "fix",
      head: "Cut the map into cells",
      line: "Look at the few cells around you, not the whole world.",
      scene: { kind: "flow", spec: cells, scenario: "cells" },
    },
    {
      tag: "choose",
      head: "Which index?",
      line: "Four ways to find places near a point.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Scan all rows", tone: "bad", why: "Far too many checks" },
          { label: "Geohash column", tone: "good", why: "Simple; cells can be uneven" },
          { label: "Quadtree", tone: "good", why: "Splits only dense areas" },
          { label: "Lat and lon range", tone: "warn", why: "Wide, slow range scans" },
        ],
      },
    },
    {
      tag: "sum",
      head: "When a cell is too full",
      line: "Drag how many places one cell holds. Midtown is crowded.",
      scene: {
        kind: "meter",
        label: "Places in one cell",
        unit: "places",
        min: 10,
        max: 100000,
        start: 50,
        log: true,
        stops: [
          { upTo: 200, verdict: "Small cell. Scan it all.", tone: "good" },
          { upTo: 5000, verdict: "Slow scans. Split the cell.", tone: "warn" },
          { upTo: 100000, verdict: "Midtown problem. Use a quadtree.", tone: "bad" },
        ],
      },
      predict: { q: "A midtown cell holds 5,000 places. What helps?", options: ["Split it into four", "Scan it anyway"], answer: 0, why: "A quadtree splits crowded boxes until each holds about 100." },
    },
    {
      tag: "catch",
      head: "Edges hide neighbours",
      line: "A place just across a cell edge is closer than most in your cell.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Own cell only", value: 1, shown: "1 cell", tone: "bad" },
          { label: "Cell + neighbours", value: 9, shown: "9 cells", tone: "good" },
        ],
      },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "Places rarely move, so keep it plain.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Geohash column in SQL", "Cache place details", "Nightly rebuilds"] },
        right: { title: "Add when", points: ["Uneven density: quadtree", "Heavy reads: more copies", "Fresh edits: a change feed"] },
      },
    },
  ],
};

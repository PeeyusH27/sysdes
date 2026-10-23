import type { FlowSpec } from "@/components/diagram/types";
import { feedFlow } from "../../questions/infinite-feed/diagrams";
import type { Story } from "../types";

// A small inline picture: asking for "page 2" versus asking for "older than the last post I have".
const paging: FlowSpec = {
  id: "story-feed-paging",
  title: "Page numbers versus a cursor",
  description: "New posts arrive while you read. Page numbers shift and repeat posts. A cursor asks for posts older than the last one you have.",
  nodes: [
    { id: "reader", label: "You", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Feed API", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Posts", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "reader", to: "api" },
    { from: "api", to: "db" },
  ],
  scenarios: [
    {
      id: "offset",
      name: "Page numbers",
      steps: [
        { edge: "reader>api", caption: "You read page 1: the 20 newest posts." },
        { edge: "api>db", caption: "Meanwhile 5 new posts land at the top.", mark: [{ node: "db", state: "busy" }] },
        { edge: "reader>api", caption: "You ask for page 2: skip the first 20." },
        { edge: "api>db", reverse: true, tone: "error", caption: "Everything shifted down 5. Page 2 starts with 5 posts you saw.", mark: [{ node: "db", state: "down" }] },
        { edge: "reader>api", reverse: true, tone: "error", caption: "Repeats on screen." },
      ],
    },
    {
      id: "cursor",
      name: "A cursor",
      steps: [
        { edge: "reader>api", caption: "You ask for posts older than p_160, the last one you have." },
        { edge: "api>db", caption: "An index range scan: id below p_160, 20 rows.", mark: [{ node: "db", state: "ok" }] },
        { edge: "api>db", reverse: true, tone: "ok", caption: "New arrivals changed nothing. The next 20 are exact." },
        { edge: "reader>api", reverse: true, tone: "ok", caption: "No repeats. Page 500 is as fast as page 1." },
      ],
    },
  ],
};

// A small inline picture for the failure: the request fails, Retry shows, and the feed still works.
const retry: FlowSpec = {
  id: "story-feed-retry",
  title: "A failed page and Retry",
  description: "A request fails. The feed shows Retry instead of looping, and the next tap works.",
  nodes: [
    { id: "user", label: "You", kind: "client", col: 0, row: 1 },
    { id: "feed", label: "Feed", kind: "service", col: 1, row: 1 },
    { id: "api", label: "Feed API", kind: "service", col: 2, row: 1 },
  ],
  edges: [
    { from: "user", to: "feed" },
    { from: "feed", to: "api" },
  ],
  scenarios: [
    {
      id: "fail",
      name: "Error and Retry",
      steps: [
        { edge: "feed>api", caption: "Near the bottom, the feed asks for the next page." },
        { edge: "feed>api", reverse: true, tone: "error", caption: "503. The server is struggling.", mark: [{ node: "api", state: "down" }] },
        { edge: "user>feed", reverse: true, tone: "error", caption: "You see: Couldn't load more. Retry. No automatic loop.", mark: [{ node: "feed", state: "miss" }] },
        { edge: "user>feed", caption: "You tap Retry when ready.", mark: [{ node: "feed", state: null }] },
        { edge: "feed>api", caption: "One new request goes out.", mark: [{ node: "api", state: null }] },
        { edge: "feed>api", reverse: true, tone: "ok", caption: "The page arrives. The feed never froze.", mark: [{ node: "api", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Page 2 repeats posts",
      line: "You are reading. Then new posts arrive and you ask for page 2.",
      scene: { kind: "flow", spec: paging, scenario: "offset" },
      predict: { q: "5 new posts arrive. What does page 2 show?", options: ["The next 20 new ones", "5 posts you already saw"], answer: 1, why: "Page numbers count from the top, so the new posts push old ones down." },
    },
    {
      tag: "fix",
      head: "Ask from a bookmark",
      line: "Request posts older than the last one you hold. This is a cursor.",
      scene: { kind: "flow", spec: paging, scenario: "cursor" },
    },
    {
      tag: "sum",
      head: "Deep pages cost more",
      line: "Skipping rows still reads them. A cursor jumps straight to the spot.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Rows to skip", value: "10,000" },
          { label: "Rows you want", value: "20" },
        ],
        result: { label: "Offset reads", value: "10,020" },
        verdict: { text: "A cursor reads only 20", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Scroll triggers the next page",
      line: "A hidden marker near the bottom asks for more, one request at a time.",
      scene: { kind: "flow", spec: feedFlow, scenario: "next-page" },
    },
    {
      tag: "sum",
      head: "When to virtualize",
      line: "Drag the post count. Rendering every row gets heavy as the list grows.",
      scene: {
        kind: "meter",
        label: "Posts loaded",
        unit: "posts",
        min: 10,
        max: 10000,
        start: 50,
        log: true,
        stops: [
          { upTo: 300, verdict: "A plain list is fine. Ctrl+F works.", tone: "good" },
          { upTo: 1000, verdict: "Borderline. Check scroll speed first.", tone: "warn" },
          { upTo: 10000, verdict: "Virtualize. About 20 rows stay mounted.", tone: "bad" },
        ],
      },
      predict: { q: "A feed of 50 posts. Virtualize it?", options: ["Yes", "No, a plain list"], answer: 1, why: "Virtualizing breaks Ctrl+F and buys nothing on a short list." },
    },
    {
      tag: "catch",
      head: "One failure must not freeze it",
      line: "A failed request should show Retry, not hammer a struggling server.",
      scene: { kind: "flow", spec: retry, scenario: "fail" },
    },
    {
      tag: "skip",
      head: "Keep it simple when small",
      line: "Cursors and virtual rows earn their keep only on long, live lists.",
      scene: {
        kind: "versus",
        left: { title: "Small and static", points: ["Page numbers are fine", "A Load more button", "Plain list, full DOM"] },
        right: { title: "Long and live", points: ["Cursor paging", "Virtualized rows", "New posts banner"] },
      },
    },
  ],
};

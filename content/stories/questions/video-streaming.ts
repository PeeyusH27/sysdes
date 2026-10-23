import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: the CDN doing the heavy lifting, and a resumed upload.
const edge: FlowSpec = {
  id: "story-video-edge",
  title: "A CDN in front of the video store",
  description: "The first viewer in a region causes a miss. Every later viewer is served from the edge.",
  nodes: [
    { id: "viewer", label: "Viewers", kind: "client", col: 0, row: 1 },
    { id: "edge", label: "CDN edge", kind: "cdn", col: 1, row: 1, sub: "near the viewer" },
    { id: "store", label: "Video store", kind: "storage", col: 2, row: 1 },
  ],
  edges: [
    { from: "viewer", to: "edge", label: "segment" },
    { from: "edge", to: "store", label: "miss only" },
  ],
  scenarios: [
    {
      id: "edge",
      name: "Edge",
      steps: [
        { edge: "viewer>edge", caption: "The first viewer asks for a segment." },
        { edge: "edge>store", tone: "miss", caption: "Not at the edge yet. One trip to the store.", mark: [{ node: "edge", state: "miss" }] },
        { edge: "edge>store", reverse: true, caption: "The segment is cached. It never changes." },
        { edge: "viewer>edge", reverse: true, tone: "ok", caption: "The next viewers get it from the edge. The store is not touched.", mark: [{ node: "edge", state: "hit" }] },
      ],
    },
  ],
};

const resume: FlowSpec = {
  id: "story-video-resume",
  title: "A resumed upload",
  description: "The server remembers how many bytes arrived in order, so the app continues instead of restarting.",
  nodes: [
    { id: "app", label: "Uploader app", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Upload API", kind: "service", col: 1, row: 1 },
    { id: "raw", label: "Raw store", kind: "storage", col: 2, row: 1, sub: "39 of 63 chunks" },
  ],
  edges: [
    { from: "app", to: "api", label: "chunks" },
    { from: "api", to: "raw" },
  ],
  scenarios: [
    {
      id: "resume",
      name: "Resume",
      steps: [
        { edge: "app>api", tone: "error", caption: "The connection drops at chunk 40 of 63.", mark: [{ node: "app", state: "down" }] },
        { edge: "app>api", caption: "Back online, the app asks how much the server has.", mark: [{ node: "app", state: null }] },
        { edge: "app>api", reverse: true, caption: "39 chunks, in order. Continue from chunk 40." },
        { edge: "api>raw", tone: "ok", caption: "Only the missing 24 chunks are sent.", mark: [{ node: "raw", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Too many bytes for one site",
      line: "Millions of people watch at once. Add up what leaves your servers.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Streams at peak", value: "5 million" },
          { label: "Each stream", value: "2.5 Mbps" },
        ],
        result: { label: "Total out", value: "12.5 Tbps" },
        verdict: { text: "No single site can serve this", tone: "bad" },
      },
    },
    {
      tag: "fix",
      head: "Serve from the edge",
      line: "Segments never change, so copies near viewers answer almost every request.",
      scene: { kind: "flow", spec: edge, scenario: "edge" },
    },
    {
      tag: "sum",
      head: "The player picks quality",
      line: "Drag the viewer's bandwidth. The player keeps a 20% margin.",
      scene: {
        kind: "meter",
        label: "Measured bandwidth",
        unit: "Mbps",
        min: 0.3,
        max: 10,
        start: 4,
        log: true,
        stops: [
          { upTo: 1.5, verdict: "240p or 360p. Soft, but no stalls.", tone: "warn" },
          { upTo: 3.1, verdict: "480p. Fine on a phone.", tone: "good" },
          { upTo: 6.2, verdict: "720p fits inside the margin.", tone: "good" },
          { upTo: 10, verdict: "1080p fits inside the margin.", tone: "good" },
        ],
      },
      predict: { q: "Bandwidth is 4 Mbps. Which quality plays?", options: ["1080p, 5 Mbps", "720p, 2.5 Mbps"], answer: 1, why: "80% of 4 Mbps is 3.2. 1080p needs 5, so 720p." },
    },
    {
      tag: "choose",
      head: "How to encode",
      line: "One upload becomes five qualities. Where does that work run?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "On upload server", tone: "bad", why: "Blocks the API" },
          { label: "File per quality", tone: "warn", why: "Serial; restarts from zero" },
          { label: "Parallel segments", tone: "good", why: "750 small, retryable tasks" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Big uploads break",
      line: "Phones lose signal. Do not start over.",
      scene: { kind: "flow", spec: resume, scenario: "resume" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "Most of this is earned by scale.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["One quality, plain MP4", "Serve from storage", "Upload in one request"] },
        right: { title: "Add when", points: ["Many devices: quality ladder", "Global viewers: CDN", "Large files: resumable chunks"] },
      },
    },
  ],
};

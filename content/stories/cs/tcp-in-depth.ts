import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One lost segment blocks all",
      line: "Later data has arrived, but TCP hands over bytes in order only.",
      scene: {
        kind: "versus",
        left: { title: "Segment 2 lost", points: ["3, 4, 5 arrive", "App sees nothing"] },
        right: { title: "Until resent", points: ["Stream is blocked", "Window shrinks"] },
      },
    },
    {
      tag: "sum",
      head: "Window sets the speed",
      line: "Throughput is roughly one window per round trip.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Window", value: "64 segments" },
          { label: "Segment size", value: "1,460 bytes" },
          { label: "Round trip", value: "50 ms" },
        ],
        result: { label: "Throughput", value: "~15 Mbit/s" },
        verdict: { text: "A bigger window is faster", tone: "info" },
      },
    },
    {
      tag: "idea",
      head: "Slow start doubles",
      line: "A new connection probes: the window doubles each round trip.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Round 1", value: 10, shown: "10 seg", tone: "info" },
          { label: "Round 2", value: 20, shown: "20 seg", tone: "info" },
          { label: "Round 3", value: 40, shown: "40 seg", tone: "info" },
          { label: "Round 4", value: 64, shown: "64 seg", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Two different brakes",
      line: "The sender obeys whichever window is smaller.",
      scene: {
        kind: "versus",
        left: { title: "Flow control", points: ["Protects the receiver", "Window sent in ACKs"] },
        right: { title: "Congestion control", points: ["Protects the network", "Window learned from loss"] },
      },
    },
    {
      tag: "fix",
      head: "How loss is handled",
      line: "Duplicate ACKs recover quickly. A timeout is the costly case.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "3 duplicate ACKs", tone: "good", why: "Halve the window, carry on" },
          { label: "SACK", tone: "good", why: "Resend only the gap" },
          { label: "Timeout", tone: "bad", why: "Idle, then back to 1 segment" },
        ],
      },
      predict: { q: "Which loss signal costs more throughput?", options: ["Three duplicate ACKs", "A timeout"], answer: 1, why: "A timeout idles the sender, then restarts slow start from one segment." },
    },
    {
      tag: "catch",
      head: "Too many short connections",
      line: "Each closed connection holds its port in TIME-WAIT for about a minute.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Ephemeral ports", value: "28,232" },
          { label: "TIME-WAIT", value: "60 s" },
        ],
        result: { label: "New connections a second", value: "~470" },
        verdict: { text: "Reuse connections instead", tone: "warn" },
      },
    },
  ],
};

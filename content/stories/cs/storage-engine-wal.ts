import { writePath } from "../../cs/lessons/11-storage-engine-wal/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Committed, but only in memory",
      line: "Data pages are flushed lazily. A power cut before the flush loses the change.",
      scene: {
        kind: "versus",
        left: { title: "At commit", points: ["Page changed in RAM", "Not on disk yet"] },
        right: { title: "Without a log", points: ["Power fails: change gone", "Client was told OK"] },
      },
    },
    {
      tag: "sum",
      head: "Log first is cheaper",
      line: "A small sequential append beats rewriting a whole page at commit.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Page write", value: "8 KiB random" },
          { label: "Log record", value: "100 B append" },
        ],
        result: { label: "Disk work at commit", value: "the log only" },
        verdict: { text: "Pages flush later", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Log, then acknowledge",
      line: "The commit returns once the log is flushed. Pages catch up in the background.",
      scene: { kind: "flow", spec: writePath, scenario: "commit" },
    },
    {
      tag: "choose",
      head: "Share one fsync",
      line: "With a 2 ms fsync, commits per second depend on how many share it.",
      scene: {
        kind: "meter",
        label: "Commits per fsync",
        unit: "commits",
        min: 1,
        max: 1000,
        start: 1,
        log: true,
        stops: [
          { upTo: 1, verdict: "500 commits a second.", tone: "warn" },
          { upTo: 10, verdict: "Up to 5,000 a second.", tone: "good" },
          { upTo: 1000, verdict: "Tens of thousands a second.", tone: "good" },
        ],
      },
      predict: { q: "100 commits share one 2 ms fsync. Rate?", options: ["500 a second", "50,000 a second"], answer: 1, why: "100 commits per 2 ms is 50,000 a second. That is group commit." },
    },
    {
      tag: "fix",
      head: "Replay after a crash",
      line: "Recovery redoes committed work from the log and drops the rest.",
      scene: { kind: "flow", spec: writePath, scenario: "recover" },
    },
    {
      tag: "catch",
      head: "The same log feeds replicas",
      line: "How long the primary waits for them decides what a failover can lose.",
      scene: {
        kind: "versus",
        left: { title: "Synchronous", points: ["No loss on failover", "Waits on the network"] },
        right: { title: "Asynchronous", points: ["Fast commits", "Last writes can be lost"] },
      },
    },
  ],
};

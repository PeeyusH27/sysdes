import { primaryReplica } from "../../learn/03-databases-scaling/diagrams";
import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The replication primer shows one database versus copies. The page's own diagram shows the stale read and the failover.
const copies = getPrimer("replication")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One database does everything",
      line: "Reads and writes share one machine. It slows, then fails, and no live copy exists.",
      scene: { kind: "flow", spec: copies, scenario: "without" },
    },
    {
      tag: "choose",
      head: "Cheapest move first",
      line: "Match the symptom to the smallest fix. Sharding is last.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "2 s page, 300 q/s", tone: "good", why: "Add an index. EXPLAIN shows a Seq Scan." },
          { label: "10,000 reads/s", tone: "good", why: "A cache, then replicas" },
          { label: "Several TB of data", tone: "warn", why: "Now sharding is worth it" },
          { label: "Write limit hit", tone: "warn", why: "One primary is full: shard" },
        ],
      },
      predict: { q: "A page takes 2 s at 300 queries a second. Shard?", options: ["Yes, split the data", "No, add an index first"], answer: 1, why: "A Seq Scan means a missing index. Sharding is a one-way door." },
    },
    {
      tag: "sum",
      head: "Reads leave the primary",
      line: "When most queries are reads, copies take nearly all of them.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Queries a second", value: "10,000" },
          { label: "Share that are reads", value: "95%" },
        ],
        result: { label: "Writes left on primary", value: "500/s" },
        verdict: { text: "Replicas can take the reads", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Copies answer the reads",
      line: "Writes go to the main database, which streams changes to its copies.",
      scene: { kind: "flow", spec: copies, scenario: "with" },
    },
    {
      tag: "catch",
      head: "A copy can be behind",
      line: "Alice saves her bio, then reloads her profile. Watch which copy answers.",
      scene: { kind: "flow", spec: primaryReplica, scenario: "stale-read" },
      predict: { q: "Alice reloads from a lagging copy. What does she see?", options: ["Her new bio", "Her old bio"], answer: 1, why: "The change is still travelling, so the copy returns the old bio. Read her own data from the primary." },
    },
    {
      tag: "choose",
      head: "How long a commit waits",
      line: "Waiting for copies decides what a crash can lose.",
      scene: {
        kind: "versus",
        left: { title: "Async", points: ["Waits for the primary only", "Fastest commit", "Last few writes can be lost"] },
        right: { title: "Sync", points: ["Waits for the replicas", "Nothing is lost", "One slow copy stalls writes"] },
      },
    },
    {
      tag: "fix",
      head: "A copy takes over",
      line: "Tens of seconds down. Writes the old primary never shipped are gone.",
      scene: { kind: "flow", spec: primaryReplica, scenario: "failover" },
    },
    {
      tag: "catch",
      head: "Copies are not backups",
      line: "A DROP TABLE reaches every replica within milliseconds.",
      scene: {
        kind: "versus",
        left: { title: "Replicas give", points: ["Read capacity", "A standby", "Fast failover"] },
        right: { title: "Backups give", points: ["Restore after DROP TABLE", "Replay to any moment", "A copy in another region"] },
      },
    },
  ],
};

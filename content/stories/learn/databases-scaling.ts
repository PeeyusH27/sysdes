import { primaryReplica } from "../../learn/03-databases-scaling/diagrams";
import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The replication primer shows one database versus copies. The page's own diagram shows the stale read and the failover.
const copies = getPrimer("replication")!.flow;

export const story: Story | undefined = {
  learn: [
    {
      head: "Why the database is the bottleneck",
      body: "Your app servers are easy to copy, but they all share one database. Every read and every write lands on that one machine, so it is the first thing to slow down.",
      eg: "A single front desk",
      example: "A hotel can hire more porters and cleaners, but if one receptionist handles every check-in and every question, the lobby queue still grows.",
      doodle: "database",
    },
    {
      head: "Try the cheap fix first",
      body: "A slow page is usually a missing index, not a full database. An index lets a query jump straight to its rows instead of scanning every one.",
      eg: "A book's index",
      example: "To find every mention of Paris, you turn to the index and get page numbers. Without it, you would read the whole book from page one.",
    },
    {
      head: "Copies take the reads",
      body: "A replica is a live copy of the database that answers reads. Writes still go to the main one, called the primary, which streams every change to its copies.",
      eg: "A teacher and printed handouts",
      example: "The teacher writes the notes once. Students read photocopies, so nobody crowds the teacher's desk. A correction reaches the copies at the next print run.",
      doodle: "replica",
    },
    {
      head: "A copy can be a moment behind",
      body: "Changes take a little time to reach each replica. Read your own fresh save from the primary, or you may see the old value right after saving.",
      eg: "A noticeboard in another building",
      example: "You pin a new notice in the main office. Someone checking the copy in the other building sees yesterday's notice until it is carried over.",
    },
    {
      head: "Split the data last",
      body: "Sharding splits the data across several databases by a key, like user id. It is the last step, because moving data between shards later is very hard.",
      eg: "Phone books by surname",
      example: "A city prints A to M in one book and N to Z in another. Each is thinner, but changing the split means reprinting both.",
    },
  ],
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

import type { FlowSpec } from "@/components/diagram/types";

export const writePath: FlowSpec = {
  id: "wal-write-path",
  title: "Commit and crash recovery with a write-ahead log",
  description: "A commit changes the page in memory and appends a log record, and is acknowledged once the log is on disk. Data pages are flushed later. After a crash the log is replayed to rebuild what was only in memory.",
  nodes: [
    { id: "client", label: "Transaction", kind: "client", col: 0, row: 1 },
    { id: "buf", label: "Buffer pool", kind: "cache", col: 1, row: 0, sub: "dirty pages in RAM" },
    { id: "wal", label: "Write-ahead log", kind: "storage", col: 1, row: 2, sub: "sequential, fsync" },
    { id: "data", label: "Data files", kind: "database", col: 2, row: 0, sub: "pages on disk" },
  ],
  edges: [
    { from: "client", to: "buf" },
    { from: "client", to: "wal" },
    { from: "buf", to: "data" },
    { from: "wal", to: "buf", style: "replication" },
  ],
  scenarios: [
    {
      id: "commit",
      name: "Commit",
      steps: [
        { edge: "client>buf", caption: "UPDATE changes the page in memory. It is now dirty, but not on disk.", mark: [{ node: "buf", state: "busy" }] },
        { edge: "client>wal", caption: "A small log record describing the change is appended to the log." },
        { edge: "client>wal", reverse: true, tone: "ok", caption: "COMMIT: the log is flushed to disk (fsync), then the client is told it worked.", mark: [{ node: "wal", state: "ok" }] },
        { edge: "buf>data", caption: "Later, in the background, dirty pages are written to the data files. A checkpoint records how far this has got.", mark: [{ node: "buf", state: null }] },
      ],
    },
    {
      id: "recover",
      name: "Crash and recovery",
      steps: [
        { edge: "client>buf", caption: "The server crashes. Everything in memory is gone, including pages that were never flushed.", tone: "error", mark: [{ node: "buf", state: "down" }] },
        { edge: "wal>buf", caption: "On restart the database reads the log from the last checkpoint and redoes every committed change.", mark: [{ node: "wal", state: "ok" }] },
        { edge: "wal>buf", tone: "ok", caption: "Changes of transactions without a commit record are discarded. The database is consistent again.", mark: [{ node: "buf", state: "ok" }] },
      ],
    },
  ],
};

import type { FlowSpec } from "@/components/diagram/types";

export const btreeLookup: FlowSpec = {
  id: "btree-lookup",
  title: "A B-tree lookup: one page per level",
  description: "The query walks from the root page through an internal page to a leaf page, then follows the leaf's pointer to the row. With hundreds of keys per page, three levels cover tens of millions of rows.",
  nodes: [
    { id: "query", label: "WHERE id = 42", kind: "client", col: 0, row: 1 },
    { id: "root", label: "Root page", kind: "database", col: 1, row: 1, sub: "keys 1..1M", note: "Always in memory." },
    { id: "inner", label: "Internal page", kind: "database", col: 2, row: 1, sub: "keys 1..5000" },
    { id: "leaf", label: "Leaf page", kind: "database", col: 3, row: 1, sub: "keys 1..16" },
    { id: "row", label: "Table row", kind: "storage", col: 4, row: 1, sub: "id 42" },
  ],
  edges: [
    { from: "query", to: "root" },
    { from: "root", to: "inner" },
    { from: "inner", to: "leaf" },
    { from: "leaf", to: "row" },
  ],
  scenarios: [
    {
      id: "lookup",
      name: "Point lookup",
      steps: [
        { edge: "query>root", caption: "Start at the root page, which is almost always cached in memory." },
        { edge: "root>inner", caption: "Keys 1 to 5000 live under the first child: follow that pointer." },
        { edge: "inner>leaf", caption: "The internal page narrows it to one leaf page." },
        { edge: "leaf>row", tone: "ok", caption: "The leaf holds key 42 and where its row is. Three page reads, then one row fetch." },
      ],
    },
  ],
};

export const lsmPaths: FlowSpec = {
  id: "lsm-paths",
  title: "LSM-tree: write path and read path",
  description: "A write is appended to the log and inserted into the in-memory table, and flushed as a sorted file when full. A read checks memory, then the files from newest to oldest. Compaction merges files in the background.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "wal", label: "Write-ahead log", kind: "storage", col: 1, row: 0, sub: "sequential" },
    { id: "mem", label: "Memtable", kind: "cache", col: 1, row: 1, sub: "sorted, in RAM" },
    { id: "sst", label: "Sorted files", kind: "storage", col: 2, row: 1, sub: "immutable" },
    { id: "compact", label: "Compaction", kind: "worker", col: 3, row: 1, sub: "background" },
  ],
  edges: [
    { from: "client", to: "wal" },
    { from: "client", to: "mem" },
    { from: "mem", to: "sst" },
    { from: "client", to: "sst" },
    { from: "sst", to: "compact", style: "async" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "client>wal", caption: "Append the write to the log first, so a crash cannot lose it." },
        { edge: "client>mem", caption: "Insert it into the sorted in-memory table. The write is done." },
        { edge: "mem>sst", caption: "When the memtable is full it is flushed as one sequential, immutable sorted file." },
        { edge: "sst>compact", caption: "Later, compaction merges files, keeps the newest version of each key and drops deleted ones.", mark: [{ node: "compact", state: "busy" }] },
      ],
    },
    {
      id: "read",
      name: "Read",
      steps: [
        { edge: "client>mem", caption: "Look in the memtable first: it holds the newest data.", mark: [{ node: "mem", state: "miss" }, { node: "compact", state: null }] },
        { edge: "client>sst", caption: "Then the sorted files, newest first. Bloom filters let it skip files that cannot contain the key." },
        { edge: "client>sst", reverse: true, tone: "ok", caption: "The first file that has the key answers. Many files means many checks: read amplification.", mark: [{ node: "mem", state: null }] },
      ],
    },
  ],
};

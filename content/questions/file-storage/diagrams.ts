import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "file-storage-architecture",
  title: "File storage and sync architecture",
  description:
    "The client splits files into chunks named by hash. The sync API asks the metadata service which chunks are new, stores only those in the block store, then commits the file as an ordered list of chunk hashes. Every commit is appended to a change feed; a notifier wakes the user's other devices, which pull changes since their cursor and download the chunks they lack.",
  nodes: [
    { id: "a", label: "Laptop client", kind: "client", col: 0, row: 0, sub: "watches folder", note: "Watches the sync folder, splits changed files into chunks, hashes them and talks to the sync API." },
    { id: "sync", label: "Sync API", kind: "service", col: 1, row: 0, sub: "stateless" },
    { id: "blocks", label: "Block store", kind: "storage", col: 2, row: 0, sub: "chunks by hash", note: "Object storage. A chunk's key is the hash of its bytes, so each distinct chunk exists once, however many files and users use it." },
    { id: "meta", label: "Metadata service", kind: "service", col: 1, row: 1, sub: "tree + versions" },
    { id: "db", label: "Metadata DB", kind: "database", col: 2, row: 1, sub: "sharded by user", note: "Files, revisions, ordered chunk lists and chunk reference counts. All of one user's data lives on one shard, so a commit is a single-shard transaction." },
    { id: "feed", label: "Change feed", kind: "queue", col: 3, row: 1, sub: "cursor per user" },
    { id: "notify", label: "Notifier", kind: "pubsub", col: 4, row: 1, sub: "~50M connections", note: "Holds a long-lived connection per online device. It sends only a tiny 'something changed' poke; the device then pulls the details." },
    { id: "b", label: "Phone client", kind: "client", col: 3, row: 2, sub: "second device" },
  ],
  edges: [
    { from: "a", to: "sync", label: "hashes, chunks" },
    { from: "sync", to: "blocks", label: "put chunk" },
    { from: "sync", to: "meta", label: "new? commit" },
    { from: "meta", to: "db" },
    { from: "meta", to: "feed", label: "append", style: "async" },
    { from: "feed", to: "notify", style: "async" },
    { from: "notify", to: "b", label: "poke", style: "async" },
    { from: "b", to: "meta", label: "changes since" },
    { from: "b", to: "blocks", label: "get chunks" },
  ],
  scenarios: [
    {
      id: "new-file",
      name: "Save a new file",
      steps: [
        { edge: "a>sync", caption: "A 12 MiB report is saved. The client cuts it into three 4 MiB chunks and hashes each one." },
        { edge: "sync>meta", caption: "It asks: which of these 3 hashes do you not have?" },
        { edge: "sync>meta", reverse: true, caption: "All 3 are new. (Had a colleague already stored the same file, the answer would be none, and nothing would upload.)" },
        { edge: "sync>blocks", caption: "The 3 chunks are uploaded and stored by hash. A broken connection costs at most one chunk.", mark: [{ node: "blocks", state: "ok" }] },
        { edge: "sync>meta", caption: "Commit: path /report.doc, base revision 0, chunks [h1, h2, h3]. The metadata service checks that every chunk exists." },
        { edge: "meta>db", caption: "One transaction on the user's shard: revision 1 saved, chunk reference counts bumped.", mark: [{ node: "db", state: "ok" }] },
        { edge: "meta>feed", tone: "ok", caption: "The change is appended to the user's feed as cursor 41. The file is now safe." },
      ],
    },
    {
      id: "edit",
      name: "Edit one paragraph",
      steps: [
        { edge: "a>sync", caption: "The user edits a paragraph in a 1 GiB file. The client re-chunks: 256 chunks, 255 with the same hashes as before." },
        { edge: "sync>meta", caption: "Which hashes are unknown? Only the one chunk that contains the edit." },
        { edge: "sync>meta", reverse: true, tone: "ok", caption: "1 unknown of 256. The upload is 4 MiB, not 1 GiB: 0.4% of the file." },
        { edge: "sync>blocks", caption: "One chunk uploaded.", mark: [{ node: "blocks", state: "ok" }] },
        { edge: "sync>meta", tone: "ok", caption: "Commit revision 2 with the new list of 256 hashes. The old chunk stays for history until its count drops to zero." },
      ],
    },
    {
      id: "other-device",
      name: "Another device syncs",
      steps: [
        { edge: "meta>feed", caption: "A commit lands for this user." },
        { edge: "feed>notify", caption: "The notifier finds the user's online devices." },
        { edge: "notify>b", caption: "A tiny poke reaches the phone. No file data is pushed." },
        { edge: "b>meta", caption: "The phone asks: what changed since cursor 40?" },
        { edge: "b>meta", reverse: true, caption: "One change: /report.doc is revision 2. The phone compares chunk lists and finds 1 chunk it lacks." },
        { edge: "b>blocks", caption: "It downloads just that chunk from the block store.", mark: [{ node: "b", state: "ok" }] },
        { edge: "b>blocks", reverse: true, tone: "ok", caption: "The phone rebuilds the file from its local chunks plus the new one, then saves cursor 41." },
      ],
    },
    {
      id: "conflict",
      name: "Edit conflict",
      steps: [
        { edge: "a>sync", caption: "The laptop and the phone were both offline and both edited /plan.doc at revision 7." },
        { edge: "sync>meta", caption: "The laptop reconnects first and commits with base revision 7." },
        { edge: "meta>db", tone: "ok", caption: "The file is at revision 7, so the commit is accepted and becomes revision 8.", mark: [{ node: "db", state: "ok" }] },
        { edge: "b>meta", caption: "The phone reconnects and commits with base revision 7." },
        { edge: "b>meta", reverse: true, tone: "error", caption: "Refused: the file is now at revision 8. Someone else changed it first.", mark: [{ node: "b", state: "miss" }] },
        { edge: "b>meta", tone: "ok", caption: "The phone saves its edit as 'plan (Maya's conflicted copy).doc', a new file. Nobody's work is lost or silently overwritten.", mark: [{ node: "b", state: "ok" }] },
      ],
    },
  ],
};

export const commitSequence: SequenceSpec = {
  id: "file-storage-commit-sequence",
  title: "Pushing a change",
  description:
    "The client asks which chunks the server lacks, uploads only those, then commits against the revision it started from. Three outcomes: a normal commit, a dedupe hit with nothing to upload, and a conflict.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "sync", label: "Sync API", kind: "service" },
    { id: "meta", label: "Metadata", kind: "database" },
    { id: "blocks", label: "Block store", kind: "storage" },
  ],
  items: [
    { from: "client", to: "sync", label: "unknown(hashes)?" },
    { from: "sync", to: "meta", label: "which are new?" },
    {
      alt: [
        {
          when: "normal edit",
          items: [
            { from: "meta", to: "client", label: "new: [h2]", type: "reply" },
            { from: "client", to: "blocks", label: "put chunk h2" },
            { from: "client", to: "sync", label: "commit(path, base 7, chunks)" },
            { from: "sync", to: "meta", label: "base == current? yes" },
            { from: "meta", to: "client", label: "rev 8, cursor 41", type: "reply" },
          ],
        },
        {
          when: "dedupe hit",
          items: [
            { from: "meta", to: "client", label: "new: [] (all known)", type: "reply" },
            { note: "Nothing to upload: another file already holds these chunks", over: ["client", "blocks"] },
            { from: "client", to: "sync", label: "commit(path, base 0, chunks)" },
            { from: "sync", to: "meta", label: "chunks exist? yes" },
            { from: "meta", to: "client", label: "rev 1, cursor 42", type: "reply" },
          ],
        },
        {
          when: "conflict",
          items: [
            { from: "meta", to: "client", label: "new: [h3]", type: "reply" },
            { from: "client", to: "blocks", label: "put chunk h3" },
            { from: "client", to: "sync", label: "commit(path, base 7, chunks)" },
            { from: "sync", to: "meta", label: "base == current? no, it is 8" },
            { from: "meta", to: "client", label: "conflict, current rev 8", type: "reply" },
            { from: "client", to: "sync", label: "commit(conflicted copy, base 0)" },
            { note: "Both versions are kept; the user merges them", over: ["client", "meta"] },
          ],
        },
      ],
    },
  ],
};

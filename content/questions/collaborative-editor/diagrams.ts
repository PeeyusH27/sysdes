import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "collaborative-editor-architecture",
  title: "Collaborative editor architecture",
  description:
    "Editors keep a WebSocket to a gateway. A document router sends every connection for one document to the same session server, which orders edits, transforms concurrent ones, appends them to an operation log and broadcasts the result. Snapshots keep loading fast; presence and cursors travel on a separate lightweight channel.",
  nodes: [
    { id: "a", label: "Editor A", kind: "client", col: 0, row: 0, sub: "applies edits at once" },
    { id: "b", label: "Editor B", kind: "client", col: 0, row: 2, sub: "sees A's edits" },
    { id: "gw", label: "WS gateway", kind: "gateway", col: 1, row: 1, sub: "holds sockets" },
    { id: "router", label: "Doc router", kind: "service", col: 2, row: 0, sub: "doc id to server", note: "Consistent hashing on the document id. Every editor of one document lands on the same session server, so one process can put their edits in a single order." },
    { id: "session", label: "Doc session", kind: "service", col: 2, row: 1, sub: "orders + transforms", note: "Holds the live document in memory. Gives each accepted operation the next revision number, transforms it against operations the sender had not seen, and broadcasts it." },
    { id: "presence", label: "Presence", kind: "pubsub", col: 2, row: 2, sub: "cursors, names" },
    { id: "log", label: "Operation log", kind: "database", col: 3, row: 0, sub: "append-only", note: "Every accepted operation, in order, per document. This is the source of truth and the version history." },
    { id: "snap", label: "Snapshots", kind: "storage", col: 3, row: 1, sub: "every ~500 ops" },
  ],
  edges: [
    { from: "a", to: "gw", label: "op, baseRev" },
    { from: "b", to: "gw", label: "op, baseRev" },
    { from: "gw", to: "router", label: "who owns doc?" },
    { from: "gw", to: "session", label: "ops" },
    { from: "gw", to: "presence", label: "cursors", style: "async" },
    { from: "session", to: "log", label: "append" },
    { from: "session", to: "snap", label: "snapshot", style: "async" },
  ],
  scenarios: [
    {
      id: "type",
      name: "Type a character",
      steps: [
        { edge: "a>gw", caption: "A types 's'. It shows on A's screen immediately. The editor also sends insert('s', pos 3) with baseRev 12." },
        { edge: "gw>router", caption: "The gateway asks the router which session server owns this document." },
        { edge: "gw>session", caption: "The edit reaches that server. Nothing else has been accepted since revision 12, so there is nothing to transform against." },
        { edge: "session>log", caption: "It becomes revision 13 and is appended to the operation log. Only now is it durable.", mark: [{ node: "log", state: "ok" }] },
        { edge: "gw>session", reverse: true, caption: "The server acknowledges revision 13 to A, and broadcasts the operation to B." },
        { edge: "b>gw", reverse: true, tone: "ok", caption: "B applies the operation and sees the 's' appear, about 100 ms after A typed it.", mark: [{ node: "b", state: "ok" }] },
      ],
    },
    {
      id: "concurrent",
      name: "Concurrent edits",
      steps: [
        { edge: "a>gw", caption: "At revision 12, A appends an 's' to 'cat'. At the same moment, B deletes the 'c'." },
        { edge: "gw>session", caption: "A's edit arrives first. It becomes revision 13 with no changes." },
        { edge: "gw>session", caption: "B's delete(0) arrives with baseRev 12, but the server is at 13. It is transformed past A's insert: position 0 is before position 3, so it stays delete(0). It becomes revision 14." },
        { edge: "session>log", caption: "Both operations are in the log in one order.", mark: [{ node: "log", state: "ok" }] },
        { edge: "gw>session", reverse: true, caption: "A receives B's delete, already transformed. A had applied its own insert; the delete applies cleanly. A shows 'ats'." },
        { edge: "b>gw", reverse: true, tone: "ok", caption: "B receives A's insert transformed past its own delete: position 3 becomes 2. B also shows 'ats'. Both screens converge.", mark: [{ node: "b", state: "ok" }, { node: "a", state: "ok" }] },
      ],
    },
    {
      id: "reconnect",
      name: "Reconnect after offline",
      steps: [
        { edge: "b>gw", tone: "error", caption: "B's train enters a tunnel. B keeps typing; the edits are shown locally and queued.", mark: [{ node: "b", state: "down" }] },
        { edge: "a>gw", caption: "Meanwhile A and others edit. The log moves from revision 14 to 60." },
        { edge: "b>gw", caption: "B reconnects and says: join doc 7, last revision I saw is 14, and here are my 12 queued operations.", mark: [{ node: "b", state: null }] },
        { edge: "gw>session", caption: "The session sends B revisions 15 to 60, and transforms B's 12 operations past the 46 it missed." },
        { edge: "gw>session", reverse: true, tone: "ok", caption: "B's queued edits are accepted. B and everyone else converge. If B's edits were lost, they would be a data-loss bug, so they are retried by operation id." },
      ],
    },
    {
      id: "crash",
      name: "Session server crashes",
      steps: [
        { edge: "gw>session", tone: "error", caption: "The session server holding document 7 dies. Editors see 'reconnecting'.", mark: [{ node: "session", state: "down" }] },
        { edge: "gw>router", caption: "The router notices and assigns document 7 to another server." },
        { edge: "gw>session", caption: "The new server loads the latest snapshot (revision 500) and replays the log tail up to revision 537.", mark: [{ node: "session", state: null }] },
        { edge: "session>snap", reverse: true, caption: "Snapshot plus log tail rebuild the exact live document." },
        { edge: "gw>session", tone: "ok", caption: "Editors reconnect and resend unacknowledged operations. Operation ids make the retries idempotent, so nothing is applied twice.", mark: [{ node: "session", state: "ok" }] },
      ],
    },
  ],
};

export const mergeSequence: SequenceSpec = {
  id: "collaborative-editor-merge-sequence",
  title: "Two edits at once: OT and CRDT",
  description:
    "'cat' becomes 'ats' when A appends 's' and B deletes 'c' at the same moment. Operational transformation lets a server rewrite one operation so it still means the same thing after the other. A CRDT gives each character an id, so the operations merge without rewriting.",
  actors: [
    { id: "a", label: "Editor A", kind: "client" },
    { id: "server", label: "Server", kind: "service" },
    { id: "b", label: "Editor B", kind: "client" },
  ],
  items: [
    { note: "Both start from 'cat' at revision 12", over: ["a", "b"] },
    { from: "a", to: "server", label: "insert('s', pos 3)" },
    { from: "b", to: "server", label: "delete(pos 0)" },
    {
      alt: [
        {
          when: "OT",
          items: [
            { note: "Server accepts A first: revision 13", over: ["a", "server"] },
            { note: "B's delete is transformed past A's insert: position 0 is left of 3, unchanged: revision 14", over: ["server", "b"] },
            { from: "server", to: "b", label: "A's insert, shifted to pos 2", type: "reply" },
            { from: "server", to: "a", label: "B's delete(pos 0)", type: "reply" },
            { note: "Both show 'ats'. Position numbers changed on the way", over: ["a", "b"] },
          ],
        },
        {
          when: "CRDT",
          items: [
            { note: "A sends: insert 's' (id A:4) after 't' (id A:3)", over: ["a", "server"] },
            { note: "B sends: delete id A:1 (the 'c')", over: ["server", "b"] },
            { from: "server", to: "b", label: "insert A:4 after A:3", type: "reply" },
            { from: "server", to: "a", label: "delete A:1", type: "reply" },
            { note: "Ids never change, so no rewriting. Both show 'ats'. Deleted characters stay as tombstones", over: ["a", "b"] },
          ],
        },
      ],
    },
  ],
};

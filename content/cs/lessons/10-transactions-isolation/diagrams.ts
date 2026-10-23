import type { DecisionSpec, SequenceSpec } from "@/components/diagram/types";

export const writeSkew: SequenceSpec = {
  id: "write-skew",
  title: "Write skew: the rule is \"at least one doctor on call\"",
  description: "Two transactions each read that two doctors are on call and each takes a different doctor off. Under snapshot isolation both commit and nobody is on call. Under serializable isolation one is aborted and retried.",
  actors: [
    { id: "t1", label: "Alice's tx", kind: "client" },
    { id: "db", label: "Database", kind: "database" },
    { id: "t2", label: "Bob's tx", kind: "client" },
  ],
  items: [
    {
      alt: [
        {
          when: "Snapshot isolation",
          items: [
            { from: "t1", to: "db", label: "count doctors on call", type: "call" },
            { from: "db", to: "t1", label: "2", type: "reply" },
            { from: "t2", to: "db", label: "count doctors on call", type: "call" },
            { from: "db", to: "t2", label: "2", type: "reply" },
            { from: "t1", to: "db", label: "Alice goes off call", type: "call" },
            { from: "t2", to: "db", label: "Bob goes off call", type: "call" },
            { from: "t1", to: "db", label: "COMMIT", type: "call" },
            { from: "t2", to: "db", label: "COMMIT (different rows, no conflict)", type: "call" },
            { note: "Nobody is on call. Each transaction was correct alone.", over: ["t1", "t2"] },
          ],
        },
        {
          when: "Serializable",
          items: [
            { from: "t1", to: "db", label: "count doctors on call", type: "call" },
            { from: "db", to: "t1", label: "2", type: "reply" },
            { from: "t2", to: "db", label: "count doctors on call", type: "call" },
            { from: "db", to: "t2", label: "2", type: "reply" },
            { from: "t1", to: "db", label: "Alice off call, COMMIT", type: "call" },
            { from: "t2", to: "db", label: "Bob off call, COMMIT", type: "call" },
            { from: "db", to: "t2", label: "serialization failure: retry", type: "reply" },
            { note: "On retry Bob sees only 1 doctor on call and refuses to leave.", over: ["t2", "db"] },
          ],
        },
      ],
    },
  ],
};

export const isolationChoice: DecisionSpec = {
  id: "isolation-choice",
  title: "Which isolation level?",
  start: "invariant",
  nodes: {
    invariant: { q: "Does a rule span several rows that different transactions read and change (a count, a balance across accounts)?", yes: "retry", no: "report" },
    retry: { q: "Can the code retry a transaction that fails?", yes: "serializable", no: "locks" },
    report: { q: "Must one transaction see a stable view of the data while it runs (a report)?", yes: "rr", no: "rc" },
    serializable: { result: "Serializable, and retry on failure", why: "The database aborts one of two conflicting transactions. Wrap the transaction in a retry loop." },
    locks: { result: "Row locks (SELECT ... FOR UPDATE)", why: "Lock the rows you read so a concurrent writer waits. Keep the lock order consistent to avoid deadlock." },
    rr: { result: "Repeatable read (snapshot)", why: "A stable snapshot for the whole transaction. Expect write-conflict errors on updates." },
    rc: { result: "Read committed", why: "The usual default: no dirty reads, each statement sees the latest committed data. Fast and enough for most work." },
  },
};

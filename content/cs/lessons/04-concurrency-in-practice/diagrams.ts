import type { DecisionSpec } from "@/components/diagram/types";

export const concurrencyChoice: DecisionSpec = {
  id: "concurrency-choice",
  title: "Async, threads or processes?",
  start: "wait",
  nodes: {
    wait: { q: "Is the work mostly waiting on the network or disk?", yes: "many", no: "cpu" },
    many: { q: "Does a library you need block the thread?", yes: "threads", no: "async" },
    cpu: { q: "Does the work need to share memory?", yes: "threads", no: "procs" },
    async: { result: "Async I/O on an event loop", why: "One thread serves thousands of waiting tasks. Never block it with CPU work." },
    threads: { result: "A bounded thread pool", why: "Size by cores for CPU work and by wait over compute for blocking calls. Bound the queue." },
    procs: { result: "Separate processes or workers", why: "True parallelism with no shared state to lock. Pass messages or use a job queue." },
  },
};

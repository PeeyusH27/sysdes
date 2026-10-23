import type { DecisionSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const contextSwitch: TimelineSpec = {
  id: "context-switch",
  title: "One core, two threads, and the switch between them",
  description: "A timer interrupt stops thread A. The kernel saves A's registers, loads B's, and B runs. The switch itself is drawn much wider than it really is.",
  unit: "ms",
  lanes: [
    { id: "a", label: "Thread A" },
    { id: "k", label: "Kernel" },
    { id: "b", label: "Thread B" },
  ],
  spans: [
    { lane: "a", start: 0, end: 4, label: "A runs", tone: 1 },
    { lane: "k", start: 4, end: 4.7, label: "save A, load B", tone: 3 },
    { lane: "b", start: 4.7, end: 8.7, label: "B runs", tone: 2 },
    { lane: "k", start: 8.7, end: 9.4, label: "save B, load A", tone: 3 },
    { lane: "a", start: 9.4, end: 13.4, label: "A resumes", tone: 1 },
  ],
  markers: [
    { at: 4, label: "timer interrupt" },
    { at: 8.7, label: "time slice ends" },
  ],
};

export const forkExec: SequenceSpec = {
  id: "fork-exec",
  title: "Starting a program: fork, exec, wait",
  description: "The parent asks the kernel to clone it, the child replaces its own code with a new program, and the parent waits for the exit status.",
  actors: [
    { id: "parent", label: "Parent", kind: "service" },
    { id: "kernel", label: "Kernel", kind: "gateway" },
    { id: "child", label: "Child", kind: "worker" },
  ],
  items: [
    { from: "parent", to: "kernel", label: "fork()", type: "call" },
    { from: "kernel", to: "child", label: "clone: same memory, copy-on-write", type: "async" },
    { from: "kernel", to: "parent", label: "child's PID", type: "reply" },
    { from: "child", to: "kernel", label: "exec(\"ls\"): replace code and data", type: "call" },
    { from: "parent", to: "kernel", label: "wait(pid)", type: "call" },
    { note: "Skip wait() and the exited child stays in the process table as a zombie", over: ["kernel", "child"] },
    { from: "child", to: "kernel", label: "exit(0)", type: "call" },
    { from: "kernel", to: "parent", label: "exit status 0", type: "reply" },
  ],
};

export const modelChoice: DecisionSpec = {
  id: "model-choice",
  title: "Process, thread or event loop?",
  start: "isolate",
  nodes: {
    isolate: { q: "Must a crash or a bug stay out of the other work?", yes: "process", no: "wait" },
    wait: { q: "Does the work mostly wait on the network or disk?", yes: "many", no: "cpu" },
    many: { q: "Thousands of connections at once?", yes: "loop", no: "thread" },
    cpu: { q: "Does the work need to share memory?", yes: "thread", no: "process" },
    process: { result: "Separate processes", why: "Own address space, so a crash or exploit stays inside. Browser tabs, Postgres connections and nginx workers do this." },
    thread: { result: "Threads", why: "Cheap to start and they share the heap. Use locks, and keep the shared state small." },
    loop: { result: "Event loop (async I/O)", why: "One thread serves thousands of idle connections without a stack each. Move CPU-heavy work to workers." },
  },
};

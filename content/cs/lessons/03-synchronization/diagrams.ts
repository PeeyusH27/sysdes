import type { SequenceSpec } from "@/components/diagram/types";

export const conditionVariable: SequenceSpec = {
  id: "condition-variable",
  title: "A condition variable: wait releases the lock, signal wakes the waiter",
  description: "The consumer finds the queue empty and waits, which unlocks the mutex and sleeps. The producer locks, adds an item, signals and unlocks. The consumer wakes, re-locks the mutex and checks the queue again.",
  actors: [
    { id: "consumer", label: "Consumer", kind: "worker" },
    { id: "mutex", label: "Mutex + queue", kind: "database" },
    { id: "producer", label: "Producer", kind: "service" },
  ],
  items: [
    { from: "consumer", to: "mutex", label: "lock()", type: "call" },
    { note: "Queue is empty, so check fails", over: ["consumer", "mutex"] },
    { from: "consumer", to: "mutex", label: "wait(cond): unlock and sleep", type: "call" },
    { from: "producer", to: "mutex", label: "lock()", type: "call" },
    { from: "producer", to: "mutex", label: "push(item)", type: "call" },
    { from: "producer", to: "consumer", label: "signal(cond)", type: "async" },
    { from: "producer", to: "mutex", label: "unlock()", type: "call" },
    { from: "consumer", to: "mutex", label: "wake: re-lock, check again", type: "call" },
    { from: "mutex", to: "consumer", label: "queue not empty: pop item", type: "reply" },
  ],
};

// Turns what the simulator reports into sentences: what is down, what is over capacity, what is backing up, and what
// to do about each. Used by the lab's "break something" mode.
import type { NodeKind } from "@/components/diagram/types";
import type { SimResult } from "@/components/playground/simulate";
import type { HldNode } from "@/components/playground/types";
import { compact } from "@/lib/format";

export interface Finding {
  level: "bad" | "warn" | "ok";
  node?: string;
  text: string;
}

const ADVICE: Partial<Record<NodeKind, string>> = {
  service: "Add instances: the app tier is stateless, so this is the easy fix.",
  database: "Add read replicas or cache more of the reads. Writes need a bigger primary or sharding.",
  cache: "Add cache nodes, or check the hit ratio: a cold cache sends everything to the database.",
  gateway: "Run more gateway instances.",
  lb: "Add balancer capacity or another balancer.",
  worker: "Add workers or batch the work, or the queue keeps growing.",
  search: "Add shards or replicas to the index.",
  external: "You do not control a provider: queue the calls, and rate limit yourself to its limit.",
  queue: "Add partitions so more consumers can read in parallel.",
};

const DOWN_ADVICE: Partial<Record<NodeKind, string>> = {
  database: "With no replica to promote, writes and cache misses fail. A replica lets you fail over.",
  cache: "Reads fall through to the database, which has to survive a cold cache. Plan for it, or add a second cache node.",
  gateway: "Everything passes through it, so everything fails. Run several instances.",
  lb: "No traffic reaches the servers. Run a pair of balancers.",
  service: "Run more than one instance so one failure is not an outage.",
  external: "Calls to the provider fail. Retry from a queue instead of failing the request.",
};

/** What is wrong right now, worst first. When nothing is, one reassuring line. */
export function diagnose(nodes: HldNode[], sim: SimResult): Finding[] {
  const out: Finding[] = [];
  const label = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  for (const n of nodes) {
    const s = sim.nodes[n.id];
    if (!s) continue;
    if (s.down) {
      out.push({ level: "bad", node: n.id, text: `${n.data.label} is down. ${DOWN_ADVICE[n.data.kind] ?? "Anything that depends on it fails."}` });
    } else if (n.data.kind !== "client" && s.util > 1) {
      out.push({ level: "bad", node: n.id, text: `${n.data.label} is at ${Math.round(s.util * 100)}% of capacity. ${ADVICE[n.data.kind] ?? "Add capacity."}` });
    } else if (n.data.kind !== "client" && s.util > 0.8) {
      out.push({ level: "warn", node: n.id, text: `${n.data.label} is at ${Math.round(s.util * 100)}%: one more spike and it tips over.` });
    }
  }
  for (const [id, b] of Object.entries(sim.backlog)) {
    if (b > 0.5) out.push({ level: "bad", node: id, text: `${label(id)} backs up by ${compact(b)} messages a second: the consumers cannot keep up. ${ADVICE.worker}` });
  }
  if (sim.errorsPerSec > 0.5) out.unshift({ level: "bad", text: `${compact(sim.errorsPerSec)} requests a second are failing.` });
  const rank = { bad: 0, warn: 1, ok: 2 } as const;
  out.sort((a, b) => rank[a.level] - rank[b.level]);
  return out.length ? out : [{ level: "ok", text: "Everything holds. Now try to break something." }];
}

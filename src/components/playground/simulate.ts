import { KIND_META } from "@/components/diagram/kinds";
import { topoOrder } from "./graph";
import type { FlowEdgeT, HldNode } from "./types";

type Load = { r: number; w: number };
const zero = (): Load => ({ r: 0, w: 0 });
const scale = (l: Load, fr: number, fw = fr): Load => ({ r: l.r * fr, w: l.w * fw });
const total = (l: Load) => l.r + l.w;

export interface SimOptions {
  /** Multiplies every client's QPS (e.g. 10 for a spike). */
  multiplier?: number;
  /** Node ids that are down: they forward nothing; balancers skip them. */
  down?: Set<string>;
  /**
   * Node ids that lose one instance. A node with replicas ≥ 2 keeps serving with less capacity; a node with a single
   * instance is down. This is what makes a replica visibly worth its cost.
   */
  lose?: Set<string>;
}

export interface SimResult {
  nodes: Record<string, { qps: number; util: number; latencyMs: number; down?: boolean }>;
  edges: Record<string, number>;
  backlog: Record<string, number>;
  bottleneck?: string;
  entryLatencyMs: number;
  errorsPerSec: number;
}

/**
 * Steady-state flow model (an educational approximation, not a queueing simulator):
 * clients emit reads/writes; LBs split evenly; caches/CDNs pass only read misses; with cache-aside
 * the DB sees reads × (1 − hit) + writes; queues are async boundaries; DB reads spread across replicas.
 */
export function simulate(nodes: HldNode[], edges: FlowEdgeT[], opts: SimOptions = {}): SimResult {
  const mult = opts.multiplier ?? 1;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lost = opts.lose ?? new Set<string>();
  const instances = (n: HldNode) => Math.max(0, (n.data.replicas ?? 1) - (lost.has(n.id) ? 1 : 0));
  const down = new Set(opts.down ?? []);
  for (const n of nodes) if (lost.has(n.id) && instances(n) === 0) down.add(n.id);
  const valid = edges.filter((e) => byId.has(e.source) && byId.has(e.target));
  const out = new Map<string, FlowEdgeT[]>();
  for (const e of valid) out.set(e.source, [...(out.get(e.source) ?? []), e]);
  const cfg = (n: HldNode) => {
    const meta = KIND_META[n.data.kind];
    return {
      perInstanceQps: n.data.perInstanceQps ?? meta.perInstanceQps,
      latencyMs: n.data.latencyMs ?? meta.latencyMs,
      hitRatio: n.data.hitRatio ?? meta.hitRatio ?? 0,
    };
  };
  const cap = (n: HldNode) => cfg(n).perInstanceQps * instances(n);

  const load = new Map(nodes.map((n) => [n.id, zero()]));
  for (const n of nodes) {
    if (n.data.kind !== "client") continue;
    const q = (n.data.qps ?? 1_000) * mult;
    const rr = n.data.readRatio ?? 0.9;
    load.set(n.id, { r: q * rr, w: q * (1 - rr) });
  }
  const edgeQps: Record<string, number> = {};
  const backlog: Record<string, number> = {};
  let errors = 0;

  for (const id of topoOrder(nodes, valid)) {
    const n = byId.get(id)!;
    const kind = n.data.kind;
    if (down.has(id)) {
      errors += total(load.get(id)!);
      continue;
    }
    const targets = out.get(id) ?? [];
    if (!targets.length) continue;
    let fwd = load.get(id)!;
    if (kind === "cdn" || kind === "cache") fwd = scale(fwd, 1 - cfg(n).hitRatio, 1); // only read misses continue
    if (kind === "queue") {
      const consumers = targets.filter((e) => !down.has(e.target));
      const drain = Math.min(total(fwd), consumers.reduce((s, e) => s + cap(byId.get(e.target)!), 0));
      backlog[id] = total(fwd) - drain;
      fwd = scale(fwd, total(fwd) ? drain / total(fwd) : 0);
    }
    const splits = kind === "lb" || kind === "gateway" || kind === "dns";
    // A gateway calls a cache on the side (rate-limit counters, sessions): the cache sees every request and does not
    // take a share of the traffic away from the services behind the gateway. A dead side cache still receives the load,
    // so its failure shows up as errors (the gateway cannot decide without it).
    const isSide = (e: FlowEdgeT) => kind === "gateway" && byId.get(e.target)!.data.kind === "cache";
    const main = targets.filter((e) => !isSide(e));
    const live = splits ? main.filter((e) => !down.has(e.target)) : targets;
    const side = splits ? targets.filter(isSide) : [];
    if (splits && main.length > 0 && live.length === 0) errors += total(fwd);
    const sideCache = [...live, ...side].map((e) => byId.get(e.target)!).find((t) => t.data.kind === "cache" && !down.has(t.id));
    for (const e of [...live, ...side]) {
      const t = byId.get(e.target)!;
      let l = splits && !side.includes(e) ? scale(fwd, e.data?.weight ?? 1 / live.length) : fwd;
      if (sideCache && t.data.kind === "database") l = scale(l, 1 - cfg(sideCache).hitRatio, 1); // cache-aside
      edgeQps[e.id] = total(l);
      const acc = load.get(t.id)!;
      acc.r += l.r;
      acc.w += l.w;
    }
  }

  const util = (n: HldNode) => {
    const l = load.get(n.id)!;
    if (!Number.isFinite(cap(n))) return 0;
    return n.data.kind === "database" ? Math.max(l.r / cap(n), l.w / cfg(n).perInstanceQps) : total(l) / cap(n);
  };

  const memo = new Map<string, number>();
  const latency = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    memo.set(id, 0); // cycle guard
    const n = byId.get(id)!;
    const kind = n.data.kind;
    let ms = cfg(n).latencyMs / (1 - Math.min(util(n), 0.95));
    const sync = kind === "queue" ? [] : (out.get(id) ?? []).filter((e) => !e.data?.async && !down.has(e.target));
    const sideCache = sync.map((e) => byId.get(e.target)!).find((t) => t.data.kind === "cache");
    const parts = sync.map((e) => {
      const t = byId.get(e.target)!;
      return latency(t.id) * (t.data.kind === "database" && sideCache ? 1 - cfg(sideCache).hitRatio : 1);
    });
    const sum = parts.reduce((a, b) => a + b, 0);
    if (kind === "gateway") {
      // Side calls to a cache add up; the services behind the gateway are averaged, like a balancer's targets.
      const isCache = sync.map((e) => byId.get(e.target)!.data.kind === "cache");
      const sideSum = parts.filter((_, i) => isCache[i]).reduce((a, b) => a + b, 0);
      const rest = parts.filter((_, i) => !isCache[i]);
      ms += sideSum + (rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : 0);
    } else if (kind === "lb" || kind === "dns") ms += parts.length ? sum / parts.length : 0;
    else if (kind === "cdn" || kind === "cache") ms += (1 - cfg(n).hitRatio) * sum;
    else ms += sum;
    memo.set(id, ms);
    return ms;
  };

  const clients = nodes.filter((n) => n.data.kind === "client");
  const entryLatencyMs = clients.length ? Math.max(...clients.map((c) => latency(c.id))) : 0;
  const ranked = nodes.filter((n) => n.data.kind !== "client" && !down.has(n.id)).sort((a, b) => util(b) - util(a));

  return {
    nodes: Object.fromEntries(
      nodes.map((n) => [n.id, { qps: total(load.get(n.id)!), util: util(n), latencyMs: latency(n.id), down: down.has(n.id) || undefined }]),
    ),
    edges: edgeQps,
    backlog,
    bottleneck: ranked[0] && util(ranked[0]) > 0 ? ranked[0].id : undefined,
    entryLatencyMs,
    errorsPerSec: errors,
  };
}

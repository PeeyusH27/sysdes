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
  const down = opts.down ?? new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
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
  const cap = (n: HldNode) => cfg(n).perInstanceQps * (n.data.replicas ?? 1);

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
    const live = splits ? targets.filter((e) => !down.has(e.target)) : targets;
    if (splits && live.length === 0) errors += total(fwd);
    const sideCache = live.map((e) => byId.get(e.target)!).find((t) => t.data.kind === "cache" && !down.has(t.id));
    for (const e of live) {
      const t = byId.get(e.target)!;
      let l = splits ? scale(fwd, e.data?.weight ?? 1 / live.length) : fwd;
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
    if (kind === "lb" || kind === "gateway" || kind === "dns") ms += parts.length ? sum / parts.length : 0;
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

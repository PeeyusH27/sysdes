import {
  Cog, Database, Globe, HardDrive, Hash, Layers, Monitor, Plug, Radio, Search,
  Server, ShieldCheck, Signpost, Split, Zap, type LucideIcon,
} from "lucide-react";
import type { NodeKind } from "./types";

export interface KindMeta {
  label: string;
  icon: LucideIcon;
  /** CSS colour (token) used for strokes and legend swatches. Always paired with the icon. */
  color: string;
  group: "Edge" | "Compute" | "Data" | "Messaging" | "External";
  /** Simulation defaults (order-of-magnitude teaching values). */
  perInstanceQps: number;
  latencyMs: number;
  hitRatio?: number;
}

export const KIND_META: Record<NodeKind, KindMeta> = {
  client: { label: "Client", icon: Monitor, color: "var(--k-client)", group: "Edge", perInstanceQps: Infinity, latencyMs: 0 },
  dns: { label: "DNS", icon: Signpost, color: "var(--k-client)", group: "Edge", perInstanceQps: Infinity, latencyMs: 0 },
  cdn: { label: "CDN", icon: Globe, color: "var(--k-gateway)", group: "Edge", perInstanceQps: Infinity, latencyMs: 20, hitRatio: 0.8 },
  lb: { label: "Load balancer", icon: Split, color: "var(--k-gateway)", group: "Compute", perInstanceQps: 50_000, latencyMs: 1 },
  gateway: { label: "API gateway", icon: ShieldCheck, color: "var(--k-gateway)", group: "Compute", perInstanceQps: 20_000, latencyMs: 3 },
  service: { label: "Service", icon: Server, color: "var(--k-service)", group: "Compute", perInstanceQps: 2_000, latencyMs: 20 },
  worker: { label: "Worker", icon: Cog, color: "var(--k-service)", group: "Compute", perInstanceQps: 200, latencyMs: 100 },
  idgen: { label: "ID generator", icon: Hash, color: "var(--k-service)", group: "Compute", perInstanceQps: 50_000, latencyMs: 1 },
  cache: { label: "Cache", icon: Zap, color: "var(--k-cache)", group: "Data", perInstanceQps: 100_000, latencyMs: 1, hitRatio: 0.9 },
  database: { label: "Database", icon: Database, color: "var(--k-database)", group: "Data", perInstanceQps: 5_000, latencyMs: 10 },
  storage: { label: "Object storage", icon: HardDrive, color: "var(--k-database)", group: "Data", perInstanceQps: Infinity, latencyMs: 50 },
  search: { label: "Search index", icon: Search, color: "var(--k-database)", group: "Data", perInstanceQps: 2_000, latencyMs: 30 },
  queue: { label: "Queue", icon: Layers, color: "var(--k-queue)", group: "Messaging", perInstanceQps: 50_000, latencyMs: 5 },
  pubsub: { label: "Pub/Sub", icon: Radio, color: "var(--k-queue)", group: "Messaging", perInstanceQps: 100_000, latencyMs: 2 },
  external: { label: "External API", icon: Plug, color: "var(--k-external)", group: "External", perInstanceQps: 500, latencyMs: 200 },
};

export const PALETTE_GROUPS: { name: KindMeta["group"]; kinds: NodeKind[] }[] = [
  { name: "Edge", kinds: ["client", "dns", "cdn"] },
  { name: "Compute", kinds: ["lb", "gateway", "service", "worker", "idgen"] },
  { name: "Data", kinds: ["cache", "database", "storage", "search"] },
  { name: "Messaging", kinds: ["queue", "pubsub"] },
  { name: "External", kinds: ["external"] },
];


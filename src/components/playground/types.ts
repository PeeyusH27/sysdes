import type { Edge, Node } from "@xyflow/react";
import type { NodeKind } from "@/components/diagram/types";

export interface HldData extends Record<string, unknown> {
  kind: NodeKind;
  label: string;
  replicas?: number;
  perInstanceQps?: number;
  latencyMs?: number;
  hitRatio?: number;
  /** clients only */
  qps?: number;
  readRatio?: number;
  role?: "dlq";
  /** transient: how a scene draws this node (the architecture lab): newly added, on the path being followed, or faded */
  tone?: "new" | "active" | "dim";
  /** transient: written by the simulator / lint highlight, never persisted */
  sim?: { qps: number; util: number; latencyMs: number; down?: boolean };
  flagged?: boolean;
}
export type HldNode = Node<HldData, "hld">;

export interface FlowEdgeData extends Record<string, unknown> {
  protocol?: string;
  async?: boolean;
  weight?: number;
  /** The fraction of the caller's traffic that takes this edge (search gets 10% of requests, email 5%). Default 1. */
  share?: number;
  label?: string;
  /** transient */
  qps?: number;
  flagged?: boolean;
  tone?: "active" | "dim";
  /** transient: show only the traffic number on the label (the architecture lab, where edges are short) */
  quiet?: boolean;
}
export type FlowEdgeT = Edge<FlowEdgeData, "flow">;

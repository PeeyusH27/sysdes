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
  /** transient: written by the simulator / lint highlight, never persisted */
  sim?: { qps: number; util: number; latencyMs: number; down?: boolean };
  flagged?: boolean;
}
export type HldNode = Node<HldData, "hld">;

export interface FlowEdgeData extends Record<string, unknown> {
  protocol?: string;
  async?: boolean;
  weight?: number;
  label?: string;
  /** transient */
  qps?: number;
  flagged?: boolean;
}
export type FlowEdgeT = Edge<FlowEdgeData, "flow">;

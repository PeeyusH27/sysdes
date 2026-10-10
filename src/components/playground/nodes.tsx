"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleAlert, CircleCheck, CircleX, Flame } from "lucide-react";
import { KIND_META } from "@/components/diagram/kinds";
import { compact } from "@/lib/format";
import type { HldNode } from "./types";

const SIDES = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const;

export const ComponentNode = memo(function ComponentNode({ data, selected }: NodeProps<HldNode>) {
  const meta = KIND_META[data.kind];
  const Icon = meta.icon;
  const util = data.sim?.util;
  const down = data.sim?.down;
  const load = down ? "over" : util == null ? undefined : util < 0.7 ? "ok" : util < 1 ? "hot" : "over";
  const LoadIcon = down ? CircleX : load === "ok" ? CircleCheck : load === "hot" ? CircleAlert : Flame;
  return (
    <div
      className="hld-node"
      data-kind={data.kind}
      data-selected={selected || undefined}
      data-load={load}
      data-flagged={data.flagged || undefined}
      style={{ ["--kind" as string]: meta.color }}
      aria-label={`${data.label}, ${meta.label}${(data.replicas ?? 1) > 1 ? `, ${data.replicas} replicas` : ""}`}
    >
      {SIDES.map(([id, pos]) => (
        <Handle key={id} id={id} type="source" position={pos} />
      ))}
      <Icon size={16} aria-hidden style={{ color: meta.color, flex: "none" }} />
      <span className="label">{data.label}</span>
      {data.role === "dlq" && <span className="badge-x">DLQ</span>}
      {(data.replicas ?? 1) > 1 && <span className="badge-x">×{data.replicas}</span>}
      {data.sim && data.kind !== "client" && (
        <span className="load">
          <LoadIcon size={12} aria-hidden />
          {down ? "down" : `${compact(data.sim.qps)}/s · ${Number.isFinite(util!) ? Math.round(util! * 100) : 0}%`}
        </span>
      )}
      {data.sim && data.kind === "client" && <span className="load muted">{compact(data.sim.qps)}/s sent</span>}
    </div>
  );
});

export const nodeTypes = { hld: ComponentNode };

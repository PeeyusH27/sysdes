"use client";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { useReducedMotion } from "motion/react";
import { compact } from "@/lib/format";
import type { FlowEdgeT } from "./types";

export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }: EdgeProps<FlowEdgeT>) {
  const reduce = useReducedMotion();
  const [path, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const qps = data?.qps ?? 0;
  const dots = reduce || qps <= 0 ? 0 : Math.min(4, 1 + Math.floor(Math.log10(Math.max(qps, 1))));
  const dur = Math.max(0.6, 2.4 - Math.log10(Math.max(qps, 1)) * 0.4);
  const label = data?.label ?? data?.protocol;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          strokeDasharray: data?.async ? "5 5" : undefined,
          stroke: data?.flagged ? "var(--critical)" : data?.tone === "active" ? "var(--accent)" : undefined,
          strokeWidth: data?.flagged ? 2.6 : data?.tone === "active" ? 3.4 : undefined,
          opacity: data?.tone === "dim" ? 0.25 : undefined,
        }}
      />
      {Array.from({ length: dots }, (_, i) => (
        <circle key={`${i}-${dur}`} r={3.5} className="edge-packet">
          <animateMotion dur={`${dur}s`} begin={`${(i * dur) / dots}s`} repeatCount="indefinite" path={path} />
        </circle>
      ))}
      {(label || qps > 0 || selected) && (
        <EdgeLabelRenderer>
          <div className="edge-label-rf nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            {data?.quiet ? (qps > 0 ? `${compact(qps)}/s` : (label ?? "")) : (label ?? "HTTP")}
            {data?.async && !data?.quiet ? " · async" : ""}
            {!data?.quiet && qps > 0 && ` · ${compact(qps)}/s`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };

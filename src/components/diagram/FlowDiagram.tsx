"use client";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { m, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/hooks";
import { playgroundHref } from "@/components/playground/share";
import { Hammer } from "lucide-react";
import { KIND_META } from "./kinds";
import { layoutFlow, NODE, type LaidOutEdge, type Pt } from "./layout";
import { ArrowMarker, Legend, Packet, StateBadge, StepControls } from "./parts";
import type { FlowNode, FlowSpec, NodeState, ScenarioStep } from "./types";
import { useStepper } from "./useStepper";

const NO_STEPS: ScenarioStep[] = [];

export function FlowDiagram({
  spec,
  scenario: initial,
  autoplay = false,
  loop = false,
  compact = false,
}: {
  spec: FlowSpec;
  scenario?: string;
  autoplay?: boolean;
  loop?: boolean;
  /** Hide controls/caption chrome (used by the home hero). */
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const narrow = useMediaQuery("(max-width: 640px)");
  const { pos, edges, width, height } = useMemo(() => layoutFlow(spec, narrow ? "vertical" : "horizontal"), [spec, narrow]);

  const [scenarioId, setScenarioId] = useState(initial ?? spec.scenarios?.[0]?.id);
  const scenario = spec.scenarios?.find((s) => s.id === scenarioId);
  const steps = scenario?.steps ?? NO_STEPS;
  const durationOf = useCallback((i: number) => steps[i]?.ms ?? 1100, [steps]);

  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: "-10% 0px" });
  const seen = useInView(box, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const stepper = useStepper(steps.length, durationOf, { loop, autoplay: autoplay && !reduce });

  const [hover, setHover] = useState<string | null>(null);
  const near = useMemo(
    () => (hover ? new Set(edges.filter((e) => e.from === hover || e.to === hover).flatMap((e) => [e.id, e.from, e.to])) : null),
    [hover, edges],
  );

  const step = stepper.index >= 0 ? steps[stepper.index] : undefined;
  const live = step ? [step, ...(step.with ?? [])] : [];
  const active = new Set<string>(live.map((s) => s.edge));
  const marks = useMemo(() => {
    const out: Record<string, NodeState | null> = {};
    for (const s of steps.slice(0, stepper.index + 1)) {
      for (const x of [...(s.mark ?? []), ...(s.with ?? []).flatMap((w) => w.mark ?? [])]) out[x.node] = x.state;
    }
    return out;
  }, [steps, stepper.index]);

  const caption = step?.caption ?? spec.description;

  return (
    <figure ref={box} className={cn("flow", !inView && "is-paused", compact && "flow--compact")}>
      <div
        className="flow-scroll"
        tabIndex={scenario && !compact ? 0 : undefined}
        aria-keyshortcuts={scenario ? "Space ArrowLeft ArrowRight Home" : undefined}
        onKeyDown={scenario ? stepper.handleKey : undefined}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${uid}t ${uid}d`}
          style={{ width: "100%", maxWidth: width, minWidth: compact ? undefined : narrow ? Math.min(width, 420) : Math.min(width, Math.max(500, width * 0.7)) }}
        >
          <title id={`${uid}t`}>{spec.title}</title>
          <desc id={`${uid}d`}>{spec.description}</desc>
          <defs>
            <ArrowMarker id={`${uid}-arrow`} />
          </defs>
          {edges.map((e, i) => (
            <FlowEdgeView
              key={e.id}
              edge={e}
              marker={`url(#${uid}-arrow)`}
              active={active.has(e.id)}
              dimmed={!!near && !near.has(e.id)}
              trace={seen && !reduce}
              traceDelay={i * 0.12}
            />
          ))}
          {spec.nodes.map((n) => (
            <FlowNodeView
              key={n.id}
              node={n}
              at={pos.get(n.id)!}
              state={marks[n.id] ?? null}
              dimmed={!!near && !near.has(n.id)}
              onHover={setHover}
            />
          ))}
          {!reduce &&
            inView &&
            live.map((s, i) => (
              <Packet
                key={`${stepper.index}-${i}-${s.edge}-${narrow}`}
                d={edges.find((e) => e.id === s.edge)?.d ?? ""}
                reverse={s.reverse}
                tone={s.tone}
                ms={((s.ms ?? 1100) * 0.7) / stepper.speed}
              />
            ))}
        </svg>
      </div>
      {!compact && (
        <figcaption>
          {scenario && (
            <StepControls stepper={stepper}>
              {spec.scenarios!.length > 1 && (
                <div className="scenario-tabs" role="radiogroup" aria-label="Scenario">
                  {spec.scenarios!.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={s.id === scenarioId}
                      onClick={() => {
                        setScenarioId(s.id);
                        stepper.reset();
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </StepControls>
          )}
          <p className="flow-caption" aria-live="polite">
            {step && <span className="step-no">{stepper.index + 1}</span>}
            {caption}
          </p>
          <div className="flow-foot">
            <Legend kinds={[...new Set(spec.nodes.map((n) => n.kind))]} />
            <a className="open-pg" href={playgroundHref(spec)}>
              <Hammer size={13} aria-hidden /> Open in playground
            </a>
            {scenario && (
              <details className="text-desc">
                <summary>Text description</summary>
                <ol>
                  {steps.map((s, i) => (
                    <li key={i}>{s.caption}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </figcaption>
      )}
    </figure>
  );
}

function FlowEdgeView({
  edge,
  marker,
  active,
  dimmed,
  trace,
  traceDelay,
}: {
  edge: LaidOutEdge;
  marker: string;
  active: boolean;
  dimmed: boolean;
  trace: boolean;
  traceDelay: number;
}) {
  const { d, mid, label, style = "sync" } = edge;
  return (
    <g className="edge" data-active={active || undefined} data-dim={dimmed || undefined}>
      <path d={d} className="edge-base" markerEnd={marker} />
      <path d={d} className="edge-flow" data-style={style} />
      {trace && (
        <m.path
          d={d}
          className="edge-trace"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ pathLength: { duration: 0.7, delay: traceDelay }, opacity: { duration: 0.4, delay: traceDelay + 0.7 } }}
        />
      )}
      {label && (
        <text x={mid.x} y={mid.y - 6} textAnchor="middle" className="edge-label">
          {label}
        </text>
      )}
    </g>
  );
}

function FlowNodeView({
  node,
  at,
  state,
  dimmed,
  onHover,
}: {
  node: FlowNode;
  at: Pt;
  state: NodeState | null;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}) {
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;
  return (
    <g
      className="node"
      data-kind={node.kind}
      data-state={state ?? undefined}
      data-dim={dimmed || undefined}
      transform={`translate(${at.x - NODE.w / 2},${at.y - NODE.h / 2})`}
      tabIndex={0}
      role="group"
      aria-label={`${node.label} (${meta.label})${state ? `, ${state}` : ""}${node.note ? `. ${node.note}` : ""}`}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
    >
      {node.note && <title>{node.note}</title>}
      <rect width={NODE.w} height={NODE.h} rx={10} style={{ stroke: meta.color }} />
      <Icon x={10} y={NODE.h / 2 - 8} width={16} height={16} aria-hidden style={{ color: meta.color }} />
      <text x={33} y={node.sub ? 20 : 27.5} className="node-label">
        {node.label}
      </text>
      {node.sub && (
        <text x={33} y={35} className="node-sub">
          {node.sub}
        </text>
      )}
      {state && <StateBadge state={state} x={NODE.w + 6} y={0} />}
    </g>
  );
}

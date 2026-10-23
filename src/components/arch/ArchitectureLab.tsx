"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, ConnectionMode, MarkerType, ReactFlow, ReactFlowProvider, useReactFlow, type NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, Flame, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { edgeTypes } from "@/components/playground/edges";
import { assignHandles } from "@/components/playground/graph";
import { nodeTypes } from "@/components/playground/nodes";
import { simulate, type SimResult } from "@/components/playground/simulate";
import type { FlowEdgeT, HldNode } from "@/components/playground/types";
import { ConceptCard } from "./ConceptCard";
import { CONCEPTS } from "@/lib/arch/concepts";
import { diagnose } from "@/lib/arch/diagnose";
import { checkStage, docAt, FULL, graphOf, hopEdges, SCENARIOS, STAGES, type ArchNodeId, type Scenario } from "@/lib/arch/design";
import { compact } from "@/lib/format";
import { useReducedMotionPref } from "@/lib/arch/motion";

type Mode = "grow" | "explore" | "fidget" | "follow";
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "grow", label: "Grow it", hint: "From one server to a whole infrastructure, one problem at a time" },
  { id: "explore", label: "Click a box", hint: "What each component is, and when not to add it" },
  { id: "fidget", label: "Break it", hint: "Spike the traffic, kill a server, lose a zone" },
  { id: "follow", label: "Follow a request", hint: "Watch one request cross the whole stack" },
];

export function ArchitectureLab() {
  return (
    <ReactFlowProvider>
      <Lab />
    </ReactFlowProvider>
  );
}

function Lab() {
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow();
  const reduce = useReducedMotionPref();
  const [mode, setMode] = useState<Mode>("grow");
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState<ArchNodeId | null>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  // Break it
  const [mult, setMult] = useState(1);
  const [readRatio, setReadRatio] = useState(0.97);
  const [hit, setHit] = useState(0.85);
  const [down, setDown] = useState<Set<string>>(new Set());
  const [lose, setLose] = useState<Set<string>>(new Set());
  // Follow a request
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [hop, setHop] = useState(0);

  const growing = mode === "grow";
  // A story or a request stops by itself at the end: derived, so no effect has to switch it off.
  const storyPlaying = playing && mode === "grow" && stage < STAGES.length - 1;
  const requestPlaying = playing && mode === "follow" && hop < scenario.hops.length - 1;
  const stageIdx = growing ? stage : FULL;
  const s = STAGES[stageIdx];

  // The design on screen, and what the simulator says about it.
  const { nodes: baseNodes, edges: baseEdges, sim } = useMemo(() => {
    const doc = docAt(stageIdx, mode === "fidget" ? { qps: STAGES[FULL].qps * mult, readRatio, hitRatio: hit } : {});
    const g = graphOf(doc);
    const result: SimResult | null =
      mode === "follow" ? null : simulate(g.nodes, g.edges, mode === "fidget" ? { down, lose } : {});
    return { ...g, sim: result };
  }, [stageIdx, mode, mult, readRatio, hit, down, lose]);

  const hopList = useMemo(() => hopEdges(scenario), [scenario]);

  const nodes = useMemo<HldNode[]>(
    () =>
      baseNodes.map((n) => {
        let tone: HldNode["data"]["tone"];
        if (growing && stage > 0 && s.adds.includes(n.id as ArchNodeId)) tone = "new";
        if (mode === "follow") {
          const at = scenario.hops.findIndex((h) => h.node === n.id);
          tone = at >= 0 && at <= hop ? "active" : "dim";
        }
        return { ...n, position: pos[n.id] ?? n.position, selected: picked === n.id, data: { ...n.data, sim: sim?.nodes[n.id], tone } };
      }),
    [baseNodes, pos, picked, sim, growing, stage, s, mode, scenario, hop],
  );
  const edges = useMemo<FlowEdgeT[]>(
    () =>
      // Each edge leaves and enters on the sides that face each other, wherever the boxes have been dragged to.
      assignHandles(nodes, baseEdges, true).map((e) => {
        let tone: "active" | "dim" | undefined;
        if (mode === "follow") {
          const at = hopList.indexOf(e.id);
          tone = at >= 0 && at <= hop ? "active" : "dim";
        }
        return { ...e, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 }, data: { ...e.data, qps: sim?.edges[e.id], tone, quiet: true } };
      }),
    [nodes, baseEdges, sim, mode, hopList, hop],
  );

  const refit = useCallback(() => setTimeout(() => fitView({ padding: 0.06, maxZoom: 1.1, duration: reduce ? 0 : 350 }), 40), [fitView, reduce]);
  useEffect(() => {
    refit();
  }, [stageIdx, mode, refit]);

  // The story plays itself when asked: a new stage every few seconds.
  useEffect(() => {
    if (!storyPlaying) return;
    const t = setTimeout(() => setStage((x) => x + 1), 4500);
    return () => clearTimeout(t);
  }, [storyPlaying, stage]);

  // A request plays hop by hop.
  useEffect(() => {
    if (!requestPlaying) return;
    const t = setTimeout(() => setHop((h) => h + 1), 1400);
    return () => clearTimeout(t);
  }, [requestPlaying, hop]);

  const onNodesChange = useCallback((changes: NodeChange<HldNode>[]) => {
    for (const c of changes) if (c.type === "position" && c.position) setPos((p) => ({ ...p, [c.id]: c.position! }));
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setPlaying(false);
    setPicked(null);
    setHop(0);
  };

  const check = growing && s.trigger.kind === "load" ? checkStage(stage) : null;
  const findings = sim && mode === "fidget" ? diagnose(nodes, sim) : [];

  return (
    <div className="lab lab-sketch" data-mode={mode}>
      <div className="lab-canvas" aria-label="The infrastructure">
        <ReactFlow<HldNode, FlowEdgeT>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, n) => setPicked((p) => (p === n.id ? null : (n.id as ArchNodeId)))}
          onPaneClick={() => setPicked(null)}
          connectionMode={ConnectionMode.Loose}
          nodesConnectable={false}
          deleteKeyCode={null}
          minZoom={0.3}
          maxZoom={1.4}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background gap={22} />
        </ReactFlow>
        {growing && (
          <div className="lab-caption" aria-live="polite">
            <b>{s.audience}</b> · {sim ? `${compact(sim.nodes.users?.qps ?? 0)} requests a second` : ""}
          </div>
        )}
      </div>

      <aside className="lab-panel" aria-label="Lab controls">
        <div className="seg lab-modes" role="tablist" aria-label="What to do">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => switchMode(m.id)} title={m.hint}>
              {m.label}
            </button>
          ))}
        </div>

        {picked && CONCEPTS[picked] ? (
          <ConceptCard id={picked} onClose={() => setPicked(null)} />
        ) : (
          <>
            {mode === "grow" && (
              <GrowPanel
                stage={stage}
                setStage={(n) => {
                  setPlaying(false);
                  setStage(n);
                }}
                playing={storyPlaying}
                setPlaying={setPlaying}
                check={check}
                nodes={baseNodes}
                onPick={setPicked}
              />
            )}
            {mode === "explore" && <ExplorePanel onPick={setPicked} />}
            {mode === "fidget" && (
              <FidgetPanel
                mult={mult}
                setMult={setMult}
                readRatio={readRatio}
                setReadRatio={setReadRatio}
                hit={hit}
                setHit={setHit}
                down={down}
                setDown={setDown}
                lose={lose}
                setLose={setLose}
                nodes={baseNodes}
                sim={sim}
                findings={findings}
              />
            )}
            {mode === "follow" && <FollowPanel scenario={scenario} setScenario={(sc) => { setScenario(sc); setHop(0); setPlaying(false); }} hop={hop} setHop={(h) => { setPlaying(false); setHop(h); }} playing={requestPlaying} setPlaying={setPlaying} />}
          </>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ grow */

function GrowPanel({
  stage, setStage, playing, setPlaying, check, nodes, onPick,
}: {
  stage: number;
  setStage: (n: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  check: ReturnType<typeof checkStage> | null;
  nodes: HldNode[];
  onPick: (id: ArchNodeId) => void;
}) {
  const s = STAGES[stage];
  const worst = check?.before?.worst;
  const label = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  const before = check?.before;
  const oldDesignLabel = before && worst ? `${STAGES[stage - 1].title.split(":")[0]}` : "";
  return (
    <div className="lab-section">
      <div className="lab-stepper">
        <button type="button" className="icon-btn" aria-label="Previous stage" onClick={() => setStage(Math.max(0, stage - 1))} disabled={stage === 0}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <input type="range" min={0} max={STAGES.length - 1} step={1} value={stage} onChange={(e) => setStage(Number(e.target.value))} aria-label={`Stage ${stage + 1} of ${STAGES.length}`} aria-valuetext={s.title} />
        <button type="button" className="icon-btn" aria-label="Next stage" onClick={() => setStage(Math.min(STAGES.length - 1, stage + 1))} disabled={stage === STAGES.length - 1}>
          <ChevronRight size={16} aria-hidden />
        </button>
        <button type="button" className="wbtn" onClick={() => (stage >= STAGES.length - 1 ? setStage(0) : setPlaying(!playing))} aria-pressed={playing}>
          {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />} {playing ? "Pause" : stage >= STAGES.length - 1 ? "Replay" : "Play the story"}
        </button>
      </div>
      <p className="eyebrow">
        Stage {stage + 1} of {STAGES.length} · {s.audience}
      </p>
      <h3 className="lab-title">{s.title}</h3>

      <div className="lab-block" data-kind="problem">
        <h4>What goes wrong</h4>
        <p>{s.trigger.text}</p>
        {before && worst && before.overloaded.length > 0 && (
          <p className="lab-measure">
            <Flame size={14} aria-hidden />
            <span>
              The old design at this load: <b>{label(worst.id)}</b> is at <b>{Math.round(worst.util * 100)}%</b> of capacity.
            </span>
          </p>
        )}
        {oldDesignLabel && before && before.overloaded.length === 0 && null}
      </div>
      <div className="lab-block" data-kind="fix">
        <h4>What you add</h4>
        <p>{s.fix}</p>
        {s.adds.length > 0 && (
          <p className="lab-chips">
            {s.adds.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => onPick(id)}>
                {label(id)}
              </button>
            ))}
          </p>
        )}
      </div>
      <p className="lab-say">
        <span className="eyebrow">Say it</span>
        &ldquo;{s.say}&rdquo;
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ explore */

const LAYERS: { title: string; ids: ArchNodeId[] }[] = [
  { title: "At the edge", ids: ["users", "dns", "cdn", "storage"] },
  { title: "Getting in", ids: ["lb", "gw"] },
  { title: "Doing the work", ids: ["api", "worker", "email"] },
  { title: "Remembering", ids: ["cache", "db", "search", "queue"] },
  { title: "Watching", ids: ["obs"] },
];

function ExplorePanel({ onPick }: { onPick: (id: ArchNodeId) => void }) {
  return (
    <div className="lab-section">
      <h3 className="lab-title">Click any box</h3>
      <p className="muted">On the canvas, or here. Each card says what the component is, when you would not add it, and what to say about it in an interview. You can drag the boxes around, too.</p>
      {LAYERS.map((l) => (
        <div key={l.title} className="lab-layer">
          <p className="rd-group-name">{l.title}</p>
          <p className="lab-chips">
            {l.ids.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => onPick(id)}>
                {CONCEPTS[id]?.name ?? id}
              </button>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ fidget */

function FidgetPanel({
  mult, setMult, readRatio, setReadRatio, hit, setHit, down, setDown, lose, setLose, nodes, sim, findings,
}: {
  mult: number;
  setMult: (n: number) => void;
  readRatio: number;
  setReadRatio: (n: number) => void;
  hit: number;
  setHit: (n: number) => void;
  down: Set<string>;
  setDown: (s: Set<string>) => void;
  lose: Set<string>;
  setLose: (s: Set<string>) => void;
  nodes: HldNode[];
  sim: SimResult | null;
  findings: ReturnType<typeof diagnose>;
}) {
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const breakable = nodes.filter((n) => n.data.kind !== "client");
  const reset = () => {
    setMult(1);
    setReadRatio(0.97);
    setHit(0.85);
    setDown(new Set());
    setLose(new Set());
  };
  const zone = () => setLose(new Set(breakable.map((n) => n.id)));
  const active = down.size + lose.size;
  return (
    <div className="lab-section">
      <h3 className="lab-title">Break it</h3>
      <label className="control">
        <span>
          Traffic: <b>{compact(STAGES[FULL].qps * mult)}</b> requests a second ({mult}×)
        </span>
        <input type="range" min={0.25} max={10} step={0.25} value={mult} onChange={(e) => setMult(Number(e.target.value))} />
      </label>
      <label className="control">
        <span>
          Reads: <b>{Math.round(readRatio * 100)}%</b> of requests
        </span>
        <input type="range" min={0.5} max={0.99} step={0.01} value={readRatio} onChange={(e) => setReadRatio(Number(e.target.value))} />
      </label>
      <label className="control">
        <span>
          Cache hit ratio: <b>{Math.round(hit * 100)}%</b>
        </span>
        <input type="range" min={0.3} max={0.99} step={0.01} value={hit} onChange={(e) => setHit(Number(e.target.value))} />
      </label>
      <div className="lab-actions">
        <button type="button" className="wbtn" onClick={() => setMult(mult >= 5 ? 1 : 5)}>
          <Zap size={13} aria-hidden /> {mult >= 5 ? "End the spike" : "Spike ×5"}
        </button>
        <button type="button" className="wbtn" onClick={zone} title="Lose one instance of every component, as if a zone went dark">
          <Flame size={13} aria-hidden /> Lose a zone
        </button>
        <button type="button" className="wbtn" onClick={reset}>
          <RotateCcw size={13} aria-hidden /> Reset
        </button>
      </div>
      <label className="control">
        <span>Break something{active ? ` (${active} active)` : ""}</span>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            if (v.startsWith("lose:")) setLose(toggle(lose, v.slice(5)));
            else setDown(toggle(down, v));
          }}
        >
          <option value="">Choose…</option>
          {breakable.flatMap((n) => [
            <option key={n.id} value={n.id}>
              {down.has(n.id) ? `Revive ${n.data.label}` : `Kill ${n.data.label}`}
            </option>,
            <option key={`l-${n.id}`} value={`lose:${n.id}`}>
              {lose.has(n.id) ? `Restore the ${n.data.label} instance` : `Lose one ${n.data.label} instance`}
            </option>,
          ])}
        </select>
      </label>
      {sim && (
        <p className="readout" aria-live="polite">
          Entry latency <b>{Number.isFinite(sim.entryLatencyMs) ? `${Math.round(sim.entryLatencyMs)} ms` : "∞"}</b> · failing <b>{compact(sim.errorsPerSec)}/s</b>
        </p>
      )}
      <ul className="lab-findings" aria-live="polite" aria-label="What is happening">
        {findings.map((f) => (
          <li key={`${f.node ?? "all"}-${f.text}`} data-level={f.level}>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ follow a request */

function FollowPanel({
  scenario, setScenario, hop, setHop, playing, setPlaying,
}: {
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  hop: number;
  setHop: (n: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
}) {
  const sofar = scenario.hops.slice(0, hop + 1).filter((h) => !["queue", "worker", "email"].includes(h.node)).reduce((n, h) => n + h.ms, 0);
  const h = scenario.hops[hop];
  const async = ["queue", "worker", "email"].includes(h.node);
  const total = scenario.hops.filter((x) => !["queue", "worker", "email"].includes(x.node)).reduce((n, x) => n + x.ms, 0);
  return (
    <div className="lab-section">
      <h3 className="lab-title">Follow a request</h3>
      <label className="control">
        <span>Which request?</span>
        <select value={scenario.id} onChange={(e) => setScenario(SCENARIOS.find((x) => x.id === e.target.value)!)}>
          {SCENARIOS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">{scenario.summary}</p>
      <div className="lab-stepper">
        <button type="button" className="icon-btn" aria-label="Previous hop" onClick={() => setHop(Math.max(0, hop - 1))} disabled={hop === 0}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="lab-hopcount">
          Hop {hop + 1} of {scenario.hops.length}
        </span>
        <button type="button" className="icon-btn" aria-label="Next hop" onClick={() => setHop(Math.min(scenario.hops.length - 1, hop + 1))} disabled={hop === scenario.hops.length - 1}>
          <ChevronRight size={16} aria-hidden />
        </button>
        <button type="button" className="wbtn" onClick={() => (hop >= scenario.hops.length - 1 ? (setHop(0), setPlaying(true)) : setPlaying(!playing))} aria-pressed={playing}>
          {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />} {playing ? "Pause" : hop >= scenario.hops.length - 1 ? "Replay" : "Play"}
        </button>
      </div>
      <p className="lab-hop" aria-live="polite">
        <b>{CONCEPTS[h.node]?.name ?? h.node}</b>
        {async && <span className="chip chip-quiet">after the answer</span>}
        <span>{h.caption}</span>
      </p>
      <div className="lab-budget" role="img" aria-label={`${sofar} of ${scenario.budgetMs} milliseconds`}>
        <span className="lab-budget-fill" style={{ width: `${Math.min(100, (sofar / scenario.budgetMs) * 100)}%` }} data-over={sofar > scenario.budgetMs || undefined} />
      </div>
      <p className="readout">
        <b>{sofar} ms</b> so far · a typical total is <b>{total} ms</b> against a <b>{scenario.budgetMs} ms</b> target
      </p>
    </div>
  );
}

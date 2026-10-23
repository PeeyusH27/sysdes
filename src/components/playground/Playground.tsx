"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, ConnectionMode, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, getNodesBounds,
  getViewportForBounds, useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useShallow } from "zustand/react/shallow";
import {
  CircleAlert, CircleCheck, CircleX, Download, Eye, FileJson, Info, LayoutGrid, ListTree, Lightbulb, Play, Redo2, Share2, Square,
  Trash2, TriangleAlert, Undo2, Upload,
} from "lucide-react";
import { KIND_META, PALETTE_GROUPS } from "@/components/diagram/kinds";
import type { NodeKind } from "@/components/diagram/types";
import { compact } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { autoLayout } from "./autolayout";
import { assignHandles } from "./graph";
import { getChallenge, referenceDesign, type Challenge } from "./challenges";
import { edgeTypes } from "./edges";
import { grade } from "./grader";
import { lint, type Finding } from "./lint";
import { MissionPanel, type MissionResult } from "./MissionPanel";
import { evaluateStep, getMission, scenarioOptions } from "./missions";
import { nodeTypes } from "./nodes";
import { DesignDoc, migrate } from "./schema";
import { decodeDesign, encodeDesign } from "./share";
import { simulate } from "./simulate";
import { redo, undo, useDesign } from "./store";
import { TEMPLATES } from "./templates";
import type { FlowEdgeT, HldNode } from "./types";

export function Playground({ challengeSlug, guided = false }: { challengeSlug?: string; guided?: boolean }) {
  return (
    <ReactFlowProvider>
      <Editor challenge={challengeSlug ? getChallenge(challengeSlug) : undefined} guided={guided} />
    </ReactFlowProvider>
  );
}

type Tab = "mission" | "lint" | "sim" | "grade" | "outline";

function Editor({ challenge, guided }: { challenge?: Challenge; guided: boolean }) {
  const mission = challenge && guided ? getMission(challenge.slug) : undefined;
  const { nodes, edges, title, onNodesChange, onEdgesChange, onConnect, addNode, setTitle, load } = useDesign(
    useShallow((s) => ({
      nodes: s.nodes, edges: s.edges, title: s.title, onNodesChange: s.onNodesChange, onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect, addNode: s.addNode, setTitle: s.setTitle, load: s.load,
    })),
  );
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const [tab, setTab] = useState<Tab>(mission ? "mission" : challenge ? "grade" : "lint");
  const [running, setRunning] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [down, setDown] = useState<Set<string>>(new Set());
  const [lose, setLose] = useState<Set<string>>(new Set());
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);
  const [highlight, setHighlight] = useState<Finding | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showRef, setShowRef] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Shared links (#d=…) and challenge starts
  useEffect(() => {
    const fromHash = decodeDesign(window.location.hash);
    if (fromHash) {
      load(fromHash);
      history.replaceState(null, "", window.location.pathname);
      setTimeout(() => {
        fitView({ padding: 0.2, maxZoom: 1 });
        notify("Design loaded from the link.");
      }, 50);
    } else if (window.location.hash.startsWith("#d=")) {
      setTimeout(() => notify("That share link is invalid or damaged."), 0);
    } else if (mission) {
      // A guided mission starts from its own naive design; coming back to it keeps the learner's work.
      if (useDesign.getState().title !== mission.start.title) {
        load(mission.start);
        setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
      }
    } else if (challenge && ![challenge.title, `${challenge.title} (guided)`].includes(useDesign.getState().title)) {
      load({ version: 1, title: challenge.title, nodes: [], edges: [] });
    }
  }, [challenge, mission, load, fitView]);

  // Undo / redo shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sim = useMemo(() => (running ? simulate(nodes, edges, { multiplier, down, lose }) : null), [running, nodes, edges, multiplier, down, lose]);
  const findings = useMemo(() => {
    const withSim = sim ? nodes.map((n) => ({ ...n, data: { ...n.data, sim: sim.nodes[n.id] } })) : nodes;
    return lint(withSim, edges);
  }, [nodes, edges, sim]);
  const result = useMemo(() => (challenge ? grade(challenge.rubric, nodes, edges) : null), [challenge, nodes, edges]);
  const saveChallenge = useProgress((s) => s.saveChallenge);
  const missionPassed = useProgress((s) => (mission ? s.mission[mission.slug] ?? 0 : 0));
  const setMission = useProgress((s) => s.setMission);

  const runMission = (index: number) => {
    if (!mission) return;
    const step = mission.steps[index];
    const o = scenarioOptions(step.scenario, nodes);
    setMultiplier(o.multiplier);
    setDown(o.down);
    setLose(o.lose);
    setRunning(true);
    const { failure } = evaluateStep(step, nodes, edges);
    setMissionResult({ step: step.id, failure });
    setHighlight(failure?.nodes?.length ? { id: `mission:${step.id}`, level: "warn", message: failure.message, nodes: failure.nodes } : null);
    if (!failure && index >= missionPassed) setMission(mission.slug, index + 1);
  };
  const showMissionFix = (index: number) => {
    if (!mission) return;
    load(mission.steps[index].solve(useDesign.getState().toDoc()));
    setHighlight(null);
    setMissionResult(null);
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
    notify("Applied the fix. Run the scenario to check it, or undo.");
  };
  const restartMission = () => {
    if (!mission) return;
    if (useDesign.getState().nodes.length && !window.confirm("Restart the mission from its starting design?")) return;
    load(mission.start);
    setMission(mission.slug, 0);
    setMissionResult(null);
    setHighlight(null);
    setRunning(false);
    setDown(new Set());
    setLose(new Set());
    setMultiplier(1);
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
  };
  useEffect(() => {
    if (challenge && result && nodes.length) saveChallenge(challenge.slug, result.percent);
  }, [challenge, result, nodes.length, saveChallenge]);

  const flaggedNodes = new Set(highlight?.nodes ?? []);
  const flaggedEdges = new Set(highlight?.edges ?? []);
  const displayNodes = useMemo<HldNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, sim: sim?.nodes[n.id], flagged: flaggedNodes.has(n.id) || undefined },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, sim, highlight],
  );
  const displayEdges = useMemo<FlowEdgeT[]>(
    () =>
      edges.map((e) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        data: { ...e.data, qps: sim?.edges[e.id], flagged: flaggedEdges.has(e.id) || undefined },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edges, sim, highlight],
  );

  const addAtCenter = useCallback(
    (kind: NodeKind) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const jitter = () => (Math.random() - 0.5) * 80;
      addNode(kind, screenToFlowPosition({ x: r.left + r.width / 2 + jitter(), y: r.top + r.height / 2 + jitter() }));
      notify(`Added ${KIND_META[kind].label}.`);
    },
    [addNode, screenToFlowPosition],
  );

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#d=${encodeDesign(useDesign.getState().toDoc())}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Share link copied to the clipboard.");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(useDesign.getState().toDoc(), null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${title.replace(/\W+/g, "-").toLowerCase() || "design"}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPng = async () => {
    const { toPng } = await import("html-to-image");
    const all = getNodes();
    if (!all.length) return notify("Nothing to export yet.");
    const w = 1600;
    const h = 1000;
    const { x, y, zoom } = getViewportForBounds(getNodesBounds(all), w, h, 0.4, 2, 0.12);
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    const url = await toPng(el, {
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      width: w,
      height: h,
      style: { width: `${w}px`, height: `${h}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
    });
    Object.assign(document.createElement("a"), { href: url, download: "design.png" }).click();
  };

  const importJson = async (file: File) => {
    try {
      const parsed = DesignDoc.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) return notify("That file isn't a valid design (schema check failed).");
      load(migrate(parsed.data));
      setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
      notify("Design imported.");
    } catch {
      notify("Couldn't read that file.");
    }
  };

  const tidy = async () => {
    const laid = await autoLayout(useDesign.getState().nodes, useDesign.getState().edges);
    useDesign.setState({ nodes: laid, edges: assignHandles(laid, useDesign.getState().edges, true) });
    setTimeout(() => fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 30);
  };

  const loadTemplate = (doc: DesignDoc) => {
    if (useDesign.getState().nodes.length && !window.confirm("Replace the current design? (You can undo.)")) return;
    load(doc);
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1 }), 50);
  };

  const selected = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.filter((f) => f.level === "warn").length;

  return (
    <div className="pg">
      <aside className="pg-palette" aria-label="Components">
        {challenge && (
          <div className="card" style={{ padding: 12, marginBottom: 8 }}>
            <Link href="/playground" className="link" style={{ float: "right", fontSize: 12.5 }}>All challenges</Link>
            <span className="eyebrow">Challenge</span>
            <strong style={{ display: "block", marginTop: 2 }}>{challenge.title}</strong>
            <p className="muted" style={{ margin: "4px 0 6px", fontSize: 13 }}>{mission ? mission.intro : challenge.brief}</p>
            {!mission && (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5 }}>
                {challenge.requirements.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              {challenge.numbers.map(([k, v]) => <span key={k} style={{ display: "block" }}><b>{k}:</b> {v}</span>)}
            </p>
          </div>
        )}
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 4px" }}>Drag onto the canvas, or click to add.</p>
        {PALETTE_GROUPS.map((g) => (
          <section key={g.name} aria-label={g.name} style={{ display: "contents" }}>
            <h3>{g.name}</h3>
            {g.kinds.map((kind) => {
              const { label, icon: Icon, color } = KIND_META[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  draggable
                  className="palette-item"
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-hld-kind", kind);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => addAtCenter(kind)}
                >
                  <Icon size={16} aria-hidden style={{ color }} /> {label}
                </button>
              );
            })}
          </section>
        ))}
      </aside>

      <div className="pg-center">
        <div className="pg-toolbar">
          <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Design title" />
          <select
            className="wbtn"
            aria-label="Load a template"
            value=""
            onChange={(e) => {
              const t = TEMPLATES.find((x) => x.id === e.target.value);
              if (t) loadTemplate(t.doc());
            }}
          >
            <option value="">Templates…</option>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button type="button" className="wbtn" onClick={() => undo()} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={15} aria-hidden /></button>
          <button type="button" className="wbtn" onClick={() => redo()} title="Redo (Shift+Ctrl+Z)" aria-label="Redo"><Redo2 size={15} aria-hidden /></button>
          <button type="button" className="wbtn" onClick={tidy} title="Auto-layout"><LayoutGrid size={15} aria-hidden /> Tidy</button>
          <button type="button" className={`wbtn ${running ? "" : "primary"}`} onClick={() => { setRunning((r) => !r); setTab("sim"); }}>
            {running ? <Square size={14} aria-hidden /> : <Play size={14} aria-hidden />} {running ? "Stop" : "Simulate"}
          </button>
          <button type="button" className="wbtn" onClick={share}><Share2 size={15} aria-hidden /> Share</button>
          <button type="button" className="wbtn" onClick={exportPng} title="Export PNG" aria-label="Export PNG"><Download size={15} aria-hidden /></button>
          <button type="button" className="wbtn" onClick={exportJson} title="Export JSON" aria-label="Export JSON"><FileJson size={15} aria-hidden /></button>
          <button type="button" className="wbtn" onClick={() => fileRef.current?.click()} title="Import JSON" aria-label="Import JSON"><Upload size={15} aria-hidden /></button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <button
            type="button"
            className="wbtn danger"
            onClick={() => window.confirm("Clear the canvas? (You can undo.)") && useDesign.getState().clear()}
            aria-label="Clear canvas"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>

        <div className="pg-canvas" ref={canvasRef}>
          {nodes.length === 0 && (
            <div className="empty-hint">
              <div>
                <strong>Start by dragging a Client onto the canvas.</strong>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Connect components by dragging from one node&apos;s edge dot to another. Or pick a template from the toolbar.
                </p>
              </div>
            </div>
          )}
          <ReactFlow<HldNode, FlowEdgeT>
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={(c) => c.source !== c.target}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const kind = e.dataTransfer.getData("application/x-hld-kind") as NodeKind;
              if (kind && KIND_META[kind]) addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
            }}
            snapToGrid
            snapGrid={[16, 16]}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            proOptions={{ hideAttribution: false }}
          >
            <Background gap={16} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
          {toast && (
            <div role="status" className="card" style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", padding: "8px 14px", zIndex: 5, fontSize: 14 }}>
              {toast}
            </div>
          )}
        </div>

        <div className="pg-bottom">
          <div className="pg-tabs" role="tablist" aria-label="Panels">
            {mission && <button role="tab" aria-selected={tab === "mission"} onClick={() => setTab("mission")}>Mission {missionPassed}/{mission.steps.length}</button>}
            <button role="tab" aria-selected={tab === "lint"} onClick={() => setTab("lint")}>
              Review {errors + warns > 0 && <span className="pill bad-ink" style={{ marginLeft: 4 }}>{errors + warns}</span>}
            </button>
            <button role="tab" aria-selected={tab === "sim"} onClick={() => setTab("sim")}>Simulation</button>
            {challenge && <button role="tab" aria-selected={tab === "grade"} onClick={() => setTab("grade")}>Grade {result && `${result.percent}%`}</button>}
            <button role="tab" aria-selected={tab === "outline"} onClick={() => setTab("outline")}><ListTree size={13} aria-hidden /> Outline</button>
          </div>
          <div className="pg-panel" role="tabpanel">
            {tab === "mission" && mission && (
              <MissionPanel mission={mission} passed={missionPassed} result={missionResult} score={result ? result.percent : null} onRun={runMission} onShowMe={showMissionFix} onRestart={restartMission} />
            )}
            {tab === "lint" && <LintPanel findings={findings} highlight={highlight} onHighlight={setHighlight} />}
            {tab === "sim" && (
              <SimPanel
                running={running}
                onToggle={() => setRunning((r) => !r)}
                multiplier={multiplier}
                setMultiplier={setMultiplier}
                down={down}
                setDown={setDown}
                lose={lose}
                setLose={setLose}
                nodes={nodes}
                sim={sim}
              />
            )}
            {tab === "grade" && challenge && result && (
              <GradePanel challenge={challenge} result={result} showRef={showRef} setShowRef={setShowRef} onLoadReference={() => loadTemplate(referenceDesign(challenge))} />
            )}
            {tab === "outline" && <OutlinePanel />}
          </div>
        </div>
      </div>

      <aside className="pg-inspector" aria-label="Inspector">
        <Inspector selected={selected} selectedEdges={selectedEdges} />
        <h3>Summary</h3>
        <p aria-live="polite" style={{ margin: 0 }}>
          {nodes.length} components, {edges.length} connections. {errors} errors, {warns} warnings.
        </p>
        <h3>Tips</h3>
        <ul style={{ paddingLeft: 16, margin: 0, color: "var(--muted)" }}>
          <li>Drag from any dot on a node to another node to connect.</li>
          <li>Arrows point from caller to callee (auto-corrected).</li>
          <li>Delete/Backspace removes the selection. Ctrl+Z undoes.</li>
          <li>Set replicas, hit ratio and QPS here, then press Simulate.</li>
          <li>
            Stuck? Read the <Link className="link" href="/learn">HLD path</Link>.
          </li>
        </ul>
      </aside>
    </div>
  );
}

function LintPanel({ findings, highlight, onHighlight }: { findings: Finding[]; highlight: Finding | null; onHighlight: (f: Finding | null) => void }) {
  if (!findings.length) return <p className="ok-ink" style={{ margin: 0 }}><CircleCheck size={15} aria-hidden /> No issues found. Nice.</p>;
  return (
    <div>
      {findings.map((f) => {
        const Icon = f.level === "error" ? CircleX : f.level === "warn" ? TriangleAlert : Info;
        const active = highlight?.id === f.id;
        return (
          <div key={f.id} className="finding" data-level={f.level}>
            <Icon size={16} aria-hidden />
            <span>
              <span className="sr-only">{f.level}: </span>
              {f.message}
            </span>
            <span className="acts">
              {(f.nodes?.length || f.edges?.length) && (
                <button type="button" className="wbtn" aria-pressed={active} onClick={() => onHighlight(active ? null : f)}>
                  <Eye size={13} aria-hidden /> {active ? "Hide" : "Show"}
                </button>
              )}
              {f.learn && (
                <Link className="wbtn" href={f.learn}>
                  <Lightbulb size={13} aria-hidden /> Why
                </Link>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SimPanel({
  running, onToggle, multiplier, setMultiplier, down, setDown, lose, setLose, nodes, sim,
}: {
  running: boolean;
  onToggle: () => void;
  multiplier: number;
  setMultiplier: (n: number) => void;
  down: Set<string>;
  setDown: (s: Set<string>) => void;
  lose: Set<string>;
  setLose: (s: Set<string>) => void;
  nodes: HldNode[];
  sim: ReturnType<typeof simulate> | null;
}) {
  if (!running)
    return (
      <p style={{ margin: 0 }}>
        Press <button type="button" className="wbtn primary" onClick={onToggle}><Play size={13} aria-hidden /> Simulate</button> to push traffic
        through your design. Set each client&apos;s QPS and read ratio in the inspector. This is a steady-state teaching model: load balancers split
        evenly, caches pass only read misses, queues absorb what consumers can&apos;t handle, and latency grows as nodes approach saturation.
      </p>
    );
  const bottleneck = nodes.find((n) => n.id === sim?.bottleneck);
  const b = bottleneck && sim ? sim.nodes[bottleneck.id] : null;
  return (
    <div>
      <div className="controls" style={{ marginTop: 0 }}>
        <label className="control">
          <span>Traffic: <b>{multiplier}×</b></span>
          <input type="range" min={0.5} max={20} step={0.5} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} />
        </label>
        <button type="button" className="wbtn" onClick={() => setMultiplier(multiplier >= 10 ? 1 : 10)}>{multiplier >= 10 ? "End spike" : "Spike ×10"}</button>
        <label className="control" style={{ maxWidth: 280 }}>
          <span>Break something{down.size + lose.size > 0 ? ` (${down.size + lose.size} active)` : ""}</span>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const toggle = (set: Set<string>, id: string) => {
                const next = new Set(set);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              };
              if (v.startsWith("lose:")) setLose(toggle(lose, v.slice(5)));
              else setDown(toggle(down, v));
            }}
          >
            <option value="">Choose…</option>
            {nodes.filter((n) => n.data.kind !== "client").flatMap((n) => [
              <option key={n.id} value={n.id}>{down.has(n.id) ? `Revive ${n.data.label}` : `Kill ${n.data.label}`}</option>,
              <option key={`lose:${n.id}`} value={`lose:${n.id}`}>{lose.has(n.id) ? `Restore the lost ${n.data.label} instance` : `Lose one ${n.data.label} instance`}</option>,
            ])}
          </select>
        </label>
      </div>
      {sim && (
        <p className="readout" aria-live="polite" style={{ marginTop: 0 }}>
          Estimated client latency: <strong>{Number.isFinite(sim.entryLatencyMs) ? `${Math.round(sim.entryLatencyMs)} ms` : "∞"}</strong>
          {sim.errorsPerSec > 0 && <> · <span className="bad-ink"><CircleX size={13} aria-hidden /> {compact(sim.errorsPerSec)} req/s failing</span></>}
          {bottleneck && b && (
            <>
              {" "}· Bottleneck: <strong>{bottleneck.data.label}</strong> at{" "}
              <span className={b.util >= 1 ? "bad-ink" : b.util >= 0.7 ? "warn-ink" : "ok-ink"}>
                {b.util >= 1 ? <CircleX size={13} aria-hidden /> : b.util >= 0.7 ? <CircleAlert size={13} aria-hidden /> : <CircleCheck size={13} aria-hidden />}{" "}
                {Math.round(b.util * 100)}%
              </span>
              {b.util >= 0.7 && " (add replicas, a cache, or a queue in front)"}
            </>
          )}
          {Object.entries(sim.backlog).filter(([, v]) => v > 0).map(([id, v]) => (
            <span key={id}> · {nodes.find((n) => n.id === id)?.data.label} backlog grows by <strong>{compact(v)}/s</strong></span>
          ))}
        </p>
      )}
    </div>
  );
}

function GradePanel({
  challenge, result, showRef, setShowRef, onLoadReference,
}: {
  challenge: Challenge;
  result: ReturnType<typeof grade>;
  showRef: boolean;
  setShowRef: (v: boolean) => void;
  onLoadReference: () => void;
}) {
  const [hints, setHints] = useState<Set<string>>(new Set());
  return (
    <div>
      <p style={{ margin: "0 0 8px" }}>
        Score: <strong>{result.score} / {result.max}</strong> ({result.percent}%){" "}
        {result.percent === 100 && <span className="pill ok-ink"><CircleCheck size={12} aria-hidden /> Complete</span>}
      </p>
      <ul className="rubric">
        {result.items.map((it) => (
          <li key={it.id}>
            {it.passed ? <CircleCheck size={16} aria-hidden className="ok-ink" /> : <CircleX size={16} aria-hidden className="muted" />}
            <span>
              <span className="sr-only">{it.passed ? "Passed: " : "Not yet: "}</span>
              {it.label} <span className="muted">({it.points} pts)</span>
              {!it.passed &&
                (hints.has(it.id) ? (
                  <span className="muted" style={{ display: "block", fontSize: 13 }}>Hint: {it.hint}</span>
                ) : (
                  <button type="button" className="link" style={{ border: 0, background: "none", cursor: "pointer", marginLeft: 6, fontSize: 13 }} onClick={() => setHints(new Set([...hints, it.id]))}>
                    Hint
                  </button>
                ))}
            </span>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="wbtn" onClick={() => setShowRef(!showRef)}>{showRef ? "Hide" : "Show"} reference answer</button>
        <Link className="wbtn" href={challenge.learn}>Read the lesson</Link>
      </div>
      {showRef && (
        <div style={{ marginTop: 8 }}>
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 13.5 }}>
            One good answer: {challenge.reference.nodes.map((n) => n.label + (n.sub ? ` ${n.sub}` : "")).join(", ")}.
          </p>
          <button type="button" className="wbtn primary" onClick={onLoadReference}>Load the reference design (you can undo)</button>
        </div>
      )}
    </div>
  );
}

function OutlinePanel() {
  const { nodes, edges, removeNode, removeEdge, onConnect } = useDesign(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges, removeNode: s.removeNode, removeEdge: s.removeEdge, onConnect: s.onConnect })),
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const label = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
      <div>
        <strong>Components ({nodes.length})</strong>
        <ul style={{ paddingLeft: 16, margin: "6px 0" }}>
          {nodes.map((n) => (
            <li key={n.id}>
              {n.data.label} <span className="muted">({KIND_META[n.data.kind].label}{(n.data.replicas ?? 1) > 1 ? ` ×${n.data.replicas}` : ""})</span>{" "}
              <button type="button" className="link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => removeNode(n.id)} aria-label={`Remove ${n.data.label}`}>remove</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Connections ({edges.length})</strong>
        <ul style={{ paddingLeft: 16, margin: "6px 0" }}>
          {edges.map((e) => (
            <li key={e.id}>
              {label(e.source)} → {label(e.target)} {e.data?.async && <span className="muted">(async)</span>}{" "}
              <button type="button" className="link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => removeEdge(e.id)} aria-label={`Remove connection ${label(e.source)} to ${label(e.target)}`}>remove</button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) onConnect({ source: from, target: to, sourceHandle: null, targetHandle: null });
          }}
          style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
        >
          <label className="sr-only" htmlFor="ol-from">From</label>
          <select id="ol-from" className="wbtn" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">From…</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="ol-to">To</label>
          <select id="ol-to" className="wbtn" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">To…</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
          </select>
          <button type="submit" className="wbtn primary">Connect</button>
        </form>
      </div>
    </div>
  );
}

function Inspector({ selected, selectedEdges }: { selected: HldNode[]; selectedEdges: FlowEdgeT[] }) {
  const updateNode = useDesign((s) => s.updateNode);
  const updateEdge = useDesign((s) => s.updateEdge);
  const removeNode = useDesign((s) => s.removeNode);
  if (selected.length === 1) {
    const n = selected[0];
    const meta = KIND_META[n.data.kind];
    const hasHit = n.data.kind === "cache" || n.data.kind === "cdn";
    return (
      <div>
        <h3>{meta.label}</h3>
        <label className="field">
          <span>Label</span>
          <input value={n.data.label} maxLength={40} onChange={(e) => updateNode(n.id, { label: e.target.value || meta.label })} />
        </label>
        {n.data.kind === "client" ? (
          <>
            <label className="field">
              <span>Requests per second: {compact(n.data.qps ?? 1000)}</span>
              <input type="range" min={2} max={6} step={0.05} value={Math.log10(n.data.qps ?? 1000)} onChange={(e) => updateNode(n.id, { qps: Math.round(10 ** Number(e.target.value)) })} />
            </label>
            <label className="field">
              <span>Reads: {Math.round((n.data.readRatio ?? 0.9) * 100)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={n.data.readRatio ?? 0.9} onChange={(e) => updateNode(n.id, { readRatio: Number(e.target.value) })} />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>Replicas / instances</span>
              <input type="number" min={1} max={100} value={n.data.replicas ?? 1} onChange={(e) => updateNode(n.id, { replicas: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
            </label>
            {Number.isFinite(meta.perInstanceQps) && (
              <label className="field">
                <span>Capacity per instance (req/s)</span>
                <input type="number" min={1} value={n.data.perInstanceQps ?? meta.perInstanceQps} onChange={(e) => updateNode(n.id, { perInstanceQps: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
            )}
            <label className="field">
              <span>Latency (ms)</span>
              <input type="number" min={0} value={n.data.latencyMs ?? meta.latencyMs} onChange={(e) => updateNode(n.id, { latencyMs: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
            {hasHit && (
              <label className="field">
                <span>Hit ratio: {Math.round((n.data.hitRatio ?? meta.hitRatio ?? 0) * 100)}%</span>
                <input type="range" min={0} max={1} step={0.01} value={n.data.hitRatio ?? meta.hitRatio ?? 0} onChange={(e) => updateNode(n.id, { hitRatio: Number(e.target.value) })} />
              </label>
            )}
            {n.data.kind === "queue" && (
              <label className="field">
                <span>Role</span>
                <select value={n.data.role ?? ""} onChange={(e) => updateNode(n.id, { role: e.target.value === "dlq" ? "dlq" : undefined })}>
                  <option value="">Work queue</option>
                  <option value="dlq">Dead letter queue</option>
                </select>
              </label>
            )}
          </>
        )}
        <p className="muted" style={{ fontSize: 12 }}>Defaults are order-of-magnitude teaching values; measure real systems.</p>
        <button type="button" className="wbtn danger" onClick={() => removeNode(n.id)}><Trash2 size={13} aria-hidden /> Remove</button>
      </div>
    );
  }
  if (selectedEdges.length === 1 && selected.length === 0) {
    const e = selectedEdges[0];
    return (
      <div>
        <h3>Connection</h3>
        <label className="field">
          <span>Protocol</span>
          <select value={e.data?.protocol ?? "HTTP"} onChange={(ev) => updateEdge(e.id, { protocol: ev.target.value })}>
            {["HTTP", "gRPC", "WS", "SQL", "TCP", "Pub/Sub"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Label</span>
          <input value={e.data?.label ?? ""} maxLength={40} placeholder="e.g. on miss" onChange={(ev) => updateEdge(e.id, { label: ev.target.value || undefined })} />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
          <input type="checkbox" checked={!!e.data?.async} onChange={(ev) => updateEdge(e.id, { async: ev.target.checked || undefined })} /> Asynchronous (doesn&apos;t add to request latency)
        </label>
      </div>
    );
  }
  return (
    <div>
      <h3>Inspector</h3>
      <p className="muted" style={{ margin: 0 }}>Select a component or connection to edit it.</p>
    </div>
  );
}

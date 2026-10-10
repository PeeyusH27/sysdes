"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type Announcements, type DragEndEvent } from "@dnd-kit/core";
import { CircleCheck, GripVertical, RotateCcw, TriangleAlert } from "lucide-react";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { KIND_META } from "@/components/diagram/kinds";
import { layoutFlow, NODE, type Orientation } from "@/components/diagram/layout";
import { NODE_KINDS, type FlowSpec, type NodeKind } from "@/components/diagram/types";
import { useMediaQuery } from "@/lib/hooks";
import { WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure helpers */

const SLOT_ID = "diagram-quiz-slot";

/** A kind for the hidden node that gives nothing away: one already in the diagram and not among the choices. */
export function pickNeutralKind(spec: FlowSpec, slot: string, options: NodeKind[]): NodeKind {
  const others = spec.nodes.filter((n) => n.id !== slot).map((n) => n.kind);
  const safe = others.filter((k) => !options.includes(k));
  if (safe.includes("client")) return "client";
  if (safe.length) return safe[0];
  return NODE_KINDS.find((k) => !options.includes(k)) ?? "external";
}

/** The spec as the learner sees it: the slot shows "?" until the right kind is placed; scenarios unlock when solved. */
export function quizSpec(spec: FlowSpec, slot: string, placed: NodeKind | null, answer: NodeKind, neutral: NodeKind): FlowSpec {
  const solved = placed === answer;
  return {
    ...spec,
    scenarios: solved ? spec.scenarios : undefined,
    nodes: spec.nodes.map((n) => {
      if (n.id !== slot || solved) return n;
      if (placed) return { ...n, kind: placed, label: KIND_META[placed].label, sub: undefined, note: undefined };
      return { ...n, kind: neutral, label: "?", sub: undefined, note: "Missing component: drag one here" };
    }),
  };
}

/** The slot's box as fractions of the laid-out SVG (what the drop zone covers). */
export function slotBox(spec: FlowSpec, slot: string, orientation: Orientation) {
  const { pos, width, height } = layoutFlow(spec, orientation);
  const p = pos.get(slot);
  if (!p) return null;
  return { left: (p.x - NODE.w / 2) / width, top: (p.y - NODE.h / 2) / height, width: NODE.w / width, height: NODE.h / height };
}

/** "It receives from X and sends to Y." */
export function hintFor(spec: FlowSpec, slot: string) {
  const label = (id: string) => spec.nodes.find((n) => n.id === id)?.label ?? id;
  const from = spec.edges.filter((e) => e.to === slot).map((e) => label(e.from));
  const to = spec.edges.filter((e) => e.from === slot).map((e) => label(e.to));
  const parts = [from.length ? `gets requests from ${from.join(" and ")}` : "", to.length ? `talks to ${to.join(" and ")}` : ""].filter(Boolean);
  return parts.length ? `Hint: the missing piece ${parts.join(" and ")}.` : "Hint: follow the arrows into and out of the empty box.";
}

/* ------------------------------------------------------------------ view */

const CSS = `
.dq-stage { position: relative; }
.dq-stage .flow { margin: 0.6em 0; }
.dq-slot { position: absolute; z-index: 2; display: grid; place-items: center; border-radius: 10px; border: 2px dashed var(--border-strong); background: var(--card); color: var(--muted); font-weight: 700; text-align: center; line-height: 1.05; transition: border-color .15s, background .15s; }
.dq-slot small { display: block; font-size: 10px; font-weight: 500; }
.dq-slot[data-over] { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card)); color: var(--fg); }
.dq-slot[data-wrong] { background: transparent; border-color: var(--critical); }
.dq-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }
.dq-chip { display: inline-flex; align-items: stretch; border: 1px solid var(--border); border-radius: 10px; background: var(--card-2); overflow: hidden; touch-action: none; }
.dq-chip[data-dragging] { box-shadow: var(--shadow); border-color: var(--accent); position: relative; z-index: 5; }
.dq-handle { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px 6px 6px; border: 0; background: transparent; color: var(--fg); font: 600 13px var(--font-sans); cursor: grab; }
.dq-handle:active { cursor: grabbing; }
.dq-place { border: 0; border-left: 1px solid var(--border); background: var(--card); color: var(--accent); font: 600 12px var(--font-sans); padding: 0 10px; cursor: pointer; }
.dq-place:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 10%, var(--card)); }
.dq-feedback { display: flex; gap: 8px; align-items: baseline; font-size: 14px; margin: 6px 0 0; }
.dq-feedback svg { flex: none; position: relative; top: 2px; }
`;

function DropSlot({ box, wrong }: { box: { left: number; top: number; width: number; height: number }; wrong: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: SLOT_ID });
  return (
    <div
      ref={setNodeRef}
      className="dq-slot"
      data-over={isOver || undefined}
      data-wrong={wrong || undefined}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height, fontSize: Math.max(12, box.height * 0.42) }}
      aria-hidden
    >
      {!wrong && (
        <span>
          ?<small>drop here</small>
        </span>
      )}
    </div>
  );
}

function Chip({ kind, disabled, onPlace }: { kind: NodeKind; disabled: boolean; onPlace: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: kind, disabled });
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <div ref={setNodeRef} className="dq-chip" data-dragging={isDragging || undefined} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}>
      <button type="button" className="dq-handle" {...listeners} {...attributes} aria-label={`Drag ${meta.label}`} disabled={disabled}>
        <GripVertical size={14} aria-hidden className="muted" />
        <Icon size={15} aria-hidden style={{ color: meta.color }} />
        {meta.label}
      </button>
      <button type="button" className="dq-place" onClick={onPlace} disabled={disabled} aria-label={`Place ${meta.label} in the empty box`}>
        Place
      </button>
    </div>
  );
}

export function DiagramQuiz({ spec, slot, options, answer, explain }: { spec: FlowSpec; slot: string; options: NodeKind[]; answer: NodeKind; explain: string }) {
  const dndId = useId();
  const [placed, setPlaced] = useState<NodeKind | null>(null);
  const [tries, setTries] = useState(0);
  const solved = placed === answer;
  const narrow = useMediaQuery("(max-width: 640px)"); // FlowDiagram switches to the vertical layout at the same width
  const orientation: Orientation = narrow ? "vertical" : "horizontal";
  const neutral = useMemo(() => pickNeutralKind(spec, slot, options), [spec, slot, options]);
  const shown = useMemo(() => quizSpec(spec, slot, placed, answer, neutral), [spec, slot, placed, answer, neutral]);
  const frac = useMemo(() => slotBox(spec, slot, orientation), [spec, slot, orientation]);

  // Pixel box of the slot over the rendered SVG; measured so it stays right through resizes and horizontal scrolling.
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => {
    const el = stage.current;
    const svg = el?.querySelector<SVGSVGElement>(".flow-scroll svg");
    const scroller = el?.querySelector<HTMLElement>(".flow-scroll");
    if (!el || !svg || !frac) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      const w = el.getBoundingClientRect();
      setBox({ left: r.left - w.left + frac.left * r.width, top: r.top - w.top + frac.top * r.height, width: frac.width * r.width, height: frac.height * r.height });
    };
    const ro = new ResizeObserver(measure); // fires once right away, then on every size change
    ro.observe(el);
    ro.observe(svg);
    scroller?.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      scroller?.removeEventListener("scroll", measure);
    };
  }, [frac, solved]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const place = (k: NodeKind) => {
    setPlaced(k);
    setTries((t) => t + 1);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over?.id === SLOT_ID) place(active.id as NodeKind);
  };
  const label = (id: string | number) => KIND_META[id as NodeKind]?.label ?? String(id);
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${label(active.id)}. Use the arrow keys to move it onto the empty box, then press space to drop it.`,
    onDragOver: ({ active, over }) => (over ? `${label(active.id)} is over the empty box.` : `${label(active.id)} is not over the empty box.`),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${label(active.id)} into the empty box.` : `Dropped ${label(active.id)} outside the box.`),
    onDragCancel: ({ active }) => `Cancelled. ${label(active.id)} is back in the list.`,
  };

  return (
    <WidgetFrame title="Fill in the missing component" sub="One box in this diagram is empty. Drag the component that belongs there, or press its Place button.">
      <style href="w-diagram-quiz" precedence="widgets">
        {CSS}
      </style>
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: "To pick up a component, press space or enter. Move it with the arrow keys onto the empty box and press space or enter again to drop it. Or use its Place button." },
        }}
      >
        <div className="dq-chips" role="group" aria-label="Components: drag one into the empty box, or press its Place button">
          {options.map((k) => (
            <Chip key={k} kind={k} disabled={solved} onPlace={() => place(k)} />
          ))}
        </div>
        <div ref={stage} className="dq-stage">
          <FlowDiagram spec={shown} />
          {!solved && box && <DropSlot box={box} wrong={placed !== null} />}
        </div>
      </DndContext>
      <div className="readout" role="status" aria-live="polite">
        {solved ? (
          <p className="dq-feedback">
            <CircleCheck size={16} aria-hidden className="ok-ink" />
            <span>
              <strong className="ok-ink">Correct.</strong> {explain}
              {tries > 1 ? ` (${tries} tries)` : ""}
              {spec.scenarios?.length ? " Press Play on the diagram to watch it work." : ""}
            </span>
          </p>
        ) : placed ? (
          <p className="dq-feedback">
            <TriangleAlert size={16} aria-hidden className="warn-ink" />
            <span>
              <strong className="warn-ink">Not quite:</strong> {KIND_META[placed].label} doesn&apos;t fit there. {hintFor(spec, slot)} Try another one.
            </span>
          </p>
        ) : (
          <p className="dq-feedback muted">Pick the component that belongs in the empty box.</p>
        )}
      </div>
      {placed && (
        <button type="button" className="wbtn" onClick={() => setPlaced(null)} style={{ marginTop: 8 }}>
          <RotateCcw size={14} aria-hidden /> Reset
        </button>
      )}
    </WidgetFrame>
  );
}

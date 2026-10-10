export const NODE_KINDS = [
  "client", "dns", "cdn", "lb", "gateway", "service", "worker", "idgen",
  "cache", "database", "storage", "search", "queue", "pubsub", "external",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Grid position: column (left → right) and row (top → bottom). */
  col: number;
  row: number;
  /** Optional second line, e.g. "×3" or "~1 ms". */
  sub?: string;
  /** Shown on hover/focus and in the text description. */
  note?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style?: "sync" | "async" | "replication";
}

export type NodeState = "ok" | "hit" | "miss" | "busy" | "down";

export interface ScenarioStepBase {
  /** "from>to", must match an edge. Replies travel the same edge with reverse: true. */
  edge: `${string}>${string}`;
  reverse?: boolean;
  /** Narrated in the caption / aria-live region. */
  caption: string;
  tone?: "ok" | "miss" | "error";
  /** Dwell time before the next step (default 1100 ms). */
  ms?: number;
  /** Node badges from this step on. */
  mark?: { node: string; state: NodeState | null }[];
}
export interface ScenarioStep extends ScenarioStepBase {
  /** Extra packets travelling at the same time (fan-out). */
  with?: ScenarioStepBase[];
}

export interface Scenario {
  id: string;
  name: string;
  steps: ScenarioStep[];
}

export interface FlowSpec {
  id: string;
  title: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  scenarios?: Scenario[];
}

/* ---------- Sequence diagrams ---------- */
export interface SeqActor { id: string; label: string; kind: NodeKind }
export interface SeqMessage { from: string; to: string; label: string; type?: "call" | "reply" | "async" }
export interface SeqNote { note: string; over: string[] }
export interface SeqAlt { alt: { when: string; items: SeqItem[] }[] }
export type SeqItem = SeqMessage | SeqNote | SeqAlt;
export interface SequenceSpec {
  id: string;
  title: string;
  description: string;
  actors: SeqActor[];
  items: SeqItem[];
}

/* ---------- Class diagrams (UML) ---------- */
export interface ClassSpec {
  id: string;
  title: string;
  description: string;
  classes: {
    id: string;
    name: string;
    col: number;
    row: number;
    stereotype?: "interface" | "abstract";
    fields?: string[];
    methods?: string[];
  }[];
  relations: {
    from: string;
    to: string;
    type: "composition" | "aggregation" | "inheritance" | "implements" | "association" | "dependency";
    label?: string;
  }[];
}

/* ---------- Decision trees ---------- */
export type DecisionNode =
  | { q: string; yes: string; no: string }
  | { result: string; why: string; href?: string };
export interface DecisionSpec {
  id: string;
  title: string;
  start: string;
  nodes: Record<string, DecisionNode>;
}

/* ---------- Timelines ---------- */
export interface TimelineSpec {
  id: string;
  title: string;
  description?: string;
  unit: "min" | "ms" | "s";
  lanes: { id: string; label: string }[];
  spans: { lane: string; start: number; end: number; label: string; tone?: 1 | 2 | 3 }[];
  markers?: { at: number; label: string }[];
}

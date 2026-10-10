"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import { KIND_META } from "@/components/diagram/kinds";
import type { NodeKind } from "@/components/diagram/types";
import { assignHandles } from "./graph";
import { defaultProtocol, kindLookup, orient } from "./rules";
import type { DesignDoc } from "./schema";
import type { FlowEdgeData, FlowEdgeT, HldData, HldNode } from "./types";

export interface DesignState {
  title: string;
  nodes: HldNode[];
  edges: FlowEdgeT[];
  setTitle: (t: string) => void;
  onNodesChange: (c: NodeChange<HldNode>[]) => void;
  onEdgesChange: (c: EdgeChange<FlowEdgeT>[]) => void;
  onConnect: (c: Connection) => void;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<HldData>) => void;
  updateEdge: (id: string, data: Partial<FlowEdgeData>) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  load: (doc: DesignDoc) => void;
  clear: () => void;
  toDoc: () => DesignDoc;
}

let counter = 0;
const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** What history and autosave care about: no selection, dragging, measured sizes or transient sim data. */
const persisted = (s: DesignState) => ({
  title: s.title,
  nodes: s.nodes.map(({ id, type, position, data }) => {
    const { sim, flagged, ...rest } = data;
    void sim;
    void flagged;
    return { id, type, position: { x: Math.round(position.x), y: Math.round(position.y) }, data: rest };
  }),
  edges: s.edges.map(({ id, source, target, sourceHandle, targetHandle, type, data }) => {
    const { qps, flagged, ...rest } = data ?? {};
    void qps;
    void flagged;
    return { id, source, target, sourceHandle, targetHandle, type, data: rest };
  }),
});

function debounceLeading<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (!timer) fn(...args);
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, ms);
  }) as T;
}

export const useDesign = create<DesignState>()(
  persist(
    temporal(
      (set, get) => ({
        title: "Untitled design",
        nodes: [],
        edges: [],
        setTitle: (title) => set({ title }),
        onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
        onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
        onConnect: (c) => {
          const kindOf = kindLookup(get().nodes);
          const conn = orient(c, kindOf);
          if (!conn.source || !conn.target || conn.source === conn.target) return;
          if (get().edges.some((e) => e.source === conn.source && e.target === conn.target)) return;
          const proto = defaultProtocol(kindOf(conn.target));
          set({ edges: addEdge({ ...conn, id: `${conn.source}>${conn.target}`, type: "flow", data: proto }, get().edges) as FlowEdgeT[] });
        },
        addNode: (kind, position) => {
          const id = newId(kind);
          set({ nodes: [...get().nodes, { id, type: "hld", position, data: { kind, label: KIND_META[kind].label } }] });
          return id;
        },
        updateNode: (id, data) => set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)) }),
        updateEdge: (id, data) => set({ edges: get().edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...data } } : e)) }),
        removeNode: (id) => set({ nodes: get().nodes.filter((n) => n.id !== id), edges: get().edges.filter((e) => e.source !== id && e.target !== id) }),
        removeEdge: (id) => set({ edges: get().edges.filter((e) => e.id !== id) }),
        load: (doc) => {
          const nodes = doc.nodes.map((n) => ({ ...n, type: "hld" as const, data: { ...n.data } }));
          const edges = doc.edges.map((e) => ({ ...e, type: "flow" as const, data: { ...(e.data ?? {}) } }));
          set({ title: doc.title, nodes, edges: assignHandles(nodes, edges) });
        },
        clear: () => set({ title: "Untitled design", nodes: [], edges: [] }),
        toDoc: () => {
          const p = persisted(get());
          return {
            version: 1,
            title: p.title,
            nodes: p.nodes.map(({ id, position, data }) => ({ id, position, data: data as DesignDoc["nodes"][number]["data"] })),
            edges: p.edges.map(({ id, source, target, data }) => ({ id, source, target, data })),
          };
        },
      }),
      {
        limit: 100,
        partialize: persisted,
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
        handleSet: (handleSet) => debounceLeading(handleSet, 400),
      },
    ),
    { name: "sds-playground", version: 1, partialize: (s) => persisted(s) },
  ),
);

export const undo = () => useDesign.temporal.getState().undo();
export const redo = () => useDesign.temporal.getState().redo();

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { FlowSpec } from "@/components/diagram/types";
import { DesignDoc, migrate } from "./schema";

export const encodeDesign = (doc: DesignDoc) => compressToEncodedURIComponent(JSON.stringify(doc));

/** lz-string's URI alphabet contains '+', which URLSearchParams would turn into a space: slice manually. */
export function decodeDesign(hash: string): DesignDoc | null {
  if (!hash.startsWith("#d=")) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(3));
    const parsed = DesignDoc.safeParse(JSON.parse(json ?? "null"));
    return parsed.success ? migrate(parsed.data) : null;
  } catch {
    return null;
  }
}

/** Every lesson FlowSpec can open in the playground. */
export function specToDesign(spec: FlowSpec): DesignDoc {
  return {
    version: 1,
    title: spec.title,
    nodes: spec.nodes.map((n) => ({
      id: n.id,
      position: { x: n.col * 230, y: n.row * 130 },
      data: { kind: n.kind, label: n.label.slice(0, 40), ...(n.sub && /^×\d+$/.test(n.sub) ? { replicas: Number(n.sub.slice(1)) } : {}) },
    })),
    edges: spec.edges.map((e) => ({
      id: `${e.from}>${e.to}`,
      source: e.from,
      target: e.to,
      data: { label: e.label?.slice(0, 40), async: e.style === "async" || undefined },
    })),
  };
}

export const playgroundHref = (spec: FlowSpec) => `/playground#d=${encodeDesign(specToDesign(spec))}`;

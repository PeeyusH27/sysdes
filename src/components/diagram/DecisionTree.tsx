"use client";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { DecisionSpec } from "./types";

const NW = 176;
const NH = 52;
const GX = 196;
const GY = 92;
const PAD = 16;

type Placed = { id: string; x: number; y: number; parent?: string; branch?: "yes" | "no" };

/** Tidy-enough tree layout: leaves get consecutive columns, parents sit over their children. */
function layoutTree(spec: DecisionSpec) {
  const placed: Placed[] = [];
  let nextLeaf = 0;
  const walk = (id: string, depth: number, parent?: string, branch?: "yes" | "no"): number => {
    const node = spec.nodes[id];
    let x: number;
    if ("q" in node) {
      const a = walk(node.yes, depth + 1, id, "yes");
      const b = walk(node.no, depth + 1, id, "no");
      x = (a + b) / 2;
    } else {
      x = nextLeaf++;
    }
    placed.push({ id, x, y: depth, parent, branch });
    return x;
  };
  walk(spec.start, 0);
  const cols = nextLeaf;
  const depth = Math.max(...placed.map((p) => p.y)) + 1;
  return {
    placed: placed.map((p) => ({ ...p, x: PAD + p.x * GX + NW / 2, y: PAD + p.y * GY + NH / 2 })),
    width: PAD * 2 + (cols - 1) * GX + NW,
    height: PAD * 2 + (depth - 1) * GY + NH,
  };
}

function wrap(text: string, max = 24) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export function DecisionTree({ spec }: { spec: DecisionSpec }) {
  const uid = useId().replace(/:/g, "");
  const { placed, width, height } = useMemo(() => layoutTree(spec), [spec]);
  const byId = new Map(placed.map((p) => [p.id, p]));
  const [path, setPath] = useState<string[]>([spec.start]);
  const current = path[path.length - 1];
  const node = spec.nodes[current];
  const onPath = new Set(path);
  const started = path.length > 1;

  const answer = (yes: boolean) => {
    if (!("q" in node)) return;
    setPath((p) => [...p, yes ? node.yes : node.no]);
  };

  return (
    <figure className="flow decision" onKeyDown={(e) => {
      if (e.key === "y" || e.key === "Y") answer(true);
      if (e.key === "n" || e.key === "N") answer(false);
    }}>
      <div className="flow-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t`} style={{ width: "100%", maxWidth: width, minWidth: Math.min(width, 640) }}>
          <title id={`${uid}t`}>{spec.title}</title>
          {placed.filter((p) => p.parent).map((p) => {
            const par = byId.get(p.parent!)!;
            const lit = onPath.has(p.id) && onPath.has(p.parent!);
            const my = (par.y + NH / 2 + p.y - NH / 2) / 2;
            return (
              <g key={`e-${p.id}`} className="dt-edge" data-lit={lit || undefined} data-dim={started && !lit ? true : undefined}>
                <path d={`M${par.x},${par.y + NH / 2} C${par.x},${my} ${p.x},${my} ${p.x},${p.y - NH / 2}`} />
                <text x={(par.x + p.x) / 2 + (p.branch === "yes" ? -10 : 10)} y={my - 4} textAnchor="middle" className="edge-label">
                  {p.branch}
                </text>
              </g>
            );
          })}
          {placed.map((p) => {
            const n = spec.nodes[p.id];
            const isQ = "q" in n;
            const lines = wrap(isQ ? n.q : n.result);
            return (
              <g
                key={p.id}
                className="dt-node"
                data-type={isQ ? "q" : "result"}
                data-current={p.id === current || undefined}
                data-dim={started && !onPath.has(p.id) ? true : undefined}
                transform={`translate(${p.x - NW / 2},${p.y - NH / 2})`}
              >
                <rect width={NW} height={NH} rx={isQ ? 10 : NH / 2} />
                {lines.map((l, i) => (
                  <text key={i} x={NW / 2} y={NH / 2 + (i - (lines.length - 1) / 2) * 14 + 4} textAnchor="middle">
                    {l}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption>
        <div className="dt-panel" aria-live="polite">
          {"q" in node ? (
            <>
              <p className="dt-question">{node.q}</p>
              <div className="dt-buttons">
                <button type="button" onClick={() => answer(true)}>
                  <Check size={15} aria-hidden /> Yes <kbd>Y</kbd>
                </button>
                <button type="button" onClick={() => answer(false)}>
                  <X size={15} aria-hidden /> No <kbd>N</kbd>
                </button>
              </div>
            </>
          ) : (
            <div className="dt-result">
              <p>
                <strong>{node.result}</strong>. {node.why}
              </p>
              {node.href && (
                <Link href={node.href} className="link">
                  Learn more →
                </Link>
              )}
            </div>
          )}
          {started && (
            <div className="dt-trail">
              <ol>
                {path.slice(0, -1).map((id, i) => {
                  const n = spec.nodes[id];
                  if (!("q" in n)) return null;
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => setPath(path.slice(0, i + 1))}>
                        {n.q} <span className="muted">→ {path[i + 1] === n.yes ? "yes" : "no"}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button type="button" className="ghost" onClick={() => setPath([spec.start])}>
                <RotateCcw size={14} aria-hidden /> Start over
              </button>
            </div>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

"use client";
import { useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { hash32 } from "@/lib/rng";
import { Slider, WidgetFrame } from "./WidgetFrame";

const MAX = 2 ** 32;
const NODE_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLORS = ["var(--k-client)", "var(--k-service)", "var(--k-database)", "var(--k-gateway)", "var(--k-cache)", "var(--k-queue)", "var(--k-external)", "var(--accent-2)"];

/** Pure ring, exported for tests. */
export function buildRing(nodes: string[], vnodes: number) {
  const ring = nodes.flatMap((n) => Array.from({ length: vnodes }, (_, i) => ({ pos: hash32(`${n}#${i}`), node: n })));
  ring.sort((a, b) => a.pos - b.pos);
  return ring;
}
export function owner(ring: { pos: number; node: string }[], key: string) {
  const h = hash32(key, 0x9747b28c);
  let lo = 0;
  let hi = ring.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ring[mid].pos < h) lo = mid + 1;
    else hi = mid;
  }
  return ring[lo % ring.length].node;
}

// Ring and numbers side by side in the desktop pane; stacked once the widget itself is narrow (a container query,
// not the viewport, because the desktop pane is only ~600 px wide on a wide screen).
const CSS = `
.hr { container: hr / inline-size; }
.hr-controls { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: flex-end; margin: 4px 0 8px; }
.hr-nodes { display: flex; gap: 6px; flex-wrap: wrap; }
.hr-sliders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; flex: 1 1 260px; }
.hr-sliders .control { min-width: 0; }
.hr-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: center; }
.hr-ring { max-width: 340px; margin: 0 auto; }
.hr-bars-title { margin: 10px 0 4px !important; font-size: 13px; font-weight: 650; }
.hr-bars { list-style: none; padding: 0 !important; margin: 0 !important; display: grid; gap: 4px; font-size: 12.5px; }
.hr-bars li { display: grid; grid-template-columns: 56px minmax(0, 1fr) 56px; gap: 8px; align-items: center; margin: 0 !important; }
.hr-bar-label { color: var(--muted); white-space: nowrap; }
.hr-bar-track { position: relative; height: 12px; border-radius: 4px; background: var(--card-2); border: 1px solid var(--border); }
.hr-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: 3px; transition: width .3s; }
.hr-bar-ideal { position: absolute; top: -3px; bottom: -3px; width: 0; border-left: 1.5px dashed var(--fg); opacity: .6; }
.hr-bar-value { font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; white-space: nowrap; }
:root[data-motion=reduce] .hr-bar-fill { transition: none; }
@media (prefers-reduced-motion: reduce) { .hr-bar-fill { transition: none; } }
@container hr (max-width: 519px) {
  .hr-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .hr-ring { max-width: 240px; }
  .hr-bars { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 14px; }
  .hr-bars li { grid-template-columns: 14px minmax(0, 1fr) 26px; gap: 6px; }
  .hr-long { display: none; }
}
`;

export function HashRing() {
  const [count, setCount] = useState(4);
  const [vnodes, setVnodes] = useState(20);
  const [keys, setKeys] = useState(120);
  const [prev, setPrev] = useState<{ count: number; vnodes: number } | null>(null);
  const reduce = useReducedMotion();

  const nodes = NODE_NAMES.slice(0, count);
  const ring = useMemo(() => buildRing(nodes, vnodes), [count, vnodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const keyList = useMemo(() => Array.from({ length: keys }, (_, i) => `user:${i}`), [keys]);
  const owners = useMemo(() => keyList.map((k) => owner(ring, k)), [keyList, ring]);
  const prevOwners = useMemo(() => {
    if (!prev) return null;
    const r = buildRing(NODE_NAMES.slice(0, prev.count), prev.vnodes);
    return keyList.map((k) => owner(r, k));
  }, [prev, keyList]);
  const moved = prevOwners ? owners.filter((o, i) => o !== prevOwners[i]).length : 0;
  const moduloMoved = prev ? keyList.filter((k) => hash32(k, 0x9747b28c) % prev.count !== hash32(k, 0x9747b28c) % count).length : 0;

  const change = (next: Partial<{ count: number; vnodes: number }>) => {
    setPrev({ count, vnodes });
    if (next.count !== undefined) setCount(next.count);
    if (next.vnodes !== undefined) setVnodes(next.vnodes);
  };

  const R = 150;
  const C = 180;
  const angle = (pos: number) => (pos / MAX) * Math.PI * 2 - Math.PI / 2;
  const perNode = nodes.map((n) => owners.filter((o) => o === n).length);
  const most = Math.max(1, ...perNode);
  const ideal = keys / count;

  return (
    <WidgetFrame title="Consistent hashing ring" sub="Add or remove a node: only the keys next to it move. Raise virtual nodes to even out the load.">
      <style href="w-hash-ring" precedence="widgets">
        {CSS}
      </style>
      <div className="hr">
        <div className="hr-controls">
          <div className="hr-nodes">
            <button type="button" className="wbtn" disabled={count <= 2} onClick={() => change({ count: count - 1 })}>
              <Minus size={14} aria-hidden /> Remove node {NODE_NAMES[count - 1]}
            </button>
            <button type="button" className="wbtn primary" disabled={count >= NODE_NAMES.length} onClick={() => change({ count: count + 1 })}>
              <Plus size={14} aria-hidden /> Add node {NODE_NAMES[count]}
            </button>
          </div>
          <div className="hr-sliders">
            <Slider label="Virtual nodes per server" value={vnodes} min={1} max={150} onChange={(v) => change({ vnodes: v })} />
            <Slider label="Keys" value={keys} min={30} max={400} step={10} onChange={setKeys} />
          </div>
        </div>
        <div className="hr-grid">
          <svg viewBox="0 0 360 360" className="sim-svg hr-ring" role="img" aria-label={`Hash ring with ${count} nodes and ${keys} keys`}>
            <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
            {ring.map((p, i) => {
              const a = angle(p.pos);
              const ni = NODE_NAMES.indexOf(p.node);
              return <circle key={i} cx={C + Math.cos(a) * R} cy={C + Math.sin(a) * R} r={vnodes > 60 ? 2 : 3.5} fill={COLORS[ni]} />;
            })}
            {keyList.map((k, i) => {
              const a = angle(hash32(k, 0x9747b28c));
              const ni = NODE_NAMES.indexOf(owners[i]);
              const changed = prevOwners && prevOwners[i] !== owners[i];
              const r = R - 22;
              return (
                <m.circle
                  key={k}
                  cx={C + Math.cos(a) * r}
                  cy={C + Math.sin(a) * r}
                  r={changed ? 4.5 : 2.6}
                  initial={false}
                  animate={{ fill: COLORS[ni] }}
                  transition={{ duration: reduce ? 0 : 0.6 }}
                  stroke={changed ? "var(--fg)" : "none"}
                  strokeWidth={1}
                />
              );
            })}
            <text x={C} y={C - 6} textAnchor="middle" style={{ fontWeight: 700, fontSize: 17 }}>
              {count} nodes
            </text>
            <text x={C} y={C + 16} textAnchor="middle" className="muted-text" style={{ fontSize: 13 }}>
              {vnodes} vnodes each
            </text>
          </svg>
          <div>
            <p className="readout" aria-live="polite" style={{ marginTop: 0 }}>
              {prev ? (
                <>
                  Last change moved <strong>{moved}</strong> of {keys} keys (<strong>{Math.round((moved / keys) * 100)}%</strong>). With{" "}
                  <code>hash % N</code> it would have moved <strong>{Math.round((moduloMoved / keys) * 100)}%</strong>.
                </>
              ) : (
                "Add or remove a node to see how many keys move. Outlined dots are keys that changed owner."
              )}
            </p>
            <p className="hr-bars-title" id="hr-bars-title">
              Keys per node
            </p>
            <ul className="hr-bars" aria-labelledby="hr-bars-title">
              {nodes.map((n, i) => (
                <li key={n}>
                  <span className="hr-bar-label">
                    <span className="hr-long">Node </span>
                    {n}
                  </span>
                  <span className="hr-bar-track" aria-hidden>
                    <span className="hr-bar-fill" style={{ width: `${(perNode[i] / most) * 100}%`, background: COLORS[i] }} />
                    <span className="hr-bar-ideal" style={{ left: `${Math.min(100, (ideal / most) * 100)}%` }} />
                  </span>
                  <span className="hr-bar-value">
                    {perNode[i]}
                    <span className="hr-long"> keys</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              Ideal (dashed): {Math.round(ideal)} keys each. Spread (max ÷ min): {(Math.max(...perNode) / Math.max(1, Math.min(...perNode))).toFixed(2)}×.
            </p>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

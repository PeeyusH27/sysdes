"use client";
import { useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { BookOpen, PenLine, RefreshCw, RotateCcw } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useNarrow } from "@/lib/hooks";
import { useSimGate } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

const NAMES = ["A", "B", "C", "D", "E", "F", "G"];

/** k distinct replica indices out of n, chosen uniformly (partial Fisher–Yates), returned sorted. */
export function pickReplicas(n: number, k: number, rand: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < Math.min(k, n); i++) {
    const j = i + Math.floor(rand() * (n - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, Math.min(k, n)).sort((a, b) => a - b);
}

/** What N, W and R guarantee. */
export function quorumInfo(n: number, w: number, r: number) {
  return { overlap: r + w > n, minOverlap: Math.max(0, r + w - n), writeTolerates: n - w, readTolerates: n - r };
}

const choose = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};

/** Chance that a random R-replica read misses all W replicas holding the newest write: C(N−W, R) / C(N, R). */
export const staleReadProbability = (n: number, w: number, r: number) => choose(n - w, r) / choose(n, r);

export const applyWrite = (versions: number[], set: number[], v: number) => versions.map((x, i) => (set.includes(i) ? Math.max(x, v) : x));
export const newestSeen = (versions: number[], set: number[]) => Math.max(0, ...set.map((i) => versions[i]));

interface QState {
  versions: number[];
  latest: number;
  writeSet: number[] | null; // replicas that acknowledged the latest write
  readSet: number[] | null;
  seen: number | null;
  action: "write" | "read" | "sync" | null;
  seq: number;
}
const fresh = (n: number): QState => ({ versions: Array(n).fill(1), latest: 1, writeSet: null, readSet: null, seen: null, action: null, seq: 0 });

/** Drawing geometry: a wide ellipse for the desktop pane, a near-circle for phones. */
interface Geo {
  w: number;
  h: number;
  c: { x: number; y: number };
  rx: number;
  ry: number;
  font: number;
}
const WIDE: Geo = { w: 600, h: 270, c: { x: 300, y: 137 }, rx: 210, ry: 80, font: 13 };
const NARROW: Geo = { w: 320, h: 300, c: { x: 160, y: 150 }, rx: 108, ry: 100, font: 15 };
const pos = (g: Geo, i: number, n: number) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: g.c.x + Math.cos(a) * g.rx, y: g.c.y + Math.sin(a) * g.ry };
};

const CSS = `
.qp { container: qp / inline-size; }
.qp-sliders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; margin: 4px 0 8px; }
.qp-sliders .control { min-width: 0; }
.qp-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.qp-rule { margin: 0 !important; font-size: 13px; line-height: 1.45; }
.qp .legend { font-size: 12px; gap: 2px 12px; }
.qp .legend li > svg { flex: none; }
@container qp (max-width: 479px) {
  .qp-sliders { gap: 6px 10px; }
  .qp-bar .wbtn { padding: 0 9px; }
  .qp-bar .wbtn > svg { display: none; }
}
`;

function Packet({ from, to, back, delay, color, reduce }: { from: { x: number; y: number }; to: { x: number; y: number }; back?: boolean; delay: number; color: string; reduce: boolean }) {
  if (reduce) return null;
  const xs = back ? [from.x, to.x, from.x] : [from.x, to.x];
  const ys = back ? [from.y, to.y, from.y] : [from.y, to.y];
  return (
    <m.circle
      r={6}
      fill={color}
      stroke="var(--card)"
      strokeWidth={2}
      initial={{ cx: from.x, cy: from.y, opacity: 0 }}
      animate={{ cx: xs, cy: ys, opacity: back ? [1, 1, 0] : [1, 0.2] }}
      transition={{ duration: back ? 1 : 0.55, delay, ease: "easeInOut" }}
    />
  );
}

export function QuorumPlayground() {
  const [n, setN] = useState(3);
  const [w, setW] = useState(2);
  const [r, setR] = useState(2);
  const [s, setS] = useState<QState>(() => fresh(3));
  const rand = useMemo(() => mulberry32(20_24), []);
  const { ref, reduce } = useSimGate<HTMLDivElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(boxRef, 480);
  const g = narrow ? NARROW : WIDE;
  const C = g.c;

  const info = quorumInfo(n, w, r);
  const pStale = staleReadProbability(n, w, r);

  const changeN = (v: number) => {
    setN(v);
    setW((x) => Math.min(x, v));
    setR((x) => Math.min(x, v));
    setS(fresh(v));
  };
  const write = () => {
    const set = pickReplicas(n, w, rand);
    const v = s.latest + 1;
    setS({ versions: applyWrite(s.versions, set, v), latest: v, writeSet: set, readSet: null, seen: null, action: "write", seq: s.seq + 1 });
  };
  const read = () => {
    const set = pickReplicas(n, r, rand);
    setS({ ...s, readSet: set, seen: newestSeen(s.versions, set), action: "read", seq: s.seq + 1 });
  };
  const sync = () => setS({ ...s, versions: s.versions.map(() => s.latest), readSet: null, seen: null, action: "sync", seq: s.seq + 1 });

  const names = (set: number[]) => set.map((i) => NAMES[i]).join(", ");
  const holders = s.versions.map((v, i) => (v === s.latest ? i : -1)).filter((i) => i >= 0);
  const overlap = s.readSet && s.writeSet ? s.readSet.filter((i) => s.writeSet!.includes(i)) : [];
  const stale = s.seen !== null && s.seen < s.latest;

  let result = "Press Write to send a new version to W random replicas, then Read from R random replicas.";
  if (s.action === "write" && s.writeSet) result = `Wrote v${s.latest}: acknowledged by ${w} of ${n} replicas (${names(s.writeSet)}). The others still hold older versions until repair catches them up.`;
  if (s.action === "read" && s.readSet && s.seen !== null)
    result = stale
      ? `Stale read: contacted ${names(s.readSet)}, none of which has v${s.latest}. Newest seen: v${s.seen}.`
      : `Fresh read: contacted ${names(s.readSet)} and returned v${s.seen}, the newest version${overlap.length ? ` (overlap with the write set: ${names(overlap)})` : ""}.`;
  if (s.action === "sync") result = `Anti-entropy repair copied v${s.latest} to every replica, so any read is now fresh.`;

  const bad = !info.overlap;
  const f = g.font;
  return (
    <WidgetFrame title="Quorum playground" sub="Writes wait for W of N replicas; reads ask R and keep the newest version. When R + W > N the two sets always share a replica.">
      <style href="w-quorum" precedence="widgets">
        {CSS}
      </style>
      <div className="qp" ref={boxRef}>
        <div className="qp-sliders">
          <Slider label="Replicas N" value={n} min={3} max={7} onChange={changeN} />
          <Slider label={narrow ? "Write W" : "Write quorum W"} value={w} min={1} max={n} onChange={setW} valueText={`Write quorum W ${w}`} />
          <Slider label={narrow ? "Read R" : "Read quorum R"} value={r} min={1} max={n} onChange={setR} valueText={`Read quorum R ${r}`} />
        </div>
        <div className="qp-bar">
          <button type="button" className="wbtn primary" onClick={write}>
            <PenLine size={14} aria-hidden /> Write v{s.latest + 1}
          </button>
          <button type="button" className="wbtn" onClick={read}>
            <BookOpen size={14} aria-hidden /> Read
          </button>
          <button type="button" className="wbtn" onClick={sync} disabled={holders.length === n} aria-label="Repair all">
            <RefreshCw size={14} aria-hidden /> {narrow ? "Repair" : "Repair all"}
          </button>
          <button type="button" className="wbtn" onClick={() => setS(fresh(n))} aria-label="Reset" title="Reset">
            <RotateCcw size={14} aria-hidden style={{ display: "block" }} />
          </button>
        </div>
        <p className="qp-rule">
          <span className={`pill ${bad ? "warn-ink" : "ok-ink"}`}>{bad ? "⚠ no guarantee" : "✓ guaranteed overlap"}</span> R + W = {r + w} {bad ? "≤" : ">"} N = {n}.{" "}
          {bad ? (
            <>
              A random read is stale with probability <strong>{Math.round(pStale * 100)}%</strong>.
            </>
          ) : (
            <>
              Every read shares at least <strong>{info.minOverlap}</strong> replica{info.minOverlap === 1 ? "" : "s"} with every write.
            </>
          )}{" "}
          <span className="muted">
            Writes survive {info.writeTolerates} down; reads survive {info.readTolerates}.
          </span>
        </p>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`${n} replicas. Versions: ${s.versions.map((v, i) => `${NAMES[i]} v${v}`).join(", ")}`}>
            {Array.from({ length: n }, (_, i) => {
              const p = pos(g, i, n);
              return <line key={i} x1={C.x} y1={C.y} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
            })}
            <rect x={C.x - 44} y={C.y - 20} width={88} height={40} rx={10} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.5} />
            <text x={C.x} y={C.y + 5} textAnchor="middle" style={{ fontWeight: 650, fontSize: f }}>
              Client
            </text>
            {s.versions.map((v, i) => {
              const p = pos(g, i, n);
              const inW = !!s.writeSet?.includes(i) && s.action !== "sync";
              const inR = !!s.readSet?.includes(i);
              const isNew = v === s.latest && s.latest > 1;
              const tag = inW && inR ? "W ∩ R" : inW ? "W" : inR ? "R" : "";
              return (
                <g key={i} aria-label={`Replica ${NAMES[i]}: v${v}${tag ? `, ${tag}` : ""}`}>
                  <circle cx={p.x} cy={p.y} r={29} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={1.5} />
                  <m.circle
                    key={`${s.seq}-${isNew}`}
                    cx={p.x}
                    cy={p.y}
                    r={29}
                    fill="var(--series-1)"
                    initial={{ opacity: inW && !reduce ? 0 : isNew ? 0.2 : 0 }}
                    animate={{ opacity: isNew ? 0.2 : 0 }}
                    transition={{ delay: reduce ? 0 : 0.5, duration: 0.3 }}
                  />
                  {inR && <circle cx={p.x} cy={p.y} r={35} fill="none" stroke="var(--series-3)" strokeWidth={3} strokeDasharray="5 4" />}
                  {inW && <circle cx={p.x} cy={p.y} r={inR ? 30.5 : 32} fill="none" stroke="var(--series-1)" strokeWidth={3} />}
                  <text x={p.x} y={p.y - 3} textAnchor="middle" style={{ fontWeight: 700, fontSize: f }}>
                    {NAMES[i]}
                  </text>
                  <text x={p.x} y={p.y + f + 1} textAnchor="middle" style={{ fontWeight: 700, fontSize: f, fill: isNew ? "var(--fg)" : "var(--muted)" }}>
                    v{v}
                  </text>
                  {tag && (
                    <text x={p.x} y={p.y + (p.y > C.y ? 48 : -40)} textAnchor="middle" style={{ fontWeight: 700, fontSize: f - 1, fill: inR && !inW ? "var(--series-3)" : "var(--fg)" }}>
                      {tag}
                    </text>
                  )}
                </g>
              );
            })}
            <g key={s.seq}>
              {s.action === "write" && s.writeSet?.map((i, k) => <Packet key={i} from={C} to={pos(g, i, n)} delay={k * 0.04} color="var(--series-1)" reduce={reduce} />)}
              {s.action === "read" && s.readSet?.map((i, k) => <Packet key={i} from={C} to={pos(g, i, n)} back delay={k * 0.04} color="var(--series-3)" reduce={reduce} />)}
            </g>
          </svg>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <svg width={14} height={14} aria-hidden>
              <circle cx={7} cy={7} r={5} fill="none" stroke="var(--series-1)" strokeWidth={2.5} />
            </svg>
            W: acknowledged the last write
          </li>
          <li>
            <svg width={14} height={14} aria-hidden>
              <circle cx={7} cy={7} r={5} fill="none" stroke="var(--series-3)" strokeWidth={2.5} strokeDasharray="3 2" />
            </svg>
            R: asked by the last read
          </li>
          <li>
            <svg width={14} height={14} aria-hidden>
              <circle cx={7} cy={7} r={6} fill="var(--series-1)" opacity={0.25} />
            </svg>
            holds the newest version
          </li>
        </ul>
        <p className="readout" aria-live="polite">
          {s.action === "read" && (
            <span className={`pill ${stale ? "bad-ink" : "ok-ink"}`} style={{ marginRight: 6 }}>
              {stale ? "✕ stale" : "✓ fresh"}
            </span>
          )}
          {result}
        </p>
      </div>
    </WidgetFrame>
  );
}

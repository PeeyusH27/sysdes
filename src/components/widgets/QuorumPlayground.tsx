"use client";
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { BookOpen, PenLine, RefreshCw, RotateCcw } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
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

const C = { x: 210, y: 176 };
const RING = 118;
const pos = (i: number, n: number) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: C.x + Math.cos(a) * RING, y: C.y + Math.sin(a) * RING };
};

function Packet({ to, back, delay, color, reduce }: { to: { x: number; y: number }; back?: boolean; delay: number; color: string; reduce: boolean }) {
  if (reduce) return null;
  const xs = back ? [C.x, to.x, C.x] : [C.x, to.x];
  const ys = back ? [C.y, to.y, C.y] : [C.y, to.y];
  return (
    <m.circle
      r={6}
      fill={color}
      stroke="var(--card)"
      strokeWidth={2}
      initial={{ cx: C.x, cy: C.y, opacity: 0 }}
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
  return (
    <WidgetFrame title="Quorum playground" sub="N replicas, writes wait for W acknowledgements, reads ask R replicas and keep the newest version. When R + W > N the two sets must share at least one replica.">
      <div className="controls">
        <Slider label="Replicas N" value={n} min={3} max={7} onChange={changeN} />
        <Slider label="Write quorum W" value={w} min={1} max={n} onChange={setW} />
        <Slider label="Read quorum R" value={r} min={1} max={n} onChange={setR} />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <button type="button" className="wbtn primary" onClick={write}>
          <PenLine size={14} aria-hidden /> Write v{s.latest + 1}
        </button>
        <button type="button" className="wbtn" onClick={read}>
          <BookOpen size={14} aria-hidden /> Read
        </button>
        <button type="button" className="wbtn" onClick={sync} disabled={holders.length === n}>
          <RefreshCw size={14} aria-hidden /> Repair all
        </button>
        <button type="button" className="wbtn" onClick={() => setS(fresh(n))} aria-label="Reset" title="Reset">
          <RotateCcw size={14} aria-hidden />
        </button>
      </div>
      <p className="readout" style={{ marginTop: 0 }}>
        <span className={`pill ${bad ? "warn-ink" : "ok-ink"}`}>
          {bad ? "⚠ no guarantee" : "✓ guaranteed overlap"}
        </span>{" "}
        R + W = {r + w} {bad ? "≤" : ">"} N = {n}.{" "}
        {bad ? (
          <>
            A read can miss the newest write: a random read is stale with probability <strong>{Math.round(pStale * 100)}%</strong>.
          </>
        ) : (
          <>
            Every read shares at least <strong>{info.minOverlap}</strong> replica{info.minOverlap === 1 ? "" : "s"} with every write, so it sees the newest version.
          </>
        )}{" "}
        <span className="muted">
          Writes survive {info.writeTolerates} replica{info.writeTolerates === 1 ? "" : "s"} down; reads survive {info.readTolerates}.
        </span>
      </p>
      <div ref={ref}>
        <svg viewBox="0 0 420 352" className="sim-svg" style={{ maxWidth: 460, margin: "0 auto" }} role="img" aria-label={`${n} replicas. Versions: ${s.versions.map((v, i) => `${NAMES[i]} v${v}`).join(", ")}`}>
          {Array.from({ length: n }, (_, i) => {
            const p = pos(i, n);
            return <line key={i} x1={C.x} y1={C.y} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
          })}
          <rect x={C.x - 44} y={C.y - 20} width={88} height={40} rx={10} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.5} />
          <text x={C.x} y={C.y + 4} textAnchor="middle" style={{ fontWeight: 650 }}>
            Client
          </text>
          {s.versions.map((v, i) => {
            const p = pos(i, n);
            const inW = !!s.writeSet?.includes(i) && s.action !== "sync";
            const inR = !!s.readSet?.includes(i);
            const isNew = v === s.latest && s.latest > 1;
            const tag = inW && inR ? "W ∩ R" : inW ? "W" : inR ? "R" : "";
            return (
              <g key={i} aria-label={`Replica ${NAMES[i]}: v${v}${tag ? `, ${tag}` : ""}`}>
                <circle cx={p.x} cy={p.y} r={30} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={1.5} />
                <m.circle
                  key={`${s.seq}-${isNew}`}
                  cx={p.x}
                  cy={p.y}
                  r={30}
                  fill="var(--series-1)"
                  initial={{ opacity: inW && !reduce ? 0 : isNew ? 0.2 : 0 }}
                  animate={{ opacity: isNew ? 0.2 : 0 }}
                  transition={{ delay: reduce ? 0 : 0.5, duration: 0.3 }}
                />
                {inR && <circle cx={p.x} cy={p.y} r={36} fill="none" stroke="var(--series-3)" strokeWidth={3} strokeDasharray="5 4" />}
                {inW && <circle cx={p.x} cy={p.y} r={inR ? 31.5 : 33} fill="none" stroke="var(--series-1)" strokeWidth={3} />}
                <text x={p.x} y={p.y - 4} textAnchor="middle" style={{ fontWeight: 700, fontSize: 13 }}>
                  {NAMES[i]}
                </text>
                <text x={p.x} y={p.y + 13} textAnchor="middle" style={{ fontWeight: 700, fontSize: 13, fill: isNew ? "var(--fg)" : "var(--muted)" }}>
                  v{v}
                </text>
                {tag && (
                  <text x={p.x} y={p.y + (p.y > C.y ? 52 : -42)} textAnchor="middle" style={{ fontWeight: 700, fontSize: 11.5, fill: inR && !inW ? "var(--series-3)" : "var(--fg)" }}>
                    {tag}
                  </text>
                )}
              </g>
            );
          })}
          <g key={s.seq}>
            {s.action === "write" && s.writeSet?.map((i, k) => <Packet key={i} to={pos(i, n)} delay={k * 0.04} color="var(--series-1)" reduce={reduce} />)}
            {s.action === "read" && s.readSet?.map((i, k) => <Packet key={i} to={pos(i, n)} back delay={k * 0.04} color="var(--series-3)" reduce={reduce} />)}
          </g>
        </svg>
      </div>
      <ul className="legend" aria-label="Legend">
        <li>
          <svg width={16} height={16} aria-hidden>
            <circle cx={8} cy={8} r={6} fill="none" stroke="var(--series-1)" strokeWidth={3} />
          </svg>
          W: acknowledged the last write
        </li>
        <li>
          <svg width={16} height={16} aria-hidden>
            <circle cx={8} cy={8} r={6} fill="none" stroke="var(--series-3)" strokeWidth={3} strokeDasharray="4 3" />
          </svg>
          R: contacted by the last read
        </li>
        <li>
          <svg width={16} height={16} aria-hidden>
            <circle cx={8} cy={8} r={7} fill="var(--series-1)" opacity={0.25} />
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
    </WidgetFrame>
  );
}

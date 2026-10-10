"use client";
import { useId, useState } from "react";
import { m } from "motion/react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { BarChart } from "@/components/charts/BarChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { duration } from "@/lib/format";
import { useSimGate } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

export type BlockKind = "serial" | "pair";
export interface Block {
  id: number;
  name: string;
  kind: BlockKind;
  a: number;
}

export const MINUTES_PER_YEAR = 365 * 24 * 60;
export const MINUTES_PER_MONTH = MINUTES_PER_YEAR / 12;
export const LEVELS = [0.99, 0.999, 0.9995, 0.9999];
export const NINES = [0.99, 0.999, 0.9995, 0.9999, 0.99999];

/** Redundant components: the group is down only when every member is down. */
export const parallel = (as: number[]) => 1 - as.reduce((p, a) => p * (1 - a), 1);
export const blockAvailability = (b: Pick<Block, "kind" | "a">) => (b.kind === "pair" ? parallel([b.a, b.a]) : b.a);
/** Serial dependencies: every one must be up, so availabilities multiply. */
export const composite = (blocks: Pick<Block, "kind" | "a">[]) => blocks.reduce((p, b) => p * blockAvailability(b), 1);
export const downtimeMinutes = (a: number, period: "year" | "month" = "year") => (1 - a) * (period === "year" ? MINUTES_PER_YEAR : MINUTES_PER_MONTH);

/** 0.99840 → "99.84%", 0.999999 → "99.9999%": enough digits to show the nines, no trailing zeros. */
export function formatAvailability(a: number) {
  const nines = 1 - a > 0 ? Math.floor(-Math.log10(1 - a) + 1e-9) : 6;
  const s = (a * 100).toFixed(Math.min(6, Math.max(2, nines))).replace(/\.?0+$/, "");
  return `${s}%`;
}

const NAMES = ["CDN", "Load balancer", "App server", "Database", "Cache", "Auth service", "Payment API", "Queue", "Search"];
const START: Block[] = [
  { id: 1, name: "Load balancer", kind: "serial", a: 0.9999 },
  { id: 2, name: "App server", kind: "pair", a: 0.999 },
  { id: 3, name: "Database", kind: "serial", a: 0.9995 },
  { id: 4, name: "Payment API", kind: "serial", a: 0.999 },
];
const MAX_BLOCKS = 6;
const BW = 100;
const GAP = 22;

const nineChart = NINES.map((a) => ({ label: formatAvailability(a), value: downtimeMinutes(a), display: duration(downtimeMinutes(a)) }));

export function AvailabilityCalc() {
  const uid = useId();
  const [blocks, setBlocks] = useState<Block[]>(START);
  const [nextId, setNextId] = useState(5);
  const { ref, reduce } = useSimGate<HTMLDivElement>();

  const add = (kind: BlockKind) => {
    const used = new Set(blocks.map((b) => b.name));
    const name = NAMES.find((n) => !used.has(n)) ?? `Service ${nextId}`;
    setBlocks([...blocks, { id: nextId, name, kind, a: 0.999 }]);
    setNextId(nextId + 1);
  };
  const update = (id: number, patch: Partial<Block>) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: number) => setBlocks(blocks.filter((b) => b.id !== id));

  const total = composite(blocks);
  const year = downtimeMinutes(total, "year");
  const month = downtimeMinutes(total, "month");
  const weakest = blocks.length ? blocks.reduce((w, b) => (blockAvailability(b) < blockAvailability(w) ? b : w)) : null;
  const formula = blocks.map((b) => (b.kind === "pair" ? `(1 − ${+(1 - b.a).toFixed(5)}²)` : String(b.a))).join(" × ");

  const W = Math.max(360, 70 + blocks.length * (BW + GAP) + 10);
  const cy = 74;

  return (
    <WidgetFrame title="Availability calculator" sub="Build a request path. Serial dependencies multiply (every one must be up); a redundant pair is down only if both copies are: 1 − (1 − a)².">
      <div className="controls">
        <button type="button" className="wbtn primary" onClick={() => add("serial")} disabled={blocks.length >= MAX_BLOCKS}>
          <Plus size={14} aria-hidden /> Add serial dependency
        </button>
        <button type="button" className="wbtn" onClick={() => add("pair")} disabled={blocks.length >= MAX_BLOCKS}>
          <Copy size={14} aria-hidden /> Add redundant pair
        </button>
        <button type="button" className="wbtn" onClick={() => setBlocks(START)}>
          Reset
        </button>
      </div>
      <div ref={ref} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} 150`} className="sim-svg" style={{ minWidth: Math.min(W, 520), maxWidth: W * 1.2 }} role="img" aria-label={`Request path: ${blocks.map((b) => `${b.name} ${b.kind === "pair" ? "(redundant pair) " : ""}${formatAvailability(b.a)}`).join(", then ")}`}>
          <rect x={6} y={cy - 18} width={52} height={36} rx={8} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.5} />
          <text x={32} y={cy + 4} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11 }}>
            User
          </text>
          {blocks.map((b, i) => {
            const x = 70 + i * (BW + GAP);
            const pair = b.kind === "pair";
            const weak = weakest?.id === b.id && blocks.length > 1;
            const stroke = weak ? "var(--warning)" : "var(--k-service)";
            return (
              <m.g key={b.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <line x1={x - GAP + 2} x2={x} y1={cy} y2={cy} stroke="var(--border-strong)" strokeWidth={2} />
                {pair ? (
                  <>
                    <path d={`M${x} ${cy} L${x + 8} ${cy - 22} M${x} ${cy} L${x + 8} ${cy + 22} M${x + BW} ${cy} L${x + BW - 8} ${cy - 22} M${x + BW} ${cy} L${x + BW - 8} ${cy + 22}`} stroke="var(--border-strong)" strokeWidth={1.5} fill="none" />
                    {[-22, 22].map((dy) => (
                      <rect key={dy} x={x + 8} y={cy + dy - 15} width={BW - 16} height={30} rx={7} fill="var(--card-2)" stroke={stroke} strokeWidth={weak ? 2.5 : 1.5} />
                    ))}
                    {[-22, 22].map((dy) => (
                      <text key={dy} x={x + BW / 2} y={cy + dy + 4} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 650 }}>
                        {b.name.length > 13 ? `${b.name.slice(0, 12)}…` : b.name}
                      </text>
                    ))}
                  </>
                ) : (
                  <>
                    <rect x={x} y={cy - 20} width={BW} height={40} rx={8} fill="var(--card-2)" stroke={stroke} strokeWidth={weak ? 2.5 : 1.5} />
                    <text x={x + BW / 2} y={cy + 4} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 650 }}>
                      {b.name.length > 14 ? `${b.name.slice(0, 13)}…` : b.name}
                    </text>
                  </>
                )}
                <text x={x + BW / 2} y={cy + (pair ? 56 : 38)} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  {pair ? `2 × ${formatAvailability(b.a)} → ` : ""}
                  {formatAvailability(blockAvailability(b))}
                </text>
                {weak && (
                  <text x={x + BW / 2} y={cy - (pair ? 44 : 28)} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700, fill: "var(--warning-ink)" }}>
                    ⚠ weakest link
                  </text>
                )}
              </m.g>
            );
          })}
        </svg>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6 }} aria-label="Components on the request path">
        {blocks.map((b, i) => (
          <li key={b.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", margin: 0, fontSize: 14 }}>
            <span className="muted" style={{ minWidth: 18 }}>
              {i + 1}.
            </span>
            <label className="sr-only" htmlFor={`${uid}n${b.id}`}>
              Component {i + 1} name
            </label>
            <select id={`${uid}n${b.id}`} value={b.name} onChange={(e) => update(b.id, { name: e.target.value })} className="wbtn" style={{ fontWeight: 500 }}>
              {[...new Set([b.name, ...NAMES])].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="seg" role="group" aria-label={`${b.name}: single or redundant`}>
              {(["serial", "pair"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={b.kind === k} onClick={() => update(b.id, { kind: k })}>
                  {k === "serial" ? "Single" : "Redundant pair"}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor={`${uid}a${b.id}`}>
              {b.name} availability
            </label>
            <select id={`${uid}a${b.id}`} value={b.a} onChange={(e) => update(b.id, { a: Number(e.target.value) })} className="wbtn" style={{ fontWeight: 500 }}>
              {LEVELS.map((a) => (
                <option key={a} value={a}>
                  {formatAvailability(a)}
                </option>
              ))}
            </select>
            <span className="muted">= {formatAvailability(blockAvailability(b))}</span>
            <button type="button" className="wbtn" onClick={() => remove(b.id)} aria-label={`Remove ${b.name}`} title="Remove" disabled={blocks.length <= 1}>
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 12 }}>
        <StatTiles
          items={[
            { label: "Composite availability", value: formatAvailability(total), sub: `${blocks.length} components in series` },
            { label: "Downtime per year", value: duration(year) },
            { label: "Downtime per month", value: duration(month) },
            { label: "Weakest link", value: weakest ? weakest.name : "–", sub: weakest ? formatAvailability(blockAvailability(weakest)) : undefined },
          ]}
        />
      </div>
      <p className="readout muted" style={{ fontSize: 13.5 }}>
        {formula} = <strong>{formatAvailability(total)}</strong>
      </p>
      <p className="readout" aria-live="polite">
        The whole path is up <strong>{formatAvailability(total)}</strong> of the time: about <strong>{duration(year)}</strong> of downtime a year ({duration(month)} a month).{" "}
        {weakest && blocks.length > 1 && (
          <>
            The weakest link is {weakest.name} at {formatAvailability(blockAvailability(weakest))}
            {weakest.kind === "serial" ? ": making it a redundant pair would help most." : "."}
          </>
        )}
      </p>
      <BarChart title="Downtime per year by availability" data={nineChart} unit="minutes" scale="log" height={230} />
    </WidgetFrame>
  );
}

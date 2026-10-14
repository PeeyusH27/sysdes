"use client";
import { useId, useState } from "react";
import { m } from "motion/react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { BarChart } from "@/components/charts/BarChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { duration } from "@/lib/format";
import { useSimGate } from "./lib/sim-kit";
import { More, WidgetFrame } from "./WidgetFrame";

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

const nineChart = NINES.map((a) => ({ label: formatAvailability(a), value: downtimeMinutes(a), display: duration(downtimeMinutes(a)) }));

const CSS = `
.w-avail { container-type: inline-size; }
.w-avail .controls { margin-bottom: 4px; }
.w-avail .av-path { list-style: none; padding: 0 !important; margin: 4px 0 8px !important; display: flex; flex-wrap: wrap; align-items: center; row-gap: 8px; }
.w-avail .av-path > li { display: flex; align-items: center; margin: 0 !important; }
.w-avail .av-link { width: 16px; height: 2px; background: var(--border-strong); flex: none; }
.w-avail .av-user { border: 1.5px solid var(--k-client); border-radius: 9px; padding: 8px 10px; font-size: 12px; font-weight: 650; background: var(--card-2); }
.w-avail .av-block { display: grid; gap: 2px; justify-items: center; min-width: 92px; padding: 5px 8px; border: 1.5px solid var(--k-service); border-radius: 9px; background: var(--card-2); color: var(--fg); font: inherit; line-height: 1.3; cursor: pointer; }
.w-avail .av-block:hover { border-color: var(--accent); }
.w-avail .av-block[data-weak] { border: 2.5px solid var(--warning); padding: 4px 7px; }
.w-avail .av-block[aria-pressed=true] { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--accent); }
.w-avail .av-name { font-size: 12px; font-weight: 650; white-space: nowrap; }
.w-avail .av-pair { display: grid; gap: 3px; }
.w-avail .av-copy { display: block; border: 1px solid var(--k-service); border-radius: 6px; padding: 0 6px; font-size: 11px; font-weight: 650; background: var(--card); white-space: nowrap; }
.w-avail .av-a { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.w-avail .av-weak { font-size: 10.5px; font-weight: 700; color: var(--warning-ink); white-space: nowrap; }
.w-avail .av-edit { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 13.5px; margin: 0 0 8px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 10px; background: var(--card-2); }
.w-avail .av-edit select { font-weight: 500; }
.w-avail .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.w-avail .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-avail .stat-label, .w-avail .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-avail .stat-value { font-size: 17px; line-height: 1.3; }
.w-avail .chart { margin: 4px 0 0; padding: 10px 12px 6px; }
@container (max-width: 520px) { .w-avail .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export function AvailabilityCalc() {
  const uid = useId();
  const [blocks, setBlocks] = useState<Block[]>(START);
  const [nextId, setNextId] = useState(5);
  const [sel, setSel] = useState(START[0].id);
  const { ref, reduce } = useSimGate<HTMLDivElement>();

  const add = (kind: BlockKind) => {
    const used = new Set(blocks.map((b) => b.name));
    const name = NAMES.find((n) => !used.has(n)) ?? `Service ${nextId}`;
    setBlocks([...blocks, { id: nextId, name, kind, a: 0.999 }]);
    setSel(nextId);
    setNextId(nextId + 1);
  };
  const update = (id: number, patch: Partial<Block>) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: number) => {
    const i = blocks.findIndex((b) => b.id === id);
    const rest = blocks.filter((b) => b.id !== id);
    setBlocks(rest);
    if (rest.length) setSel(rest[Math.min(i, rest.length - 1)].id);
  };
  const resetAll = () => {
    setBlocks(START);
    setSel(START[0].id);
  };

  const total = composite(blocks);
  const year = downtimeMinutes(total, "year");
  const month = downtimeMinutes(total, "month");
  const weakest = blocks.length ? blocks.reduce((w, b) => (blockAvailability(b) < blockAvailability(w) ? b : w)) : null;
  const formula = blocks.map((b) => (b.kind === "pair" ? `(1 − ${+(1 - b.a).toFixed(5)}²)` : String(b.a))).join(" × ");
  const selIndex = Math.max(0, blocks.findIndex((b) => b.id === sel));
  const cur = blocks[selIndex];
  const short = (name: string, max: number) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

  return (
    <WidgetFrame title="Availability calculator" sub="Pick a box to edit it. Serial dependencies multiply; a redundant pair is down only if both copies are: 1 − (1 − a)².">
      <style href="w-availability-calc" precedence="widgets">
        {CSS}
      </style>
      <div className="w-avail">
        <div className="controls">
          <button type="button" className="wbtn primary" onClick={() => add("serial")} disabled={blocks.length >= MAX_BLOCKS}>
            <Plus size={14} aria-hidden /> Add serial dependency
          </button>
          <button type="button" className="wbtn" onClick={() => add("pair")} disabled={blocks.length >= MAX_BLOCKS}>
            <Copy size={14} aria-hidden /> Add redundant pair
          </button>
          <button type="button" className="wbtn" onClick={resetAll}>
            Reset
          </button>
        </div>

        <div ref={ref}>
          <ol className="av-path" aria-label="Request path, in order. Pick a component to edit it.">
            <li>
              <span className="av-user">User</span>
            </li>
            {blocks.map((b, i) => {
              const pair = b.kind === "pair";
              const weak = weakest?.id === b.id && blocks.length > 1;
              return (
                <m.li key={b.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <span className="av-link" aria-hidden />
                  <button
                    type="button"
                    className="av-block"
                    data-weak={weak || undefined}
                    aria-pressed={b.id === cur?.id}
                    aria-label={`${i + 1}. ${b.name}, ${pair ? "redundant pair" : "single"}, ${formatAvailability(blockAvailability(b))}${weak ? ", weakest link" : ""}`}
                    onClick={() => setSel(b.id)}
                  >
                    {weak && <span className="av-weak">⚠ weakest link</span>}
                    {pair ? (
                      <span className="av-pair">
                        <span className="av-copy">{short(b.name, 13)}</span>
                        <span className="av-copy">{short(b.name, 13)}</span>
                      </span>
                    ) : (
                      <span className="av-name">{short(b.name, 14)}</span>
                    )}
                    <span className="av-a">
                      {pair ? `2 × ${formatAvailability(b.a)} → ` : ""}
                      {formatAvailability(blockAvailability(b))}
                    </span>
                  </button>
                </m.li>
              );
            })}
          </ol>
        </div>

        {cur && (
          <div className="av-edit" role="group" aria-label={`Edit component ${selIndex + 1}: ${cur.name}`}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Edit {selIndex + 1}.
            </span>
            <label className="sr-only" htmlFor={`${uid}n`}>
              Component {selIndex + 1} name
            </label>
            <select id={`${uid}n`} value={cur.name} onChange={(e) => update(cur.id, { name: e.target.value })} className="wbtn">
              {[...new Set([cur.name, ...NAMES])].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="seg" role="group" aria-label={`${cur.name}: single or redundant`}>
              {(["serial", "pair"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={cur.kind === k} onClick={() => update(cur.id, { kind: k })}>
                  {k === "serial" ? "Single" : "Redundant pair"}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor={`${uid}a`}>
              {cur.name} availability
            </label>
            <select id={`${uid}a`} value={cur.a} onChange={(e) => update(cur.id, { a: Number(e.target.value) })} className="wbtn">
              {LEVELS.map((a) => (
                <option key={a} value={a}>
                  {formatAvailability(a)}
                </option>
              ))}
            </select>
            <span className="muted">= {formatAvailability(blockAvailability(cur))}</span>
            <button type="button" className="wbtn" style={{ marginLeft: "auto" }} onClick={() => remove(cur.id)} aria-label={`Remove ${cur.name}`} title="Remove" disabled={blocks.length <= 1}>
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        )}

        <StatTiles
          items={[
            { label: "Composite", value: formatAvailability(total), sub: `${blocks.length} in series` },
            { label: "Downtime / year", value: duration(year) },
            { label: "Downtime / month", value: duration(month) },
            { label: "Weakest link", value: weakest ? weakest.name : "–", sub: weakest ? formatAvailability(blockAvailability(weakest)) : undefined },
          ]}
        />
        <p className="readout muted" style={{ fontSize: 13, overflowWrap: "anywhere" }}>
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
        <More label="Chart: yearly downtime by nines">
          <BarChart title="Downtime per year by availability" data={nineChart} unit="minutes" scale="log" height={200} />
        </More>
      </div>
    </WidgetFrame>
  );
}

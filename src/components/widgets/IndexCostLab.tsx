"use client";
import { useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { compact } from "@/lib/format";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model (a teaching model, not a benchmark) */

export const PAGE_BYTES = 8192;
export const FANOUT = 300; // keys per index page after fill factor
export const MEMTABLE_BYTES = 64 * 2 ** 20;
export const BLOOM_FALSE_POSITIVE = 0.01;

/** Index pages from the root to a leaf: the smallest h with FANOUT^h >= rows. */
export function btreeHeight(rows: number, fanout = FANOUT) {
  let h = 1;
  let capacity = fanout;
  while (capacity < rows) {
    capacity *= fanout;
    h += 1;
  }
  return h;
}

/** Disk levels in a leveled LSM-tree: the smallest L with memtable x ratio^L >= data. */
export function lsmLevels(dataBytes: number, ratio: number) {
  let l = 1;
  let capacity = MEMTABLE_BYTES * ratio;
  while (capacity < dataBytes) {
    capacity *= ratio;
    l += 1;
  }
  return l;
}

/** Runs read for one point lookup of a key that exists at the bottom: one per level, unless Bloom filters skip them. */
export const lsmPointReads = (levels: number, bloom: boolean) => (bloom ? 1 + (levels - 1) * BLOOM_FALSE_POSITIVE : levels);

/** Bytes written to disk per byte inserted. B-tree: the whole page is rewritten for a small row, plus the log. */
export const btreeWriteAmp = (rowBytes: number) => PAGE_BYTES / rowBytes + 1;
/** LSM (leveled): each level rewrites data about ratio / 2 times on average, plus the log and the flush. */
export const lsmWriteAmp = (levels: number, ratio: number) => (ratio / 2) * levels + 2;

export function model(rows: number, rowBytes: number, ratio: number) {
  const height = btreeHeight(rows);
  const levels = lsmLevels(rows * rowBytes, ratio);
  return {
    height,
    levels,
    readBtree: height,
    readLsmBloom: lsmPointReads(levels, true),
    readLsmNoBloom: lsmPointReads(levels, false),
    writeBtree: btreeWriteAmp(rowBytes),
    writeLsm: lsmWriteAmp(levels, ratio),
  };
}

/* ------------------------------------------------------------------ view */

const CSS = `
.ic { container: ic / inline-size; }
.ic-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; align-items: end; margin: 4px 0 6px; }
.ic-controls .control { min-width: 0; }
.ic .stat-tiles { margin: 4px 0; }
.ic .chart { margin: 4px 0 0; padding: 0; border: 0; background: transparent; }
.ic .chart-title { font-size: 13.5px; margin-bottom: 2px; }
@container ic (max-width: 519px) { .ic-controls { grid-template-columns: minmax(0, 1fr); } }
`;

const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en") : n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ""));

export function IndexCostLab() {
  const [exp, setExp] = useState(9);
  const [rowBytes, setRowBytes] = useState(100);
  const [ratio, setRatio] = useState(10);
  const [view, setView] = useState<"reads" | "writes">("reads");
  const rows = 10 ** exp;
  const m = model(rows, rowBytes, ratio);
  const reading =
    view === "reads"
      ? `One lookup in ${compact(rows)} rows: the B-tree reads ${m.readBtree} pages (the top levels are normally cached). The LSM-tree checks ${fmt(m.readLsmNoBloom)} runs, one per level, or about ${fmt(m.readLsmBloom)} when Bloom filters skip the levels that cannot hold the key.`
      : `Each inserted byte is written about ${fmt(m.writeBtree)} times by the B-tree (a ${PAGE_BYTES / 1024} KiB page per ${rowBytes}-byte row, in random places) and about ${fmt(m.writeLsm)} times by the LSM-tree (compaction, but in large sequential writes).`;
  return (
    <WidgetFrame title="Index cost lab: B-tree against LSM-tree" sub="A teaching model with round numbers, not a benchmark. Move the sliders to see which costs grow and which stay flat.">
      <style href="w-index-cost-lab" precedence="widgets">
        {CSS}
      </style>
      <div className="ic">
        <div className="ic-controls">
          <Slider label="Rows" value={exp} min={5} max={10} step={0.5} onChange={setExp} format={(v) => compact(10 ** v)} />
          <Slider label="Row size" value={rowBytes} min={50} max={1000} step={50} onChange={setRowBytes} format={(v) => `${v} B`} />
          <Slider label="LSM size ratio" value={ratio} min={4} max={20} onChange={setRatio} />
        </div>
        <div className="ic-controls">
          <Seg label="Show" value={view} onChange={setView} options={[{ value: "reads", label: "Point reads" }, { value: "writes", label: "Write cost" }]} />
        </div>
        <StatTiles
          items={[
            { label: "B-tree height", value: `${m.height} pages`, sub: `fanout about ${FANOUT}` },
            { label: "LSM disk levels", value: String(m.levels), sub: `64 MiB memtable, ratio ${ratio}` },
          ]}
        />
        {view === "reads" ? (
          <BarChart
            title="Pages or runs read for one point lookup"
            unit=""
            height={200}
            data={[
              { label: "B-tree", value: m.readBtree, display: fmt(m.readBtree) },
              { label: "LSM, no filters", value: m.readLsmNoBloom, display: fmt(m.readLsmNoBloom) },
              { label: "LSM, Bloom", value: m.readLsmBloom, display: fmt(m.readLsmBloom) },
            ]}
          />
        ) : (
          <BarChart
            title="Bytes written per byte inserted"
            unit="x"
            height={200}
            data={[
              { label: "B-tree", value: m.writeBtree, display: `${fmt(m.writeBtree)}x` },
              { label: "LSM-tree", value: m.writeLsm, display: `${fmt(m.writeLsm)}x` },
            ]}
          />
        )}
        <p className="readout" aria-live="polite">
          {reading}
        </p>
      </div>
    </WidgetFrame>
  );
}

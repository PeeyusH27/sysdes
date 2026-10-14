"use client";
import { useDeferredValue, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { Slider, WidgetFrame } from "./WidgetFrame";

const X = Array.from({ length: 101 }, (_, i) => i / 100);

/** Average latency = h·c + (1−h)·(c+d): a miss pays for the cache check and the database. */
export const avgLatency = (h: number, cache: number, db: number) => h * cache + (1 - h) * (cache + db);

// The chart sits flat inside the widget card (no second card); on a phone the sliders stack.
const CSS = `
.lhr { container: lhr / inline-size; }
.lhr-sliders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; margin: 4px 0 8px; }
.lhr-sliders .control { min-width: 0; }
.lhr-stats { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0 !important; font-size: 13.5px; }
.lhr-stats > div { display: flex; gap: 6px; align-items: baseline; }
.lhr-stats dt { color: var(--muted); }
.lhr-stats dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; }
.lhr .chart { margin: 8px 0 0; padding: 0; border: 0; background: transparent; }
.lhr .chart-title { font-size: 13.5px; margin-bottom: 2px; }
@container lhr (max-width: 479px) {
  .lhr-sliders { grid-template-columns: minmax(0, 1fr); }
}
`;

export function LatencyHitRatio() {
  const [hit, setHit] = useState(0.9);
  const [cache, setCache] = useState(1);
  const [db, setDb] = useState(50);
  const c = useDeferredValue(cache);
  const d = useDeferredValue(db);
  const values = X.map((h) => avgLatency(h, c, d));
  const now = avgLatency(hit, cache, db);
  return (
    <WidgetFrame title="Hit ratio vs average latency" sub="Drag the hit ratio. Notice how little 0% → 50% buys compared with 90% → 99%.">
      <style href="w-latency-hit-ratio" precedence="widgets">
        {CSS}
      </style>
      <div className="lhr">
        <div className="lhr-sliders">
          <Slider label="Hit ratio" value={hit} min={0} max={1} step={0.01} onChange={setHit} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Cache latency" value={cache} min={0.2} max={5} step={0.1} onChange={setCache} format={(v) => `${v} ms`} />
          <Slider label="Database latency" value={db} min={5} max={200} step={1} onChange={setDb} format={(v) => `${v} ms`} />
        </div>
        <dl className="lhr-stats">
          <div>
            <dt>Average latency</dt>
            <dd>
              {now.toFixed(1)} ms <span className="muted" style={{ fontWeight: 400 }}>({Math.round(hit * 100)}% hits)</span>
            </dd>
          </div>
          <div>
            <dt>Database load</dt>
            <dd>
              {Math.round((1 - hit) * 100)}% <span className="muted" style={{ fontWeight: 400 }}>of reads</span>
            </dd>
          </div>
          <div>
            <dt>Speed-up vs no cache</dt>
            <dd>{((cache + db) / now).toFixed(1)}×</dd>
          </div>
        </dl>
        <LineChart
          title="Average read latency by cache hit ratio"
          x={X}
          series={[{ id: "avg", name: "Average latency", values }]}
          xLabel="Hit ratio"
          yUnit="ms"
          xFormat="percent"
          marker={hit}
          height={220}
          area
        />
      </div>
    </WidgetFrame>
  );
}

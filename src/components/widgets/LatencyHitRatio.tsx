"use client";
import { useDeferredValue, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { Slider, WidgetFrame } from "./WidgetFrame";

const X = Array.from({ length: 101 }, (_, i) => i / 100);

/** Average latency = h·c + (1−h)·(c+d): a miss pays for the cache check and the database. */
export const avgLatency = (h: number, cache: number, db: number) => h * cache + (1 - h) * (cache + db);

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
      <div className="controls">
        <Slider label="Hit ratio" value={hit} min={0} max={1} step={0.01} onChange={setHit} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Cache latency" value={cache} min={0.2} max={5} step={0.1} onChange={setCache} format={(v) => `${v} ms`} />
        <Slider label="Database latency" value={db} min={5} max={200} step={1} onChange={setDb} format={(v) => `${v} ms`} />
      </div>
      <StatTiles
        items={[
          { label: "Average latency", value: `${now.toFixed(1)} ms`, sub: `${Math.round(hit * 100)}% hits` },
          { label: "Database load", value: `${Math.round((1 - hit) * 100)}%`, sub: "of reads reach the DB" },
          { label: "Speed-up vs no cache", value: `${((cache + db) / now).toFixed(1)}×` },
        ]}
      />
      <LineChart title="Average read latency by cache hit ratio" x={X} series={[{ id: "avg", name: "Average latency", values }]} xLabel="Hit ratio" yUnit="ms" xFormat="percent" marker={hit} area />
    </WidgetFrame>
  );
}

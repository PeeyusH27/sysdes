"use client";
import { useDeferredValue, useState } from "react";
import { StatTiles } from "@/components/charts/ChartBits";
import { bytes, compact, int } from "@/lib/format";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

export interface CapacityInputs {
  dau: number;
  actionsPerUser: number;
  readWriteRatio: number;
  bytesPerWrite: number;
  years: number;
  replicas: number;
  peakFactor: number;
  perServerQps: number;
  readBytes: number;
}

export const PRESETS: Record<string, { label: string; inputs: CapacityInputs }> = {
  default: { label: "Generic app", inputs: { dau: 10e6, actionsPerUser: 10, readWriteRatio: 10, bytesPerWrite: 1_000, years: 5, replicas: 3, peakFactor: 3, perServerQps: 1_000, readBytes: 2_000 } },
  twitter: { label: "Twitter-lite", inputs: { dau: 200e6, actionsPerUser: 20, readWriteRatio: 50, bytesPerWrite: 1_000, years: 5, replicas: 3, peakFactor: 3, perServerQps: 2_000, readBytes: 5_000 } },
  instagram: { label: "Instagram-lite", inputs: { dau: 100e6, actionsPerUser: 12, readWriteRatio: 50, bytesPerWrite: 500_000, years: 5, replicas: 3, peakFactor: 3, perServerQps: 2_000, readBytes: 500_000 } },
  "url-shortener": { label: "URL shortener", inputs: { dau: 20e6, actionsPerUser: 17, readWriteRatio: 100, bytesPerWrite: 500, years: 5, replicas: 3, peakFactor: 3, perServerQps: 5_000, readBytes: 500 } },
  chat: { label: "Chat", inputs: { dau: 50e6, actionsPerUser: 80, readWriteRatio: 1, bytesPerWrite: 200, years: 1, replicas: 3, peakFactor: 3, perServerQps: 5_000, readBytes: 200 } },
  "news-feed": { label: "News feed", inputs: { dau: 300e6, actionsPerUser: 11, readWriteRatio: 60, bytesPerWrite: 1_000, years: 5, replicas: 3, peakFactor: 3, perServerQps: 2_000, readBytes: 20_000 } },
};

const SECONDS_PER_DAY = 86_400;

/** Pure estimate (also exported for tests). */
export function estimate(i: CapacityInputs) {
  const qps = (i.dau * i.actionsPerUser) / SECONDS_PER_DAY;
  const writeQps = qps / (i.readWriteRatio + 1);
  const readQps = qps - writeQps;
  const storage = writeQps * SECONDS_PER_DAY * 365 * i.years * i.bytesPerWrite * i.replicas;
  const peak = qps * i.peakFactor;
  return {
    avgQps: qps,
    peakQps: peak,
    readQps,
    writeQps,
    storageBytes: storage,
    perDayBytes: writeQps * SECONDS_PER_DAY * i.bytesPerWrite,
    egressBytesPerSec: readQps * i.readBytes,
    servers: Math.ceil(peak / (i.perServerQps * 0.6)),
    cacheBytes: readQps * SECONDS_PER_DAY * 0.2 * Math.min(i.readBytes, 10_000),
  };
}

const LOG_DAU = [1e5, 1e6, 1e7, 1e8, 1e9];

/** Results as a compact grid: three across in the desktop pane, two across on a phone. */
const CSS = `
.cap-results { container-type: inline-size; margin-top: 8px; }
.cap-results .stat-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cap-results .stat-tile { padding: 6px 10px; border-radius: 10px; min-width: 0; }
.cap-results .stat-label { font-size: 12px; line-height: 1.3; }
.cap-results .stat-value { font-size: 18px; line-height: 1.3; }
.cap-results .stat-sub { font-size: 11.5px; line-height: 1.3; }
@container (max-width: 440px) { .cap-results .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cap-preset select { width: 100%; }
`;

export function CapacityCalculator({ preset = "default", compact: isCompact = false }: { preset?: string; compact?: boolean }) {
  const [inputs, setInputs] = useState<CapacityInputs>((PRESETS[preset] ?? PRESETS.default).inputs);
  const [presetId, setPresetId] = useState(PRESETS[preset] ? preset : "default");
  const deferred = useDeferredValue(inputs);
  const e = estimate(deferred);
  const set = (k: keyof CapacityInputs) => (v: number) => setInputs((s) => ({ ...s, [k]: v }));
  const dauExp = Math.log10(inputs.dau);

  return (
    <WidgetFrame title="Capacity calculator" sub="Move any slider: these are the numbers to say out loud.">
      <style href="w-capacity-calculator" precedence="widgets">
        {CSS}
      </style>
      <div className="controls">
        {!isCompact && (
          <label className="control cap-preset">
            <span>Preset</span>
            <select
              value={presetId}
              onChange={(ev) => {
                setPresetId(ev.target.value);
                setInputs(PRESETS[ev.target.value].inputs);
              }}
            >
              {Object.entries(PRESETS).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <Slider label="Daily active users" value={dauExp} min={5} max={9} step={0.05} onChange={(v) => set("dau")(Math.round(10 ** v))} format={() => compact(inputs.dau)} valueText={`${compact(inputs.dau)} daily users`} />
        <Slider label="Actions per user" value={inputs.actionsPerUser} min={1} max={100} onChange={set("actionsPerUser")} format={(v) => `${v}/day`} valueText={`${inputs.actionsPerUser} actions per user per day`} />
        <Slider label="Reads per write" value={inputs.readWriteRatio} min={0} max={200} onChange={set("readWriteRatio")} format={(v) => `${v}:1`} />
      </div>
      {!isCompact && (
        <More label="More assumptions">
          <div className="controls">
            <Slider label="Bytes per write" value={Math.log10(inputs.bytesPerWrite)} min={2} max={6.7} step={0.05} onChange={(v) => set("bytesPerWrite")(Math.round(10 ** v))} format={() => bytes(inputs.bytesPerWrite)} />
            <Slider label="Years retained" value={inputs.years} min={1} max={10} onChange={set("years")} />
            <Slider label="Replicas" value={inputs.replicas} min={1} max={5} onChange={set("replicas")} />
            <Slider label="Peak ÷ average" value={inputs.peakFactor} min={1} max={10} step={0.5} onChange={set("peakFactor")} format={(v) => `${v}×`} />
            <Slider label="Requests/s one server handles" value={inputs.perServerQps} min={100} max={10_000} step={100} onChange={set("perServerQps")} format={int} />
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Ballparks at 10 actions each: {LOG_DAU.map((d) => `${compact(d)} DAU ≈ ${compact((d * 10) / SECONDS_PER_DAY)} QPS`).join(" · ")}.
          </p>
        </More>
      )}
      <div className="cap-results">
        <StatTiles
          items={[
            { label: "Average QPS", value: int(e.avgQps), sub: `${int(e.readQps)} reads · ${int(e.writeQps)} writes` },
            { label: "Peak QPS", value: int(e.peakQps), sub: `${inputs.peakFactor}× average` },
            { label: "Storage", value: bytes(e.storageBytes), sub: `${bytes(e.perDayBytes)}/day × ${inputs.years}y × ${inputs.replicas} replicas` },
            { label: "Read egress", value: `${bytes(e.egressBytesPerSec)}/s`, sub: `≈ ${compact((e.egressBytesPerSec * 8) / 1e9)} Gbps` },
            { label: "App servers", value: int(e.servers), sub: `at 60% of ${int(inputs.perServerQps)} req/s each` },
            { label: "Cache (hot 20%)", value: bytes(e.cacheBytes), sub: "upper bound for a day's reads" },
          ]}
        />
      </div>
      <p className="readout muted">
        Formula: QPS = {compact(inputs.dau)} × {inputs.actionsPerUser} ÷ 86,400 = <strong>{int(e.avgQps)}</strong>
        {isCompact ? `. Ballparks: ${LOG_DAU.map((d) => `${compact(d)} DAU ≈ ${compact((d * 10) / SECONDS_PER_DAY)} QPS`).join(" · ")} (at 10 actions each).` : "."}
      </p>
    </WidgetFrame>
  );
}

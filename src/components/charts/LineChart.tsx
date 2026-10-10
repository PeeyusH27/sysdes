"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { compact } from "@/lib/format";
import { ChartTable, ChartTooltip } from "./ChartBits";
import { nearestIndex, niceTicks } from "./scales";

export interface LineSeries {
  id: string;
  name: string;
  values: number[];
}

type XFormat = "percent" | "number" | "raw";
const fmtX = (v: number, f: XFormat) => (f === "percent" ? `${Math.round(v * 100)}%` : f === "number" ? compact(v) : String(v));
const fmtY = (v: number, unit: string) => `${v >= 100 ? Math.round(v).toLocaleString("en") : +v.toFixed(2)}${unit ? ` ${unit}` : ""}`;

/**
 * Up to 3 series on one y-axis (never two scales). Crosshair snaps to the nearest x and lists every series.
 * Endpoints are labelled; everything else lives in the tooltip and the table.
 */
export function LineChart({
  title,
  x,
  series,
  xLabel,
  yUnit,
  xFormat = "raw",
  marker,
  height = 260,
  area = false,
  yMax,
}: {
  title: string;
  x: number[];
  series: LineSeries[];
  xLabel: string;
  yUnit: string;
  xFormat?: XFormat;
  /** x value to highlight with a vertical hairline (e.g. a slider position). */
  marker?: number;
  height?: number;
  area?: boolean;
  yMax?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const W = 560;
  const M = { t: 22, r: series.length > 1 ? 96 : 24, b: 40, l: 54 };
  const plotW = W - M.l - M.r;
  const plotH = height - M.t - M.b;
  const ticks = niceTicks(yMax ?? Math.max(...series.flatMap((s) => s.values), 1));
  const top = ticks.at(-1)!;
  const x0 = x[0];
  const x1 = x[x.length - 1];
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0 || 1)) * plotW;
  const sy = (v: number) => M.t + plotH * (1 - Math.min(v, top) / top);
  const [hot, setHot] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const drawn = useRef(false);

  useEffect(() => {
    if (!inView || reduce || drawn.current || !svgRef.current) return;
    drawn.current = true;
    svgRef.current.querySelectorAll<SVGPathElement>(".line").forEach((p) => {
      const len = p.getTotalLength();
      p.animate([{ strokeDasharray: `${len}`, strokeDashoffset: `${len}` }, { strokeDasharray: `${len}`, strokeDashoffset: "0" }], {
        duration: 900,
        easing: "ease-out",
      });
    });
  }, [inView, reduce]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    setHot(nearestIndex(x.map(sx), pt.x));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHot((h) => Math.min((h ?? -1) + 1, x.length - 1));
    if (e.key === "ArrowLeft") setHot((h) => Math.max((h ?? 1) - 1, 0));
  };
  const color = (i: number) => `var(--series-${i + 1})`;
  const xTicks = x.length <= 8 ? x : [0, 0.25, 0.5, 0.75, 1].map((f) => x[Math.round(f * (x.length - 1))]);

  return (
    <figure className="chart">
      <figcaption id={`${uid}t`} className="chart-title">
        {title}
      </figcaption>
      {series.length > 1 && (
        <ul className="legend chart-legend" aria-label="Series">
          {series.map((s, i) => (
            <li key={s.id}>
              <span className="line-key" style={{ background: color(i) }} aria-hidden />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div className="chart-frame">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${uid}t`} tabIndex={0} onKeyDown={onKey} onBlur={() => setHot(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={M.l + plotW} y1={sy(t)} y2={sy(t)} className="grid" />
              <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className="tick">
                {compact(t)}
              </text>
            </g>
          ))}
          <text x={8} y={14} className="tick">
            {yUnit}
          </text>
          {xTicks.map((v) => (
            <text key={v} x={sx(v)} y={M.t + plotH + 18} textAnchor="middle" className="tick">
              {fmtX(v, xFormat)}
            </text>
          ))}
          <text x={M.l + plotW / 2} y={height - 4} textAnchor="middle" className="tick">
            {xLabel}
          </text>
          <line x1={M.l} x2={M.l + plotW} y1={M.t + plotH} y2={M.t + plotH} className="axis" />
          {marker !== undefined && <line x1={sx(marker)} x2={sx(marker)} y1={M.t} y2={M.t + plotH} className="marker-line" />}
          {series.map((s, i) => {
            const pts = s.values.map((v, k) => `${sx(x[k])},${sy(v)}`);
            return (
              <g key={s.id}>
                {area && series.length === 1 && (
                  <path d={`M${sx(x[0])},${M.t + plotH} L${pts.join(" L")} L${sx(x1)},${M.t + plotH} Z`} className="area" style={{ fill: color(i) }} />
                )}
                <path d={`M${pts.join(" L")}`} className="line" style={{ stroke: color(i) }} />
                <circle cx={sx(x1)} cy={sy(s.values.at(-1)!)} r={4.5} className="dot" style={{ fill: color(i) }} />
                {series.length > 1 && (
                  <text x={sx(x1) + 9} y={sy(s.values.at(-1)!) + 4} className="end-label">
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
          {hot !== null && (
            <g className="crosshair">
              <line x1={sx(x[hot])} x2={sx(x[hot])} y1={M.t} y2={M.t + plotH} />
              {series.map((s, i) => (
                <circle key={s.id} cx={sx(x[hot])} cy={sy(s.values[hot])} r={4.5} className="dot" style={{ fill: color(i) }} />
              ))}
            </g>
          )}
          <rect x={M.l} y={M.t} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHot(null)} />
        </svg>
        {hot !== null && (
          <ChartTooltip
            at={sx(x[hot]) / W}
            title={`${xLabel}: ${fmtX(x[hot], xFormat)}`}
            rows={series.map((s, i) => ({ value: fmtY(s.values[hot], yUnit), label: s.name, color: color(i) }))}
          />
        )}
      </div>
      <ChartTable
        caption={title}
        head={[xLabel, ...series.map((s) => `${s.name} (${yUnit})`)]}
        rows={x.map((v, k) => [fmtX(v, xFormat), ...series.map((s) => +s.values[k].toFixed(2))])}
      />
    </figure>
  );
}

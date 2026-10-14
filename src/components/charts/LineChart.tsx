"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { compact } from "@/lib/format";
import { useBoxWidth } from "@/components/diagram/useBoxWidth";
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

/** End-label text: at most two lines of about `max` characters, split at spaces. */
export function wrapLabel(name: string, max = 13): string[] {
  if (name.length <= max) return [name];
  const words = name.split(" ");
  let a = "";
  let i = 0;
  while (i < words.length && (a ? a.length + 1 + words[i].length : words[i].length) <= max) a = a ? `${a} ${words[i++]}` : words[i++];
  if (!a) return [name];
  return [a, words.slice(i).join(" ")].filter(Boolean);
}

const LABEL_LINE = 13;

/**
 * Vertical positions for end labels so none overlap: each wants to sit at its line's last point (`want`, the centre
 * of its block) and takes `lines` × LABEL_LINE of height. Labels keep their order, are pushed apart just enough, and
 * stay between `lo` and `hi`.
 */
export function spreadLabels(items: { want: number; lines: number }[], lo: number, hi: number, gap = 3): number[] {
  const order = items.map((it, i) => ({ ...it, i })).sort((a, b) => a.want - b.want || a.i - b.i);
  const h = (k: number) => order[k].lines * LABEL_LINE;
  const top = order.map((it) => it.want - (it.lines * LABEL_LINE) / 2);
  for (let k = 0; k < order.length; k++) top[k] = Math.max(top[k], k ? top[k - 1] + h(k - 1) + gap : lo);
  for (let k = order.length - 1; k >= 0; k--) top[k] = Math.min(top[k], k < order.length - 1 ? top[k + 1] - h(k) - gap : hi - h(k));
  for (let k = 0; k < order.length; k++) top[k] = Math.max(top[k], k ? top[k - 1] + h(k - 1) + gap : lo);
  const out: number[] = [];
  order.forEach((it, k) => (out[it.i] = top[k] + h(k) / 2));
  return out;
}

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
  // Laid out at the width it really gets (so text keeps its size on a phone); 560 on the server and until measured.
  const frame = useRef<HTMLDivElement>(null);
  const boxW = useBoxWidth(frame);
  const W = boxW ? Math.max(260, boxW) : 560;
  const narrow = W < 440;
  // Multi-series charts label each line at its right end (the legend names them too, so narrow charts skip that):
  // leave room for the longest (wrapped) name.
  const endLabels = series.length > 1 && !narrow;
  const labels = series.map((s) => wrapLabel(s.name));
  const longest = Math.max(0, ...labels.flat().map((l) => l.length));
  const M = { t: 22, r: endLabels ? Math.min(130, Math.max(60, Math.round(longest * 6.4 + 18))) : narrow ? 14 : 24, b: 40, l: narrow ? 44 : 54 };
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
  const endY = series.map((s) => sy(s.values.at(-1)!));
  const labelY = spreadLabels(
    series.map((_, i) => ({ want: endY[i], lines: labels[i].length })),
    M.t - 10,
    M.t + plotH + 12,
  );
  const xTicks = x.length <= (narrow ? 5 : 8) ? x : [0, 0.25, 0.5, 0.75, 1].map((f) => x[Math.round(f * (x.length - 1))]);

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
      <div className="chart-frame" ref={frame}>
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
                {endLabels && (
                  <>
                    {Math.abs(labelY[i] - endY[i]) > 6 && <path d={`M${sx(x1) + 5},${endY[i]} L${sx(x1) + 9},${labelY[i]}`} className="end-leader" style={{ stroke: color(i) }} />}
                    <text x={sx(x1) + 11} y={labelY[i] - ((labels[i].length - 1) * LABEL_LINE) / 2 + 4} className="end-label">
                      {labels[i].map((l, k) => (
                        <tspan key={k} x={sx(x1) + 11} dy={k ? LABEL_LINE : 0}>
                          {l}
                        </tspan>
                      ))}
                    </text>
                  </>
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

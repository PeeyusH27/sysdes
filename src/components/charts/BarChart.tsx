"use client";
import { useEffect, useId, useState, type RefObject } from "react";
import { stagger, useAnimate, useInView, useReducedMotion } from "motion/react";
import { compact } from "@/lib/format";
import { useBoxWidth } from "@/components/diagram/useBoxWidth";
import { ChartTable, ChartTooltip } from "./ChartBits";
import { logTicks, niceTicks } from "./scales";

type Datum = { label: string; value: number; display?: string };

/** A category label on one line, or two (split at the space nearest the middle) when the bar's band is too narrow. */
function labelLines(label: string, band: number): string[] {
  if (label.length * 6.6 <= band - 4 || !label.includes(" ")) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) if (label[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [label.slice(0, best), label.slice(best + 1)];
}

/** 4px rounded data end, square at the baseline. */
const barPath = (x: number, base: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2);
  return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + w - r} Q${x + w},${base - h} ${x + w},${base - h + r} V${base} Z`;
};

export function BarChart({
  title,
  data,
  unit,
  scale = "linear",
  height = 250,
}: {
  title: string;
  data: Datum[];
  unit: string;
  scale?: "linear" | "log";
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [hot, setHot] = useState<number | null>(null);

  useEffect(() => {
    if (inView && !reduce) animate(".bar", { scaleY: [0, 1] }, { duration: 0.6, delay: stagger(0.08), ease: "easeOut" });
  }, [inView, reduce, animate]);

  // Laid out at the width it really gets (so text keeps its size on a phone); 560 on the server and until measured.
  const boxW = useBoxWidth(scope as RefObject<HTMLElement | null>);
  const W = boxW ? Math.max(240, boxW) : 560;
  const narrow = W < 440;
  const M = { t: 28, r: 12, b: narrow ? 46 : 38, l: narrow ? 44 : 54 };
  const plotH = height - M.t - M.b;
  const band = (W - M.l - M.r) / data.length;
  const barW = Math.min(24, band * 0.5);
  const ticks = scale === "log" ? logTicks(data.map((d) => d.value)) : niceTicks(Math.max(...data.map((d) => d.value)));
  const top = ticks.at(-1)!;
  const base = M.t + plotH;
  const y = (v: number) => M.t + plotH * (1 - (scale === "log" ? Math.log10(Math.max(v, 1)) / Math.log10(top) : v / top));
  const fmt = (d: Datum) => d.display ?? `${d.value.toLocaleString("en")} ${unit}`;

  return (
    <figure className="chart">
      <figcaption id={`${uid}t`} className="chart-title">
        {title}
        {scale === "log" && <span className="chart-note"> (log scale)</span>}
      </figcaption>
      <div className="chart-frame" ref={scope}>
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${uid}t`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="tick">
                {compact(t)}
              </text>
            </g>
          ))}
          <text x={8} y={14} className="tick">
            {unit}
          </text>
          {data.map((d, i) => {
            const cx = M.l + band * (i + 0.5);
            return (
              <g
                key={d.label}
                tabIndex={0}
                aria-label={`${d.label}: ${fmt(d)}`}
                onPointerEnter={() => setHot(i)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(i)}
                onBlur={() => setHot(null)}
                className="bar-group"
              >
                <rect x={cx - band / 2} y={M.t} width={band} height={plotH} fill="transparent" />
                <path
                  className="bar"
                  data-hot={hot === i || undefined}
                  d={barPath(cx - barW / 2, base, barW, base - y(d.value))}
                  style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                />
                <text x={cx} y={y(d.value) - 8} textAnchor="middle" className="value">
                  {d.display ?? compact(d.value)}
                </text>
                <text x={cx} y={base + 18} textAnchor="middle" className="tick">
                  {labelLines(d.label, band).map((l, k) => (
                    <tspan key={k} x={cx} dy={k ? 13 : 0}>
                      {l}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          <line x1={M.l} x2={W - M.r} y1={base} y2={base} className="axis" />
        </svg>
        {hot !== null && <ChartTooltip at={(M.l + band * (hot + 0.5)) / W} rows={[{ value: fmt(data[hot]), label: data[hot].label }]} />}
      </div>
      <ChartTable caption={title} head={["", unit]} rows={data.map((d) => [d.label, fmt(d)])} />
    </figure>
  );
}

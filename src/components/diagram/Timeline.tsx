"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { TimelineSpec } from "./types";

const LABEL_W = 132;
const LANE_H = 38;
const W = 720;

/** Lanes of spans on a shared time axis, with a playhead you can play or scrub. */
export function Timeline({ spec, seconds = 6 }: { spec: TimelineSpec; seconds?: number }) {
  const uid = useId().replace(/:/g, "");
  const end = Math.max(...spec.spans.map((s) => s.end), ...(spec.markers ?? []).map((m) => m.at));
  const [t, setT] = useState(end); // SSR / no-JS: everything visible
  const [playing, setPlaying] = useState(false);
  const reduce = useReducedMotion();
  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { once: true, amount: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (inView && !reduce && !started.current) {
      started.current = true;
      setT(0);
      setPlaying(true);
    }
  }, [inView, reduce]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + (dt / seconds) * end;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, seconds, end]);

  const x = (v: number) => LABEL_W + (v / end) * (W - LABEL_W - 16);
  const height = 34 + spec.lanes.length * LANE_H + 26;
  const ticks = Array.from({ length: 6 }, (_, i) => (end / 5) * i);

  return (
    <figure ref={box} className="flow timeline">
      {/* Focusable so keyboard users can scroll it sideways when it is wider than the column. */}
      <div className="flow-scroll" tabIndex={0} role="group" aria-labelledby={`${uid}t`}>
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${uid}t`} style={{ width: "100%", maxWidth: W, minWidth: 520 }}>
          <title id={`${uid}t`}>{spec.title}</title>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={22} y2={height - 22} className="grid" />
              <text x={x(v)} y={height - 6} textAnchor="middle" className="tick">
                {Number.isInteger(v) ? v : v.toFixed(1)} {spec.unit}
              </text>
            </g>
          ))}
          {spec.lanes.map((lane, i) => {
            const y = 30 + i * LANE_H;
            return (
              <g key={lane.id}>
                <text x={LABEL_W - 10} y={y + LANE_H / 2} textAnchor="end" className="lane-label">
                  {lane.label}
                </text>
                {spec.spans
                  .filter((s) => s.lane === lane.id)
                  .map((s, k) => {
                    const visibleEnd = Math.min(s.end, t);
                    if (visibleEnd <= s.start) return null;
                    const w = x(visibleEnd) - x(s.start);
                    return (
                      <g key={k} className="span" data-tone={s.tone ?? 1}>
                        <rect x={x(s.start)} y={y + 6} width={Math.max(2, w - 2)} height={LANE_H - 14} rx={5} />
                        {w > s.label.length * 6.4 + 10 && (
                          <text x={x(s.start) + 7} y={y + LANE_H / 2 + 3} className="span-label">
                            {s.label}
                          </text>
                        )}
                        <title>{`${s.label}: ${s.start}–${s.end} ${spec.unit}`}</title>
                      </g>
                    );
                  })}
              </g>
            );
          })}
          {(spec.markers ?? []).filter((mk) => mk.at <= t).map((mk) => (
            <g key={mk.label} className="tl-marker">
              <line x1={x(mk.at)} x2={x(mk.at)} y1={20} y2={height - 22} />
              <text x={x(mk.at) + 4} y={16}>{mk.label}</text>
            </g>
          ))}
          <line x1={x(t)} x2={x(t)} y1={20} y2={height - 22} className="playhead" />
        </svg>
      </div>
      <figcaption>
        <div className="step-controls">
          <div className="step-buttons">
            <button type="button" onClick={() => { setT(0); setPlaying(true); }} aria-label="Restart">
              <RotateCcw size={15} aria-hidden />
            </button>
            <button type="button" className="play" onClick={() => { if (t >= end) setT(0); setPlaying((p) => !p); }}>
              {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />} {playing ? "Pause" : "Play"}
            </button>
            <label className="scrub">
              <span className="sr-only">Time</span>
              <input type="range" min={0} max={end} step={end / 200} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-valuetext={`${t.toFixed(1)} ${spec.unit}`} />
            </label>
          </div>
        </div>
        {spec.description && <p className="flow-caption">{spec.description}</p>}
        <details className="text-desc">
          <summary>Text description</summary>
          <ul>
            {spec.lanes.map((l) => (
              <li key={l.id}>
                <strong>{l.label}:</strong>{" "}
                {spec.spans.filter((s) => s.lane === l.id).map((s) => `${s.label} (${s.start}–${s.end} ${spec.unit})`).join(", ")}
              </li>
            ))}
          </ul>
        </details>
      </figcaption>
    </figure>
  );
}

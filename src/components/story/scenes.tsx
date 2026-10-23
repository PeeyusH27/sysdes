"use client";
import { useState } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { Doodle } from "@/components/doodle/Doodle";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { ClassDiagram } from "@/components/diagram/ClassDiagram";
import { AlgoPlayer } from "@/components/algo/AlgoPlayer";
import type { Scene, Tone } from "@content/stories";

/**
 * The picture half of a story step. Every scene animates in with CSS (src/app/story.css), staggered with `--i`, and the
 * player re-mounts it with a new key per step so it replays. Nothing here needs JavaScript to be readable.
 */
const TONE_ICON = { good: Check, bad: X, warn: TriangleAlert, info: Check } as const;

function ToneIcon({ tone }: { tone: Tone }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className="st-ico" data-tone={tone} aria-hidden>
      <Icon size={14} strokeWidth={3} />
    </span>
  );
}

const fmt = (n: number) => {
  const r = +n.toPrecision(3); // round first, so 999,600 reads "1M" and not "1000K"
  return r >= 1e9 ? `${+(r / 1e9).toPrecision(3)}B` : r >= 1e6 ? `${+(r / 1e6).toPrecision(3)}M` : r >= 1e3 ? `${+(r / 1e3).toPrecision(3)}K` : `${r}`;
};

function Meter({ scene }: { scene: Extract<Scene, { kind: "meter" }> }) {
  const { min, max, log, stops } = scene;
  const toPos = (v: number) => (log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min));
  const fromPos = (p: number) => (log ? Math.exp(Math.log(min) + p * (Math.log(max) - Math.log(min))) : min + p * (max - min));
  const [pos, setPos] = useState(toPos(scene.start));
  const value = fromPos(pos);
  const stop = stops.find((s) => value <= s.upTo) ?? stops[stops.length - 1];
  return (
    <div className="st-meter">
      <p className="st-meter-label">{scene.label}</p>
      <p className="st-meter-value">
        {fmt(value)} <span>{scene.unit}</span>
      </p>
      <input type="range" min={0} max={1000} value={Math.round(pos * 1000)} onChange={(e) => setPos(+e.target.value / 1000)} aria-label={`${scene.label} (${scene.unit})`} aria-valuetext={`${fmt(value)} ${scene.unit}: ${stop.verdict}`} />
      <div className="st-meter-scale" aria-hidden>
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
      <p className="st-verdict" data-tone={stop.tone} role="status" key={stop.verdict}>
        <ToneIcon tone={stop.tone} /> {stop.verdict}
      </p>
      <p className="st-hint">Drag the slider.</p>
    </div>
  );
}

export function SceneView({ scene }: { scene: Scene }) {
  switch (scene.kind) {
    case "doodle":
      return (
        <div className="st-doodle">
          <Doodle name={scene.name} size={260} />
        </div>
      );
    case "flow":
      return (
        <div className="st-flow">
          <FlowDiagram spec={scene.spec} scenario={scene.scenario} autoplay loop compact />
        </div>
      );
    case "trace":
      return (
        <div className="st-trace">
          <AlgoPlayer spec={scene.trace} codeHtml="" preset={scene.preset} compact autoplay loop />
        </div>
      );
    case "classes":
      return (
        <div className="st-classes">
          <ClassDiagram spec={scene.spec} stage={scene.stage} bare />
        </div>
      );
    case "sum":
      return (
        <div className="st-sum">
          <ul>
            {scene.rows.map((r, i) => (
              <li key={r.label} style={{ ["--i" as string]: i }}>
                <span>{r.label}</span>
                <b>{r.value}</b>
              </li>
            ))}
          </ul>
          <p className="st-sum-result" style={{ ["--i" as string]: scene.rows.length }}>
            <span>{scene.result.label}</span>
            <b>{scene.result.value}</b>
          </p>
          <p className="st-stamp" data-tone={scene.verdict.tone} style={{ ["--i" as string]: scene.rows.length + 1 }}>
            <ToneIcon tone={scene.verdict.tone} /> {scene.verdict.text}
          </p>
        </div>
      );
    case "bars": {
      const top = Math.max(...scene.bars.map((b) => b.value));
      return (
        <ul className="st-bars">
          {scene.bars.map((b, i) => (
            <li key={b.label} style={{ ["--i" as string]: i }}>
              <span className="st-bar-label">{b.label}</span>
              <span className="st-bar-track">
                <span className="st-bar-fill" data-tone={b.tone ?? "info"} style={{ ["--w" as string]: `${Math.max(3, (b.value / top) * 100)}%` }} />
              </span>
              <b>{b.shown}</b>
            </li>
          ))}
        </ul>
      );
    }
    case "verdicts":
      return (
        <ul className="st-verdicts">
          {scene.items.map((it, i) => (
            <li key={it.label} data-tone={it.tone} style={{ ["--i" as string]: i }}>
              <ToneIcon tone={it.tone} />
              <b>{it.label}</b>
              <span>{it.why}</span>
            </li>
          ))}
        </ul>
      );
    case "versus":
      return (
        <div className="st-versus">
          {([scene.left, scene.right] as const).map((side, c) => (
            <div key={side.title} data-side={c === 0 ? "left" : "right"} style={{ ["--c" as string]: c }}>
              <h4>{side.title}</h4>
              <ul>
                {side.points.map((p, i) => (
                  <li key={p} style={{ ["--i" as string]: i + c * 2 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "meter":
      return <Meter scene={scene} />;
  }
}

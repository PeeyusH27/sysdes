"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Eraser, Keyboard } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { ReducedNote, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

export interface Keystroke {
  t: number;
  value: string;
}
export interface DebounceTimer {
  start: number;
  end: number;
  state: "reset" | "fired" | "running";
}
export interface FiredRequest {
  id: number;
  at: number;
  query: string;
  arrive: number;
  status: "pending" | "applied" | "aborted" | "stale";
  abortedAt?: number;
}

/**
 * Pure debounce + request timeline at time `now`. Each keystroke (re)starts a `delay` timer; when one
 * survives it fires a request for the text at that moment. With `abortStale`, firing a new request
 * aborts the one still in flight (AbortController); without it, a slow older response can land after
 * a newer one and overwrite it ("stale").
 */
export function debounceTimeline(keys: Keystroke[], delay: number, latencies: number[], now: number, abortStale = true) {
  const timers: DebounceTimer[] = [];
  const fires: { at: number; query: string }[] = [];
  keys.forEach((k, i) => {
    const end = k.t + delay;
    const next = keys[i + 1]?.t;
    if (next !== undefined && next < end) timers.push({ start: k.t, end: next, state: "reset" });
    else if (end <= now) {
      timers.push({ start: k.t, end, state: "fired" });
      fires.push({ at: end, query: k.value });
    } else timers.push({ start: k.t, end, state: "running" });
  });

  const requests: FiredRequest[] = fires.map((f, j) => ({ id: j, at: f.at, query: f.query, arrive: f.at + latencies[j % latencies.length], status: "pending" }));
  for (const [j, r] of requests.entries()) {
    const newer = requests[j + 1];
    if (abortStale && newer && newer.at < r.arrive) {
      r.status = "aborted";
      r.abortedAt = newer.at;
    } else if (r.arrive <= now) {
      const overtaken = !abortStale && requests.some((o) => o.id > r.id && o.arrive < r.arrive);
      r.status = overtaken ? "stale" : "applied";
    }
  }
  const landed = requests.filter((r) => r.status === "applied" || r.status === "stale").sort((a, b) => a.arrive - b.arrive);
  const shown = landed.at(-1) ?? null;
  const upcoming = [...timers.filter((t) => t.state === "running").map((t) => t.end), ...requests.filter((r) => r.status === "pending").map((r) => r.arrive)];
  return {
    timers,
    requests,
    shown: shown?.query ?? null,
    shownIsStale: shown?.status === "stale",
    nextEventAt: upcoming.length ? Math.min(...upcoming) : null,
  };
}

/** What a keystroke did to the text: the typed character, ␣ for space, ⌫ for a deletion. */
export function keyLabel(prev: string, next: string) {
  if (next.length < prev.length) return "⌫";
  const ch = next.slice(-1);
  return ch === " " ? "␣" : ch;
}

// ---------------------------------------------------------------- picture
const ROW = { keys: 40, timer: 86, req: 132 };
const SESSION_GAP = 3_000;
const SAMPLE = "system design";

/** Drawing geometry: the same three rows everywhere; a narrower box with bigger text (`k`) on a phone. */
interface Geo {
  w: number;
  l: number;
  r: number;
  k: number;
  /** ms of timeline in view */
  span: number;
}
const WIDE: Geo = { w: 600, l: 86, r: 590, k: 1, span: 6_000 };
const NARROW: Geo = { w: 340, l: 72, r: 334, k: 1.2, span: 4_000 };

/** True while the widget is narrower than `px`, i.e. on a phone. */
function useNarrow(px: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px));
    ro.observe(el);
    return () => ro.disconnect();
  }, [px]);
  return [ref, narrow] as const;
}

const CSS = `
.db { container: db / inline-size; }
.db-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; align-items: end; margin: 4px 0 8px; }
.db-inputs .control { min-width: 0; }
.db-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 4px; }
.db .legend { font-size: 12px; gap: 2px 12px; margin-top: 2px !important; }
.db-stats { display: flex; flex-wrap: wrap; gap: 2px 16px; margin: 6px 0 0 !important; font-size: 13px; }
.db-stats > div { display: block; }
.db-stats dt, .db-stats dd { display: inline; }
.db-stats dt { color: var(--muted); }
.db-stats dd { margin: 0 0 0 5px; font-weight: 650; font-variant-numeric: tabular-nums; }
.db-stats small { font-size: 12px; font-weight: 400; }
@container db (max-width: 479px) {
  .db-inputs { grid-template-columns: minmax(0, 1fr); }
  .db-bar .wbtn { padding: 0 9px; }
}
`;

export function DebounceViz() {
  const uid = useId();
  const [delay, setDelay] = useState(300);
  const [abort, setAbort] = useState(true);
  const [text, setText] = useState("");
  const [keys, setKeys] = useState<Keystroke[]>([]);
  const [session, setSession] = useState(0);
  const [now, setNow] = useState(0);
  const [autoTyping, setAutoTyping] = useState(false);
  const autoTimers = useRef<number[]>([]);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const { l: L, r: R, k, span: SPAN } = g;

  // Seeded server latencies (120–700 ms), different for each session so out-of-order replies happen.
  const latencies = useMemo(() => {
    const rand = mulberry32(17 + session * 101);
    return Array.from({ length: 64 }, () => Math.round(120 + rand() * 580));
  }, [session]);
  const tl = useMemo(() => debounceTimeline(keys, delay, latencies, now, abort), [keys, delay, latencies, now, abort]);

  const lastActivity = Math.max(keys.at(-1)?.t ?? 0, ...tl.requests.map((r) => r.abortedAt ?? r.arrive), ...tl.timers.map((t) => t.end));
  const busy = keys.length > 0 && now < lastActivity + 400;

  // Smooth clock while something is happening and the widget is visible.
  useEffect(() => {
    if (!busy || !inView || reduce) return;
    const id = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(id);
  }, [busy, inView, reduce]);
  // The debounce itself is real: wake up exactly when the next timer or response is due, animated or not.
  useEffect(() => {
    if (tl.nextEventAt === null) return;
    const id = window.setTimeout(() => setNow(performance.now()), Math.max(0, tl.nextEventAt - now) + 2);
    return () => window.clearTimeout(id);
  }, [tl.nextEventAt, now]);
  useEffect(() => () => autoTimers.current.forEach((id) => window.clearTimeout(id)), []);

  const record = (value: string) => {
    const t = performance.now();
    const prevActivity = keys.length ? lastActivity : -Infinity;
    if (t - prevActivity > SESSION_GAP) {
      setSession((s) => s + 1);
      setKeys([{ t, value }]);
    } else setKeys((k) => [...k, { t, value }]);
    setText(value);
    setNow(t);
  };
  const clearTimeline = () => {
    autoTimers.current.forEach((id) => window.clearTimeout(id));
    autoTimers.current = [];
    setAutoTyping(false);
    setKeys([]);
    setSession((s) => s + 1);
  };
  const clear = () => {
    clearTimeline();
    setText("");
  };
  const simulate = () => {
    clear();
    const gaps = [0, 110, 140, 90, 170, 120, 520, 130, 100, 160, 90, 140, 120];
    let at = 60;
    SAMPLE.split("").forEach((_, i) => {
      at += gaps[i] ?? 120;
      const value = SAMPLE.slice(0, i + 1);
      autoTimers.current.push(
        window.setTimeout(() => {
          const t = performance.now();
          setKeys((k) => [...k, { t, value }]);
          setText(value);
          setNow(t);
          if (i === SAMPLE.length - 1) setAutoTyping(false);
        }, at),
      );
    });
    setAutoTyping(true);
  };

  const viewEnd = keys.length ? Math.max(keys[0].t + SPAN, Math.min(now, lastActivity + 400)) : SPAN;
  const viewStart = viewEnd - SPAN;
  const x = (t: number) => L + ((Math.min(Math.max(t, viewStart), viewEnd) - viewStart) / SPAN) * (R - L);
  const visibleAt = (t: number) => t >= viewStart - 1;
  const base = keys[0]?.t ?? 0;
  const ticks: number[] = [];
  for (let k = Math.ceil((viewStart - base) / 1000); base + k * 1000 <= viewEnd; k++) if (k >= 0) ticks.push(k);

  const fired = tl.requests.length;
  const aborted = tl.requests.filter((r) => r.status === "aborted").length;
  const stale = tl.requests.filter((r) => r.status === "stale").length;
  const pending = tl.requests.filter((r) => r.status === "pending").length;
  const saved = keys.length ? Math.round((1 - fired / keys.length) * 100) : 0;
  const said = useThrottled(
    keys.length
      ? `${keys.length} keystrokes → ${fired} request${fired === 1 ? "" : "s"} fired (${saved}% fewer)${aborted ? `, ${aborted} aborted as stale` : ""}${stale ? `, ${stale} stale response${stale === 1 ? "" : "s"} overwrote newer results` : ""}. ${tl.shown !== null ? `Showing results for “${tl.shown}”${tl.shownIsStale ? " (stale!)" : ""}.` : ""}`
      : `Type in the box. Each keystroke restarts a ${delay} ms timer; a request fires only when you pause.`,
    600,
  );

  const keyLabels = keys.map((k, i) => keyLabel(i ? keys[i - 1].value : "", k.value));

  return (
    <WidgetFrame title="Debounce a search box" sub="Type for real. Each keystroke restarts the timer; only a pause fires a request. Slow responses that a newer request has made obsolete are aborted.">
      <style href="w-debounce" precedence="widgets">
        {CSS}
      </style>
      <div className="db" ref={boxRef}>
        <div className="db-inputs">
          <label className="control" htmlFor={`${uid}q`}>
            <span>Search</span>
            <input id={`${uid}q`} type="text" value={text} onChange={(e) => record(e.target.value)} placeholder="Type here, e.g. system design" autoComplete="off" spellCheck={false} disabled={autoTyping} />
          </label>
          <Slider
            label="Debounce delay"
            value={delay}
            min={0}
            max={600}
            step={50}
            onChange={(v) => {
              setDelay(v);
              clearTimeline();
            }}
            format={(v) => `${v} ms`}
          />
        </div>
        <div className="db-bar">
          <button type="button" className="wbtn primary" onClick={simulate} disabled={autoTyping}>
            <Keyboard size={14} aria-hidden /> Type “{SAMPLE}” for me
          </button>
          <button
            type="button"
            className="wbtn"
            aria-pressed={abort}
            onClick={() => {
              setAbort((a) => !a);
              clearTimeline();
            }}
          >
            {abort ? "✓" : "✕"} Abort stale requests
          </button>
          <button type="button" className="wbtn" onClick={clear}>
            <Eraser size={14} aria-hidden /> Clear
          </button>
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} 186`} className="sim-svg" style={{ maxWidth: 640, margin: "0 auto" }} role="img" aria-label={`Timeline of up to ${SPAN / 1000} seconds: ${keys.length} keystrokes, ${fired} requests, ${aborted} aborted`}>
            {[
              [narrow ? "Keys" : "Keystrokes", ROW.keys],
              ["Timer", ROW.timer],
              ["Requests", ROW.req],
            ].map(([label, y]) => (
              <g key={y}>
                <text x={6} y={(y as number) + 4} style={{ fontWeight: 650, fontSize: 12 * k }}>
                  {label}
                </text>
                <line x1={L} x2={R} y1={(y as number) + 18} y2={(y as number) + 18} stroke="var(--grid)" />
              </g>
            ))}
            {keys.map((key, i) =>
              visibleAt(key.t) ? (
                <g key={`k${i}`}>
                  <line x1={x(key.t)} x2={x(key.t)} y1={ROW.keys - 4} y2={ROW.keys + 12} stroke="var(--fg)" strokeWidth={1.5} />
                  <text x={x(key.t)} y={ROW.keys - 8} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 650 }}>
                    {keyLabels[i]}
                  </text>
                </g>
              ) : null,
            )}
            {tl.timers.map((t, i) => {
              if (!visibleAt(t.end)) return null;
              const end = t.state === "running" ? Math.min(now, t.end) : t.end;
              const w = Math.max(delay === 0 ? 0 : 2, x(end) - x(t.start));
              const fill = t.state === "fired" ? "var(--series-3)" : t.state === "running" ? "var(--accent)" : "var(--border-strong)";
              return (
                <g key={`t${i}`}>
                  {w > 0 && <rect x={x(t.start)} y={ROW.timer - 5} width={w} height={10} rx={3} fill={fill} opacity={t.state === "reset" ? 0.6 : 0.85} />}
                  {t.state === "reset" && <line x1={x(end)} x2={x(end)} y1={ROW.timer - 8} y2={ROW.timer + 8} stroke="var(--muted)" strokeWidth={1.5} />}
                  {t.state === "fired" && <path d={`M${x(end)} ${ROW.timer - 8} l4 8 l-4 8 z`} fill="var(--series-3)" />}
                </g>
              );
            })}
            {delay === 0 && keys.length > 0 && (
              <text x={L + 4} y={ROW.timer + 4} className="muted-text" style={{ fontSize: 11.5 * k }}>
                no debounce: every keystroke fires at once
              </text>
            )}
            {tl.requests.map((r) => {
              const stop = r.status === "aborted" ? r.abortedAt! : r.status === "pending" ? now : r.arrive;
              if (!visibleAt(stop)) return null;
              const lane = ROW.req + (r.id % 2 ? 7 : -5);
              const color = r.status === "aborted" ? "var(--critical)" : r.status === "stale" ? "var(--warning)" : "var(--series-1)";
              const w = Math.max(2, x(stop) - x(r.at));
              const tag = r.status === "aborted" ? "✕" : r.status === "stale" ? "⚠" : r.status === "applied" ? "✓" : "";
              return (
                <g key={`r${r.id}`}>
                  <rect x={x(r.at)} y={lane - 4} width={w} height={8} rx={3} fill={color} opacity={r.status === "pending" ? 0.55 : 0.9} />
                  {tag && (
                    <text x={x(stop) + 3} y={lane + 4} style={{ fontSize: 10.5 * k, fontWeight: 700, fill: r.status === "aborted" ? "var(--critical-ink)" : r.status === "stale" ? "var(--warning-ink)" : "var(--good-ink)" }}>
                      {tag}
                    </text>
                  )}
                  {w > (r.query.length * 6 + 8) * k && (
                    <text x={x(r.at) + 3} y={lane - 7} className="muted-text" style={{ fontSize: 10 * k }}>
                      “{r.query}”
                    </text>
                  )}
                </g>
              );
            })}
            {ticks.map((t) => (
              <text key={t} x={x(base + t * 1000)} y={180} textAnchor={x(base + t * 1000) > R - 12 ? "end" : "middle"} className="muted-text" style={{ fontSize: 10 * k }}>
                {t} s
              </text>
            ))}
            {busy && <line x1={x(now)} x2={x(now)} y1={22} y2={160} stroke="var(--fg)" strokeWidth={1} opacity={0.4} />}
          </svg>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <span className="line-key" style={{ background: "var(--border-strong)", height: 8 }} aria-hidden />
            timer reset by a keystroke
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-3)", height: 8 }} aria-hidden />
            timer ran out → request fires
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-1)", height: 8 }} aria-hidden />✓ response applied
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--critical)", height: 8 }} aria-hidden />✕ aborted (stale)
          </li>
          {!abort && (
            <li>
              <span className="line-key" style={{ background: "var(--warning)", height: 8 }} aria-hidden />⚠ late reply overwrote newer results
            </li>
          )}
        </ul>
        <dl className="db-stats">
          <div>
            <dt>Keystrokes</dt>
            <dd>{keys.length}</dd>
          </div>
          <div>
            <dt>Requests fired</dt>
            <dd>
              {fired} {(pending > 0 || keys.length > 0) && <small className="muted">({pending ? `${pending} in flight` : `${saved}% fewer than keystrokes`})</small>}
            </dd>
          </div>
          <div>
            <dt>{abort ? "Aborted (stale)" : "Stale overwrites"}</dt>
            <dd>{abort ? aborted : stale}</dd>
          </div>
          <div>
            <dt>Results shown</dt>
            <dd>
              {tl.shown === null ? "–" : `“${tl.shown}”`}
              {tl.shownIsStale && <small className="warn-ink"> ⚠ stale: not what you typed</small>}
            </dd>
          </div>
        </dl>
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Reduced motion: the timeline updates only when something happens." />
        </p>
      </div>
    </WidgetFrame>
  );
}

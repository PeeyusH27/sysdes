"use client";
import { useEffect, useRef, useState } from "react";
import { m, useInView } from "motion/react";
import { CircleCheck, RotateCcw, TriangleAlert } from "lucide-react";
import { useSimGate } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export const BUDGET_MS = 200;
/** How long the API waits for the recommendations service before serving defaults. */
export const DEP_TIMEOUT_MS = 90;

export interface TraceOpts {
  cdnHit: boolean;
  cacheHit: boolean;
  slowDb: boolean;
  depTimeout: boolean;
}

export type RowId = "dns" | "tls" | "cdn" | "api" | "redis" | "db" | "recs" | "queue";
export type SpanStatus = "hit" | "miss" | "slow" | "timeout" | "fallback" | "async" | "ok";
export interface Span {
  row: RowId;
  label: string;
  start: number;
  end: number;
  status: SpanStatus;
  /** fire-and-forget: not on the critical path */
  async?: boolean;
}

export const ROWS: { id: RowId; label: string; depth: number; color: string }[] = [
  { id: "dns", label: "DNS", depth: 0, color: "var(--k-client)" },
  { id: "tls", label: "TCP + TLS", depth: 0, color: "var(--k-client)" },
  { id: "cdn", label: "CDN edge", depth: 0, color: "var(--k-gateway)" },
  { id: "api", label: "API service", depth: 1, color: "var(--k-service)" },
  { id: "redis", label: "Redis", depth: 2, color: "var(--k-cache)" },
  { id: "db", label: "Database", depth: 2, color: "var(--k-database)" },
  { id: "recs", label: "Recs service", depth: 2, color: "var(--k-external)" },
  { id: "queue", label: "Queue publish", depth: 2, color: "var(--k-queue)" },
];

/** A GET /product/42 trace. Redis → DB and the recommendations call run in parallel inside the API. */
export function buildTrace(o: TraceOpts) {
  const spans: Span[] = [
    { row: "dns", label: "DNS lookup", start: 0, end: 12, status: "ok" },
    { row: "tls", label: "TCP + TLS 1.3", start: 12, end: 52, status: "ok" },
  ];
  if (o.cdnHit) {
    spans.push({ row: "cdn", label: "CDN hit", start: 52, end: 60, status: "hit" });
    return finish(spans, 60);
  }
  const apiStart = 52 + 4 + 15; // edge lookup + edge → origin
  const fan = apiStart + 5; // auth + parsing
  spans.push({ row: "redis", label: "GET product:42", start: fan, end: fan + 2, status: o.cacheHit ? "hit" : "miss" });
  let dataDone = fan + 2;
  if (!o.cacheHit) {
    const dbMs = o.slowDb ? 180 : 25;
    spans.push({ row: "db", label: o.slowDb ? "SELECT (slow)" : "SELECT", start: dataDone, end: dataDone + dbMs, status: o.slowDb ? "slow" : "ok" });
    dataDone += dbMs;
    spans.push({ row: "redis", label: "SET (fill)", start: dataDone, end: dataDone + 1, status: "ok" });
    dataDone += 1;
  }
  let recsDone: number;
  if (o.depTimeout) {
    spans.push({ row: "recs", label: `timeout ${DEP_TIMEOUT_MS} ms`, start: fan, end: fan + DEP_TIMEOUT_MS, status: "timeout" });
    spans.push({ row: "recs", label: "fallback", start: fan + DEP_TIMEOUT_MS, end: fan + DEP_TIMEOUT_MS + 1, status: "fallback" });
    recsDone = fan + DEP_TIMEOUT_MS + 1;
  } else {
    spans.push({ row: "recs", label: "GET /recs", start: fan, end: fan + 20, status: "ok" });
    recsDone = fan + 20;
  }
  const join = Math.max(dataDone, recsDone);
  spans.push({ row: "queue", label: "publish view event", start: join, end: join + 3, status: "async", async: true });
  const apiEnd = join + 5; // render JSON
  spans.push({ row: "api", label: "GET /product/42", start: apiStart, end: apiEnd, status: "ok" });
  const total = apiEnd + 15 + 2; // origin → edge, edge → client
  spans.push({ row: "cdn", label: "CDN miss → origin", start: 52, end: total, status: "miss" });
  return finish(spans, total);
}

function finish(spans: Span[], total: number) {
  const sync = spans.filter((s) => !s.async && s.row !== "api" && s.row !== "cdn");
  const biggest = sync.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a), sync[0]);
  return { spans, total, over: total > BUDGET_MS, share: total / BUDGET_MS, biggest };
}

/* ------------------------------------------------------------------ view */

/** Drawing geometry: a label column beside the bars on the desktop pane, labels above the bars on a phone. */
interface Geo {
  w: number;
  labelW: number;
  rowH: number;
  barY: number;
  barH: number;
  textY: number;
  k: number;
  narrow: boolean;
}
const WIDE: Geo = { w: 560, labelW: 128, rowH: 24, barY: 4, barH: 16, textY: 16, k: 1, narrow: false };
const NARROW: Geo = { w: 340, labelW: 8, rowH: 34, barY: 16, barH: 14, textY: 12, k: 1.2, narrow: true };
const TOP = 30;
const STATUS_WORD: Partial<Record<SpanStatus, string>> = { hit: "hit", miss: "miss", slow: "slow", timeout: "timeout", fallback: "fallback", async: "async" };
const STATUS_INK: Partial<Record<SpanStatus, string>> = { hit: "var(--good-ink)", miss: "var(--warning-ink)", slow: "var(--critical-ink)", timeout: "var(--critical-ink)", fallback: "var(--warning-ink)", async: "var(--muted)" };

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
.tw { container: tw / inline-size; }
.tw-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 6px; }
.tw-readout { display: flex; gap: 8px; align-items: baseline; }
@container tw (max-width: 479px) {
  .tw-bar .wbtn { padding: 0 9px; }
}
`;

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" className="wbtn" aria-pressed={on} onClick={() => set(!on)} style={on ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, var(--card-2))" } : undefined}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px solid currentColor", background: on ? "var(--accent)" : "transparent" }} />
      {label}
    </button>
  );
}

export function TraceWaterfall() {
  const [o, setO] = useState<TraceOpts>({ cdnHit: false, cacheHit: true, slowDb: false, depTimeout: false });
  const [run, setRun] = useState(0);
  const { ref, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const set = (k: keyof TraceOpts) => (v: boolean) => {
    setO((x) => ({ ...x, [k]: v }));
    setRun((r) => r + 1);
  };

  const tr = buildTrace(o);
  const W = g.w;
  const k = g.k;
  const axisMax = Math.max(tr.total, BUDGET_MS) * 1.08;
  const plotW = W - g.labelW - (g.narrow ? 8 : 14);
  const x = (ms: number) => g.labelW + (ms / axisMax) * plotW;
  const H = TOP + ROWS.length * g.rowH + 30;
  const secPerMs = 1.8 / tr.total; // the whole trace draws in ~1.8 s
  const tickStep = g.narrow ? 100 : 50;
  const ticks = Array.from({ length: Math.floor(axisMax / tickStep) + 1 }, (_, i) => i * tickStep);
  const notCalled = (row: RowId) => !tr.spans.some((s) => s.row === row);
  const notCalledWhy = (row: RowId) => `not called${o.cdnHit ? " (served by the CDN)" : row === "db" ? " (cache hit)" : ""}`;

  return (
    <WidgetFrame title="Trace waterfall" sub="One request, every hop, against a 200 ms latency budget. Flip the toggles to see which hop eats the budget.">
      <style href="w-trace-waterfall" precedence="widgets">
        {CSS}
      </style>
      <div className="tw" ref={boxRef}>
        <div className="tw-bar">
          <Toggle label="CDN hit" on={o.cdnHit} set={set("cdnHit")} />
          <Toggle label="Cache hit" on={o.cacheHit} set={set("cacheHit")} />
          <Toggle label="Slow DB" on={o.slowDb} set={set("slowDb")} />
          <Toggle label="Timeout + fallback" on={o.depTimeout} set={set("depTimeout")} />
          <button type="button" className="wbtn" onClick={() => setRun((r) => r + 1)} disabled={reduce} title={reduce ? "Reduced motion is on" : undefined}>
            <RotateCcw size={14} aria-hidden /> Replay
          </button>
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`Trace: total ${tr.total} ms against a ${BUDGET_MS} ms budget.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={TOP - 6} y2={H - 26} stroke="var(--grid)" strokeWidth={1} />
                <text x={x(t)} y={H - 10} textAnchor={g.narrow && t === 0 ? "start" : x(t) + 22 * k > W ? "end" : "middle"} className="muted-text" style={{ fontSize: 10.5 * k }}>
                  {t} ms
                </text>
              </g>
            ))}
            {ROWS.map((r, i) => {
              const y = TOP + i * g.rowH;
              const skipped = notCalled(r.id);
              const tag = tr.spans.find((x2) => x2.row === r.id && ["hit", "miss", "slow", "timeout"].includes(x2.status))?.status;
              return (
                <g key={r.id} opacity={skipped ? 0.5 : 1}>
                  <text x={8 + r.depth * 10} y={y + g.textY} style={{ fontWeight: r.depth === 0 ? 650 : 500, fontSize: 11.5 * k }}>
                    {r.depth > 0 ? "└ " : ""}
                    {r.label}
                    {tag && (
                      <tspan dx={4} style={{ fontSize: 10 * k, fontWeight: 700, fill: STATUS_INK[tag] }}>
                        {STATUS_WORD[tag]}
                      </tspan>
                    )}
                    {skipped && g.narrow && (
                      <tspan dx={6} className="muted-text" style={{ fontStyle: "italic", fontWeight: 400 }}>
                        {notCalledWhy(r.id)}
                      </tspan>
                    )}
                  </text>
                  {skipped && !g.narrow && (
                    <text x={g.labelW + 4} y={y + g.textY} className="muted-text" style={{ fontStyle: "italic" }}>
                      {notCalledWhy(r.id)}
                    </text>
                  )}
                </g>
              );
            })}
            {tr.spans.map((s, j) => {
              const row = ROWS.findIndex((r) => r.id === s.row);
              const meta = ROWS[row];
              const y = TOP + row * g.rowH + g.barY;
              const w = Math.max(2.5, x(s.end) - x(s.start));
              const delay = reduce ? 0 : s.start * secPerMs;
              const dur = reduce ? 0 : Math.max(0.12, (s.end - s.start) * secPerMs);
              const fill = s.status === "timeout" ? "var(--critical)" : meta.color;
              const word = STATUS_WORD[s.status];
              const lastInRow = !tr.spans.some((o2, i2) => i2 !== j && o2.row === s.row && o2.start > s.start);
              const fitsAfter = x(s.end) + 92 * k <= W;
              const light = s.row === "cdn" || s.row === "api" || !!s.async;
              return (
                <g key={`${run}-${j}`}>
                  <m.rect
                    x={x(s.start)}
                    y={y}
                    width={w}
                    height={g.barH}
                    rx={3}
                    fill={fill}
                    fillOpacity={light ? 0.3 : 0.9}
                    stroke={light ? meta.color : "none"}
                    strokeDasharray={s.async ? "3 2" : undefined}
                    style={{ transformBox: "fill-box", transformOrigin: "left center" }}
                    initial={{ scaleX: reduce ? 1 : 0 }}
                    animate={{ scaleX: seen || reduce ? 1 : 0 }}
                    transition={{ delay, duration: dur, ease: "linear" }}
                  >
                    <title>{`${meta.label}: ${s.label}, ${s.start}–${s.end} ms (${s.end - s.start} ms)${s.async ? ", async: not on the critical path" : ""}`}</title>
                  </m.rect>
                  {lastInRow && (
                    <m.text
                      x={fitsAfter ? x(s.end) + 5 : x(s.end) - 5}
                      y={y + g.barH / 2 + 4 * k}
                      textAnchor={fitsAfter ? "start" : "end"}
                      style={{ fontSize: 10.5 * k, fontWeight: 650, fill: fitsAfter ? (word ? STATUS_INK[s.status] : "var(--muted)") : light ? "var(--fg)" : "var(--accent-ink)" }}
                      initial={{ opacity: reduce ? 1 : 0 }}
                      animate={{ opacity: seen || reduce ? 1 : 0 }}
                      transition={{ delay: delay + dur, duration: 0.2 }}
                    >
                      {`${s.end - s.start} ms${word ? ` · ${word}` : ""}`}
                    </m.text>
                  )}
                </g>
              );
            })}
            {/* budget line */}
            <line x1={x(BUDGET_MS)} x2={x(BUDGET_MS)} y1={TOP - 14} y2={H - 26} stroke="var(--critical)" strokeWidth={1.6} strokeDasharray="5 3" />
            <text x={x(BUDGET_MS)} y={TOP - 18} textAnchor={g.narrow ? "end" : "middle"} style={{ fontSize: 10.5 * k, fontWeight: 700, fill: "var(--critical-ink)" }}>
              {BUDGET_MS} ms budget
            </text>
            {/* total marker */}
            <m.line
              key={`total-${run}`}
              x1={x(tr.total)}
              x2={x(tr.total)}
              y1={TOP - 4}
              y2={H - 26}
              stroke="var(--fg)"
              strokeWidth={1.4}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: seen || reduce ? 1 : 0 }}
              transition={{ delay: reduce ? 0 : 1.8, duration: 0.3 }}
            />
            <m.text
              key={`total-t-${run}`}
              x={x(tr.total) + (x(tr.total) > x(BUDGET_MS) - 60 * k && x(tr.total) < x(BUDGET_MS) ? -4 : 4)}
              y={TOP - 4}
              textAnchor={(x(tr.total) > x(BUDGET_MS) - 60 * k && x(tr.total) < x(BUDGET_MS)) || x(tr.total) + 80 * k > W ? "end" : "start"}
              style={{ fontSize: 10.5 * k, fontWeight: 700 }}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: seen || reduce ? 1 : 0 }}
              transition={{ delay: reduce ? 0 : 1.8, duration: 0.3 }}
            >
              total {tr.total} ms
            </m.text>
          </svg>
        </div>
        <p className="readout tw-readout" aria-live="polite">
          {tr.over ? <TriangleAlert size={15} aria-hidden className="bad-ink" style={{ flex: "none", position: "relative", top: 2 }} /> : <CircleCheck size={15} aria-hidden className="ok-ink" style={{ flex: "none", position: "relative", top: 2 }} />}
          <span>
            Total <strong>{tr.total} ms</strong> of the {BUDGET_MS} ms budget ({Math.round(tr.share * 100)}%):{" "}
            <strong className={tr.over ? "bad-ink" : "ok-ink"}>{tr.over ? `over budget by ${tr.total - BUDGET_MS} ms` : "within budget"}</strong>. Biggest hop: {ROWS.find((r) => r.id === tr.biggest.row)!.label} ({tr.biggest.label}, {tr.biggest.end - tr.biggest.start} ms).
            {o.cdnHit && " The CDN answered from the edge, so the origin never saw the request."}
            {!o.cdnHit && o.depTimeout && ` The recommendations call gave up after ${DEP_TIMEOUT_MS} ms and served defaults; without a timeout it would hold the whole response hostage.`}
            {!o.cdnHit && o.slowDb && o.cacheHit && " The slow database doesn't matter while the cache hits."}
            {!o.cdnHit && " Redis → DB and the recommendations call run in parallel, so the slower branch sets the pace; the queue publish is fire-and-forget."}
          </span>
        </p>
      </div>
    </WidgetFrame>
  );
}

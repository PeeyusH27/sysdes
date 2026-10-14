"use client";
import { useEffect, useRef, useState } from "react";
import { m, useInView } from "motion/react";
import { RotateCcw } from "lucide-react";
import { StatTiles } from "@/components/charts/ChartBits";
import { useSimGate } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export type Proto = "tls12" | "tls13" | "h3";
export const PROTO_LABEL: Record<Proto, string> = { tls12: "TLS 1.2", tls13: "TLS 1.3", h3: "HTTP/3 (QUIC)" };

export interface Phase {
  id: "dns" | "tcp" | "tls" | "quic" | "req";
  label: string;
  rtts: number;
  start: number;
  end: number;
  /** what crosses the wire */
  detail: string;
}

const PHASES: Record<Phase["id"], { label: string; detail: string }> = {
  dns: { label: "DNS", detail: "Ask the resolver for the server's IP address and wait for the answer." },
  tcp: { label: "TCP", detail: "SYN → ← SYN-ACK. The final ACK rides along with the first TLS message." },
  tls: { label: "TLS", detail: "" },
  quic: { label: "QUIC + TLS", detail: "QUIC carries the TLS 1.3 handshake in its own first round trip: transport and encryption are set up together." },
  req: { label: "Request", detail: "GET → ← response (server time not included)." },
};
const TLS_DETAIL: Record<"tls12" | "tls13", string> = {
  tls12: "Two round trips: ClientHello → ← ServerHello + certificate, then key exchange + Finished → ← Finished.",
  tls13: "One round trip: ClientHello with a key share → ← ServerHello, certificate, Finished. The client's Finished goes with the request.",
};

/** Round trips for each phase of a cold HTTPS request (a kept-alive connection needs only the request). */
export function coldRtts(proto: Proto, dnsCached = false): { id: Phase["id"]; rtts: number }[] {
  const out: { id: Phase["id"]; rtts: number }[] = [];
  if (!dnsCached) out.push({ id: "dns", rtts: 1 });
  if (proto === "h3") out.push({ id: "quic", rtts: 1 });
  else out.push({ id: "tcp", rtts: 1 }, { id: "tls", rtts: proto === "tls12" ? 2 : 1 });
  out.push({ id: "req", rtts: 1 });
  return out;
}

export function handshake(proto: Proto, rtt: number, dnsCached = false) {
  let t = 0;
  const cold: Phase[] = coldRtts(proto, dnsCached).map(({ id, rtts }) => {
    const p: Phase = {
      id,
      rtts,
      start: t,
      end: t + rtts * rtt,
      label: id === "tls" ? PROTO_LABEL[proto as "tls12" | "tls13"] : PHASES[id].label,
      detail: id === "tls" ? TLS_DETAIL[proto as "tls12" | "tls13"] : PHASES[id].detail,
    };
    t = p.end;
    return p;
  });
  const warm: Phase[] = [{ id: "req", rtts: 1, start: 0, end: rtt, label: "Request", detail: "Same connection, already encrypted: just GET → ← response." }];
  const coldMs = t;
  return { cold, warm, coldMs, warmMs: rtt, coldRttCount: cold.reduce((a, p) => a + p.rtts, 0) };
}

/* ------------------------------------------------------------------ view */

const COLOR: Record<Phase["id"], string> = {
  dns: "var(--series-3)",
  tcp: "var(--series-2)",
  tls: "var(--series-2)",
  quic: "var(--series-2)",
  req: "var(--series-1)",
};
const SHORT_LABEL: Record<Proto, string> = { tls12: "TLS 1.2", tls13: "TLS 1.3", h3: "HTTP/3" };

/** True when the widget is phone-narrow; false on the server and until measured, so the first render matches desktop. */
function useNarrow(ref: React.RefObject<HTMLElement | null>, px = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setNarrow(e.contentRect.width < px); // 0 = hidden: keep the last layout
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

const CSS = `
.w-hs { container-type: inline-size; }
.w-hs .controls { margin-bottom: 4px; }
.w-hs .control { min-width: 120px; }
.w-hs .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
.w-hs .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-hs .stat-label, .w-hs .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-hs .stat-value { font-size: 17px; line-height: 1.3; }
@container (max-width: 520px) { .w-hs .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export function HandshakeTimeline() {
  const [rtt, setRtt] = useState(50);
  const [proto, setProto] = useState<Proto>("tls13");
  const [dnsCached, setDnsCached] = useState(false);
  const [run, setRun] = useState(0);
  const { ref, reduce } = useSimGate<HTMLDivElement>();
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box);

  const h = handshake(proto, rtt, dnsCached);
  const worst = handshake("tls12", rtt, false).coldMs; // fixed axis, so protocols compare at a glance
  // Landscape drawing at roughly 1:1 in a 600–700 px pane; a narrower one for phones.
  const W = narrow ? 300 : 600;
  const L = 8;
  const R = W - 10;
  const BAR = narrow ? 26 : 28;
  const x = (ms: number) => L + (ms / worst) * (R - L);
  const totalDur = 1.6;
  const lanes = [
    { id: "cold", title: `New connection: ${h.coldRttCount} round trips = ${h.coldMs} ms`, phases: h.cold, y: 22 },
    { id: "warm", title: `Kept-alive connection: 1 round trip = ${h.warmMs} ms`, phases: h.warm, y: 22 + BAR + 30 },
  ];
  const gridBottom = lanes[1].y + BAR + 6;
  const H = gridBottom + 18;
  const saved = h.coldMs - h.warmMs;
  const tenCold = h.coldMs * 10;
  const tenWarm = h.coldMs + h.warmMs * 9;
  const gridN = Math.floor(worst / rtt);
  const labelEvery = narrow && gridN > 4 ? 2 : 1;

  return (
    <WidgetFrame title="Handshake timeline" sub="Every new HTTPS connection pays round trips before the first byte of the response. Keep-alive pays them once.">
      <style href="w-handshake" precedence="widgets">
        {CSS}
      </style>
      <div className="w-hs" ref={box}>
        <div className="controls">
          <Slider label="Round-trip time (RTT)" value={rtt} min={5} max={300} step={5} onChange={setRtt} format={(v) => `${v} ms`} />
          <Seg<Proto>
            label="Protocol"
            value={proto}
            onChange={(v) => {
              setProto(v);
              setRun((r) => r + 1);
            }}
            options={(Object.keys(PROTO_LABEL) as Proto[]).map((p) => ({ value: p, label: SHORT_LABEL[p] }))}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <button
              type="button"
              className="wbtn"
              aria-pressed={dnsCached}
              onClick={() => {
                setDnsCached((v) => !v);
                setRun((r) => r + 1);
              }}
            >
              DNS cached: {dnsCached ? "yes" : "no"}
            </button>
            <button type="button" className="wbtn" onClick={() => setRun((r) => r + 1)} disabled={reduce} aria-label="Replay" title={reduce ? "Reduced motion is on" : "Replay"}>
              <RotateCcw size={14} aria-hidden />
            </button>
          </div>
        </div>

        <div ref={ref}>
          <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={`Cold request ${h.coldMs} ms, kept-alive request ${h.warmMs} ms`}>
            {/* RTT grid */}
            {Array.from({ length: gridN + 1 }, (_, i) => (
              <g key={i}>
                <line x1={x(i * rtt)} x2={x(i * rtt)} y1={lanes[0].y - 4} y2={gridBottom} stroke="var(--grid)" strokeWidth={1} />
                {i % labelEvery === 0 && (
                  <text x={x(i * rtt)} y={H - 4} textAnchor={i === 0 ? "start" : i === gridN ? "end" : "middle"} className="muted-text" style={{ fontSize: 10.5 }}>
                    {i * rtt} ms
                  </text>
                )}
              </g>
            ))}
            {lanes.map((lane) => (
              <g key={lane.id}>
                <text x={L} y={lane.y - 7} style={{ fontWeight: 650, fontSize: 12.5 }}>
                  {lane.title}
                </text>
                {lane.phases.map((p, i) => {
                  const w = Math.max(2, x(p.end) - x(p.start) - 2);
                  const delay = (p.start / worst) * totalDur;
                  const dur = Math.max(0.15, ((p.end - p.start) / worst) * totalDur);
                  return (
                    <g key={`${run}-${lane.id}-${p.id}-${i}`}>
                      <m.rect
                        x={x(p.start)}
                        y={lane.y}
                        width={w}
                        height={BAR}
                        rx={5}
                        fill={COLOR[p.id]}
                        style={{ transformBox: "fill-box", transformOrigin: "left center" }}
                        initial={{ scaleX: reduce ? 1 : 0 }}
                        animate={{ scaleX: seen || reduce ? 1 : 0 }}
                        transition={{ delay: reduce ? 0 : delay, duration: reduce ? 0 : dur, ease: "linear" }}
                      >
                        <title>{`${p.label}: ${p.rtts} RTT = ${p.end - p.start} ms. ${p.detail}`}</title>
                      </m.rect>
                      {w > 30 && (
                        <m.text
                          x={x(p.start) + 6}
                          y={lane.y + BAR / 2 + 4}
                          style={{ fontSize: 11, fontWeight: 700, fill: "var(--accent-ink)" }}
                          initial={{ opacity: reduce ? 1 : 0 }}
                          animate={{ opacity: seen || reduce ? 1 : 0 }}
                          transition={{ delay: reduce ? 0 : delay + dur * 0.6, duration: 0.2 }}
                        >
                          {w > 80 ? `${p.label} ${p.rtts > 1 ? `×${p.rtts}` : ""}` : p.id === "req" ? "Req" : p.label.split(" ")[0]}
                        </m.text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>

        <ul className="legend" aria-label="Legend" style={{ marginTop: 2 }}>
          <li>
            <span className="line-key" style={{ background: "var(--series-3)", height: 8, width: 12 }} aria-hidden /> DNS lookup
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-2)", height: 8, width: 12 }} aria-hidden /> connection setup (TCP, TLS or QUIC)
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-1)", height: 8, width: 12 }} aria-hidden /> the request
          </li>
          <li>gridlines = 1 RTT</li>
        </ul>

        <StatTiles
          items={[
            { label: "Cold request", value: `${h.coldMs} ms`, sub: `${h.coldRttCount} RTT` },
            { label: "Kept-alive", value: `${h.warmMs} ms`, sub: "1 RTT" },
            { label: "Saved each time", value: `${saved} ms`, sub: `${Math.round((saved / h.coldMs) * 100)}% of cold` },
            { label: "10 in a row", value: `${tenWarm.toLocaleString("en")} ms`, sub: `vs ${tenCold.toLocaleString("en")} ms all cold` },
          ]}
        />

        <p className="readout" aria-live="polite">
          {PROTO_LABEL[proto]} at {rtt} ms RTT: a cold HTTPS request costs {h.cold.map((p) => `${p.label} ${p.end - p.start}`).join(" + ")} = <strong>{h.coldMs} ms</strong> before the response starts; on a kept-alive connection it&apos;s <strong>{h.warmMs} ms</strong>.
          {proto !== "tls12" && " A resumed session can even send the request in its first flight (0-RTT), but only for requests that are safe to replay."}
        </p>

        <More label="What crosses the wire">
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5 }}>
            {h.cold.map((p) => (
              <li key={p.id}>
                <strong>{p.label}</strong> ({p.rtts} RTT, {p.end - p.start} ms): {p.detail}
              </li>
            ))}
          </ol>
        </More>
      </div>
    </WidgetFrame>
  );
}

"use client";
import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { cwndSeries, throughputMbps } from "@content/cs/lessons/06-tcp-in-depth/snippets/congestion.js";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export type LossKind = "none" | "dupack" | "timeout";
export const ROUNDS = 30;

/** What the sender may have in flight each round trip: the smaller of the congestion window and the receiver's window. */
export function windowSeries(opts: { ssthresh: number; kind: LossKind; lossRound: number; rwnd: number; initial?: number }) {
  const cwnd: number[] = cwndSeries({
    rounds: ROUNDS,
    initial: opts.initial ?? 10,
    ssthresh: opts.ssthresh,
    loss: opts.kind === "none" ? null : { round: opts.lossRound, kind: opts.kind },
  });
  const sent = cwnd.map((w) => Math.min(w, opts.rwnd));
  const average = sent.reduce((a, b) => a + b, 0) / sent.length;
  return { cwnd, sent, average, peak: Math.max(...cwnd), mbps: throughputMbps(average) };
}

/* ------------------------------------------------------------------ view */

const CSS = `
.cw { container: cw / inline-size; }
.cw-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; align-items: end; margin: 4px 0 6px; }
.cw-controls .control { min-width: 0; }
.cw .chart { margin: 4px 0 0; padding: 0; border: 0; background: transparent; }
.cw .chart-title { font-size: 13.5px; margin-bottom: 2px; }
@container cw (max-width: 519px) { .cw-controls { grid-template-columns: minmax(0, 1fr); } }
`;

const X = Array.from({ length: ROUNDS }, (_, i) => i);

export function CongestionWindow() {
  const [kind, setKind] = useState<LossKind>("dupack");
  const [lossRound, setLossRound] = useState(8);
  const [rwnd, setRwnd] = useState(128);
  const [ssthresh, setSsthresh] = useState(64);
  const m = useMemo(() => windowSeries({ ssthresh, kind, lossRound, rwnd }), [ssthresh, kind, lossRound, rwnd]);
  const limited = m.peak > rwnd;
  const reading =
    kind === "none"
      ? `No loss: the window grows to ${m.peak} segments. ${limited ? `The receiver's window caps what is sent at ${rwnd}, so flow control is the limit.` : "The window keeps growing until something is lost."}`
      : kind === "dupack"
        ? `Three duplicate ACKs at round ${lossRound}: the window halves and then grows by one per round trip.`
        : `A timeout at round ${lossRound}: the window falls to 1 and slow start begins again, which is far costlier.`;
  return (
    <WidgetFrame title="TCP congestion window" sub="Watch the window double in slow start, grow by one, and react to a loss. The receiver's window is a separate, flat limit.">
      <style href="w-congestion-window" precedence="widgets">
        {CSS}
      </style>
      <div className="cw">
        <div className="cw-controls">
          <Seg
            label="Loss event"
            value={kind}
            onChange={setKind}
            options={[
              { value: "none", label: "None" },
              { value: "dupack", label: "3 dup ACKs" },
              { value: "timeout", label: "Timeout" },
            ]}
          />
          <Slider label="Loss at round" value={lossRound} min={3} max={25} onChange={setLossRound} />
          <Slider label="Receiver window" value={rwnd} min={16} max={128} step={8} onChange={setRwnd} format={(v) => `${v} seg`} />
        </div>
        <div className="cw-controls">
          <Slider label="Initial ssthresh" value={ssthresh} min={16} max={128} step={8} onChange={setSsthresh} format={(v) => `${v} seg`} />
        </div>
        <LineChart
          title="Segments in flight per round trip"
          x={X}
          series={[
            { id: "cwnd", name: "Congestion window", values: m.cwnd },
            { id: "rwnd", name: "Receiver window", values: X.map(() => rwnd) },
          ]}
          xLabel="Round trip"
          yUnit="segments"
          xFormat="raw"
          height={210}
        />
        <p className="readout" aria-live="polite">
          {reading} Average in flight <strong>{m.average.toFixed(0)}</strong> segments, about <strong>{m.mbps.toFixed(1)} Mbit/s</strong> at 50 ms and 1460-byte segments.
        </p>
      </div>
    </WidgetFrame>
  );
}

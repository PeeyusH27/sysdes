"use client";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const MAX_NUMS = 10;
export type PsMode = "range" | "sumk";

export function parseNums(text: string, max = MAX_NUMS): number[] {
  return (text.match(/-?\d+/g) ?? []).slice(0, max).map((s) => Math.max(-20, Math.min(20, Number(s))));
}

/** P[0] = 0 and P[i + 1] = P[i] + nums[i]: n + 1 entries. */
export function prefixSums(nums: number[]) {
  const P = [0];
  for (const x of nums) P.push(P[P.length - 1] + x);
  return P;
}

/** Sum of nums[l..r], both ends included: one subtraction. */
export const rangeSum = (P: number[], l: number, r: number) => P[r + 1] - P[l];

/** Running query tally: the prefix answers each query with one subtraction; a loop adds r - l + 1 numbers. */
export interface RangeState {
  l: number;
  r: number;
  queries: number;
  loopAdds: number;
  seq: number;
}
export function query(s: RangeState, l: number, r: number): RangeState {
  if (l === s.l && r === s.r) return s;
  return { ...s, l, r, queries: s.queries + 1, loopAdds: s.loopAdds + (r - l + 1) };
}
/** The next random query (Run streams these): deterministic for a given sequence number. */
export function randomQuery(s: RangeState, n: number): RangeState {
  if (n === 0) return s;
  const rnd = mulberry32(1000 + s.seq);
  const a = Math.floor(rnd() * n);
  const b = Math.floor(rnd() * n);
  return { ...query(s, Math.min(a, b), Math.max(a, b)), seq: s.seq + 1 };
}

export interface KFrame {
  /** Index just added (-1 before the first). */
  i: number;
  sum: number;
  /** sum - k: the earlier prefix this step looks up. */
  need: number | null;
  /** Prefix indices j with P[j] = need: each is a subarray j..i that sums to k. */
  hits: number[];
  /** Prefix sum → how many times seen, after this step records its sum. */
  seen: [number, number][];
  total: number;
}

/** Count subarrays summing to k: look up sum - k among earlier prefixes, then record sum. */
export function sumKFrames(nums: number[], k: number): KFrame[] {
  const seen = new Map<number, number>([[0, 1]]);
  const where = new Map<number, number[]>([[0, [0]]]);
  const frames: KFrame[] = [{ i: -1, sum: 0, need: null, hits: [], seen: [...seen], total: 0 }];
  let sum = 0;
  let total = 0;
  nums.forEach((x, i) => {
    sum += x;
    const need = sum - k;
    const hits = [...(where.get(need) ?? [])];
    total += seen.get(need) ?? 0;
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
    where.set(sum, [...(where.get(sum) ?? []), i + 1]);
    frames.push({ i, sum, need, hits, seen: [...seen], total });
  });
  return frames;
}

/** Brute force: try every subarray. */
export function bruteCountK(nums: number[], k: number) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) if ((s += nums[j]) === k) count++;
  }
  return count;
}

// ---------------------------------------------------------------- drawing
/**
 * Two layouts of the same staircase. WIDE (a desktop pane, 480 px and up) is landscape: the staircase on the left,
 * a side panel on the right for the work tally (range sums) or the map of seen sums (subarrays = k). NARROW (phones)
 * stacks the map under the staircase and keeps the tally as page text.
 */
const WIDE = { W: 600, STAIR_H: 110, RX: 436 };
const NARROW = { W: 360, STAIR_H: 116, RX: 0 };
const X0 = 18;
const TOP = 26;
const FRAME_MS = 1300;
const QUERY_MS = 1400;
const DEFAULT = "3 -1 4 1 -5 9 2 -6";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmt = (v: number) => (v < 0 ? `−${-v}` : String(v));

function rangeSentence(P: number[], s: RangeState) {
  const { l, r } = s;
  if (P.length < 2) return "Type some numbers to start.";
  return `sum(${l}..${r}) = P[${r + 1}] − P[${l}] = ${fmt(P[r + 1])} − ${fmt(P[l])} = ${fmt(rangeSum(P, l, r))}. One subtraction; adding up the range reads ${plural(r - l + 1, "number", "numbers")}.`;
}

function kSentence(f: KFrame, nums: number[], k: number, done: boolean) {
  const n = nums.length;
  if (!n) return "Type some numbers to start.";
  if (f.i < 0) return `The map starts with the empty prefix (0 seen once). Each step adds a number and asks: was sum − ${fmt(k)} seen before? Press Run or Step.`;
  const ranges = f.hits.map((j) => `${j}..${f.i}`).join(" and ");
  const head = f.hits.length
    ? `Sum ${fmt(f.sum)}. Need an earlier prefix of ${fmt(f.sum)} − ${fmt(k)} = ${fmt(f.need!)}: seen ${f.hits.length}×, so ${plural(f.hits.length, "subarray ends", "subarrays end")} here (${ranges}).`
    : `Sum ${fmt(f.sum)}. Need ${fmt(f.need!)}: never seen, so no subarray ends here.`;
  return done ? `${head} Total: ${plural(f.total, "subarray", "subarrays")} sum to ${fmt(k)}, with ${n} lookups; brute force checks ${(n * (n + 1)) / 2}.` : head;
}

export function PrefixSumLab() {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<"a" | "b" | null>(null);
  const [mode, setMode] = useState<PsMode>("range");
  const [text, setText] = useState(DEFAULT);
  const [k, setK] = useState(5);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const wide = !useNarrow(ref, 480);
  const { W, STAIR_H, RX } = wide ? WIDE : NARROW;
  const CELL_Y = TOP + STAIR_H + 22;

  const nums = useMemo(() => parseNums(text), [text]);
  const n = nums.length;
  const P = useMemo(() => prefixSums(nums), [nums]);
  const frames = useMemo(() => sumKFrames(nums, k), [nums, k]);
  const last = frames.length - 1;

  const nextQuery = useCallback((s: RangeState) => randomQuery(s, n), [n]);
  const [rs, setRs, tickQuery] = useFixedStep<RangeState>({ l: 2, r: 5, queries: 0, loopAdds: 0, seq: 0 }, nextQuery, mode === "range" && running && inView && !reduce, QUERY_MS);
  const advance = useCallback((i: number) => Math.min(i + 1, last), [last]);
  const [idx, setIdx, tick] = useFixedStep<number>(0, advance, mode === "sumk" && running && inView && !reduce, FRAME_MS);
  const f = frames[Math.min(idx, last)];
  const done = idx >= last;
  const playing = running && !reduce && (mode === "range" || !done);

  const l = Math.min(rs.l, Math.max(0, n - 1));
  const r = Math.max(l, Math.min(rs.r, n - 1));
  const sentence = mode === "range" ? rangeSentence(P, { ...rs, l, r }) : kSentence(f, nums, k, done);
  const said = useThrottled(sentence, 500);

  const cw = wide ? Math.min(36, 336 / Math.max(1, n)) : Math.min(32, (W - X0 - 76) / Math.max(1, n));
  const ox = wide ? X0 + 4 : Math.max(X0, (W - n * cw - 70) / 2);
  const bx = (i: number) => ox + i * cw;
  const lo = Math.min(0, ...P);
  const hi = Math.max(1, ...P);
  const py = (v: number) => TOP + ((hi - v) / Math.max(1, hi - lo)) * STAIR_H;
  const pw = Math.max(8, cw * 0.55);
  const dur = reduce ? 0 : 0.35;
  const H = wide ? CELL_Y + 44 : mode === "range" ? CELL_Y + 46 : CELL_Y + 70 + Math.ceil(frames[last].seen.length / 7) * 26;
  const work = Math.max(1, n + rs.queries, rs.loopAdds);
  const b750 = { fontWeight: 750, fill: "var(--fg)" };
  const a = l;
  const b = r + 1;

  const boundaryAt = (clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    const x = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n, Math.round((x - bx(0)) / cw)));
  };
  const moveHandle = (which: "a" | "b", at: number) => {
    const na = which === "a" ? Math.min(at, b - 1) : a;
    const nb = which === "b" ? Math.max(at, a + 1) : b;
    setRs(query({ ...rs, l, r }, Math.max(0, na), Math.min(n, nb) - 1));
  };
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== "range" || n === 0) return;
    const at = boundaryAt(e.clientX);
    if (at === null) return;
    drag.current = Math.abs(at - a) <= Math.abs(at - b) && at < b ? "a" : "b";
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setRunning(false);
    moveHandle(drag.current, at);
  };
  const stopDrag = () => {
    drag.current = null;
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const at = boundaryAt(e.clientX);
    if (at !== null) moveHandle(drag.current, at);
  };

  const label =
    mode === "range"
      ? `Prefix staircase for ${nums.join(", ") || "no numbers"}. Range ${l} to ${r}: P[${b}] minus P[${a}] is ${n ? rangeSum(P, l, r) : 0}. After ${rs.queries} queries the prefix did ${n + rs.queries} operations; a loop added ${rs.loopAdds} numbers.`
      : `Counting subarrays that sum to ${k}. ${f.i < 0 ? "Not started." : `At index ${f.i}, running sum ${f.sum}, ${f.total} found so far.`}`;

  return (
    <WidgetFrame title="Prefix staircase" sub="A range sum is the gap between two running totals. Drag the handles.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Seg<PsMode> labelMode="hidden" compact label="Question" value={mode} onChange={(v) => { setMode(v); setRunning(v === "sumk"); setIdx(0); }}
          options={[{ value: "range", label: "Range sum" }, { value: "sumk", label: "Subarrays = k" }]} />
        {mode === "range" ? (
          <SimButtons running={playing} reduce={reduce} stepLabel="Random query" stepHint="Ask for a random range" onStep={tickQuery}
            onToggle={() => setRunning(!playing)} onReset={() => { setRs({ ...rs, queries: 0, loopAdds: 0 }); setRunning(false); }} />
        ) : (
          <SimButtons running={playing} reduce={reduce} stepHint="Add the next number" onStep={tick}
            onToggle={() => { if (!playing && done) setIdx(0); setRunning(!playing); }} onReset={() => { setIdx(0); setRunning(false); }} />
        )}
      </div>

      <div ref={ref}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 680 : 520, margin: "0 auto", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none", cursor: mode === "range" ? "ew-resize" : undefined }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          <line x1={bx(0) - 8} x2={bx(n) + 8} y1={py(0)} y2={py(0)} stroke="var(--border)" strokeDasharray="3 4" />

          {mode === "sumk" && f.need !== null && (
            <m.g initial={false} animate={{ y: Math.max(TOP - 12, Math.min(TOP + STAIR_H + 12, py(f.need))) }} transition={{ duration: dur }}>
              <line x1={bx(0) - 8} x2={bx(f.i + 1)} y1={0} y2={0} stroke={f.hits.length ? "var(--good)" : "var(--k-client)"} strokeWidth={1.6} strokeDasharray="6 4" />
              <text x={bx(f.i + 1) + 6} y={4} style={{ fontSize: 11, fontWeight: 700, fill: f.hits.length ? "var(--good-ink)" : "var(--k-client)" }}>
                need {fmt(f.need)} {f.hits.length ? "✓" : "?"}
              </text>
            </m.g>
          )}

          {nums.map((v, i) => {
            const inRange = mode === "range" ? i >= l && i <= r : f.hits.some((j) => i >= j && i <= f.i);
            const walked = mode === "sumk" && i <= f.i;
            return (
              <m.line key={`rise-${i}`} initial={false} animate={{ x1: bx(i) + pw / 2, y1: py(P[i]), x2: bx(i + 1) - pw / 2, y2: py(P[i + 1]) }} transition={{ duration: dur }}
                stroke={inRange ? "var(--accent-2)" : walked ? "var(--muted)" : "var(--border-strong)"} strokeWidth={inRange ? 2.6 : walked ? 1.8 : 1.4} />
            );
          })}
          {P.map((p, i) => {
            const isHandle = mode === "range" && (i === a || i === b);
            const visible = mode === "range" || i <= f.i + 1;
            const hit = mode === "sumk" && f.hits.includes(i);
            const cur = mode === "sumk" && i === f.i + 1;
            const color = hit ? "var(--good)" : isHandle ? (i === a ? "var(--k-client)" : "var(--accent)") : cur ? "var(--accent)" : "var(--fg)";
            return (
              <m.g key={`step-${i}`} initial={false} animate={{ x: bx(i), y: py(p), opacity: visible ? 1 : 0.25 }} transition={{ duration: dur }}>
                <line x1={-pw / 2} x2={pw / 2} y1={0} y2={0} stroke={color} strokeWidth={isHandle || hit || cur ? 4 : 2.4} strokeLinecap="round" />
                {isHandle && <circle r={6} fill="var(--card)" stroke={color} strokeWidth={2.4} />}
                {isHandle && (
                  <text y={20} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: color }}>
                    P[{i}]
                  </text>
                )}
                <text y={-8} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: isHandle || hit || cur ? 800 : 500, fill: hit ? "var(--good-ink)" : "var(--fg)" }}>
                  {fmt(p)}
                </text>
              </m.g>
            );
          })}
          {mode === "sumk" &&
            f.hits.map((j) => (
              <line key={`hit-${j}`} x1={bx(j)} y1={py(P[j])} x2={bx(f.i + 1)} y2={py(P[f.i + 1])} stroke="var(--good)" strokeWidth={1.4} strokeDasharray="2 3" />
            ))}

          {mode === "range" && n > 0 && (
            <g>
              <line x1={bx(a)} x2={bx(n) + 20} y1={py(P[a])} y2={py(P[a])} stroke="var(--k-client)" strokeDasharray="3 3" opacity={0.7} />
              <line x1={bx(b)} x2={bx(n) + 20} y1={py(P[b])} y2={py(P[b])} stroke="var(--accent)" strokeDasharray="3 3" opacity={0.7} />
              <m.line x1={bx(n) + 20} x2={bx(n) + 20} initial={false} animate={{ y1: py(P[a]), y2: py(P[b]) }} transition={{ duration: dur }} stroke="var(--fg)" strokeWidth={2} />
              <m.g initial={false} animate={{ y: (py(P[a]) + py(P[b])) / 2 + 4 }} transition={{ duration: dur }}>
                <text x={bx(n) + 25} style={{ fontSize: 12.5, fontWeight: 800 }}>= {fmt(rangeSum(P, l, r))}</text>
              </m.g>
            </g>
          )}

          {nums.map((v, i) => {
            const inRange = mode === "range" ? i >= l && i <= r : f.hits.some((j) => i >= j && i <= f.i);
            const cur = mode === "sumk" && i === f.i;
            return (
              <g key={`cell-${i}`} transform={`translate(${bx(i) + 2} ${CELL_Y})`}>
                <rect width={cw - 4} height={24} rx={5} style={{ fill: inRange ? "color-mix(in srgb, var(--accent-2) 16%, var(--card))" : "var(--card)" }} stroke={cur ? "var(--accent)" : inRange ? "var(--accent-2)" : "var(--border-strong)"} strokeWidth={cur || inRange ? 1.8 : 1.1} />
                <text x={(cw - 4) / 2} y={16} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700 }}>{fmt(v)}</text>
                <text x={(cw - 4) / 2} y={36} textAnchor="middle" className="muted-text" style={{ fontSize: 9.5 }}>{i}</text>
              </g>
            );
          })}

          {mode === "sumk" && (
            <g transform={wide ? `translate(${RX} ${TOP + 4})` : `translate(${Math.max(X0, (W - 7 * 46) / 2)} ${CELL_Y + 66})`}>
              <text y={-7} className="muted-text" style={{ fontSize: 10.5 }}>map: prefix sum × times seen</text>
              {f.seen.map(([p, c], j) => {
                const asked = p === f.need;
                const per = wide ? 3 : 7;
                const cw2 = wide ? 44 : 42;
                return (
                  <m.g key={`seen-${p}`} initial={reduce ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1, x: (j % per) * (cw2 + (wide ? 6 : 4)), y: Math.floor(j / per) * 26 }} transition={{ duration: dur }}>
                    <rect width={cw2} height={21} rx={10} fill={asked ? "color-mix(in srgb, var(--good) 20%, var(--card))" : "var(--card-2)"} stroke={asked ? "var(--good)" : "var(--border-strong)"} strokeWidth={asked ? 2 : 1} />
                    <text x={cw2 / 2} y={14.5} textAnchor="middle" style={{ fontSize: wide ? 11 : 10.5, fontWeight: 700 }}>{fmt(p)}×{c}</text>
                  </m.g>
                );
              })}
            </g>
          )}
          {!wide ? null : mode === "sumk" ? (
            <text x={RX} y={CELL_Y + 22} className="muted-text" style={{ fontSize: 12 }}>
              k = <tspan style={b750}>{fmt(k)}</tspan>: found <tspan style={b750}>{f.total}</tspan> · <tspan style={b750}>{f.i + 1}</tspan> {f.i === 0 ? "lookup" : "lookups"}
              <tspan x={RX} dy={16}>
                brute force <tspan style={b750}>{(n * (n + 1)) / 2}</tspan> subarrays
              </tspan>
            </text>
          ) : (
            <g className="muted-text" style={{ fontSize: 12 }}>
              <text x={RX} y={TOP + 2}>
                work after <tspan style={b750}>{rs.queries}</tspan> {rs.queries === 1 ? "query" : "queries"}
              </text>
              <text x={RX} y={TOP + 32}>
                prefix: <tspan style={b750}>{n}</tspan> to build + <tspan style={b750}>{rs.queries}</tspan>
              </text>
              <rect x={RX} y={TOP + 39} width={148} height={9} rx={4.5} fill="var(--card-2)" stroke="var(--border)" />
              <m.rect x={RX} y={TOP + 39} height={9} rx={4.5} fill="var(--accent)" initial={false} animate={{ width: Math.max(4, (148 * (n + rs.queries)) / work) }} transition={{ duration: dur }} />
              <text x={RX} y={TOP + 72}>
                loop: <tspan style={b750}>{rs.loopAdds}</tspan> numbers added
              </text>
              <rect x={RX} y={TOP + 79} width={148} height={9} rx={4.5} fill="var(--card-2)" stroke="var(--border)" />
              <m.rect x={RX} y={TOP + 79} height={9} rx={4.5} fill="var(--accent-2)" initial={false} animate={{ width: Math.max(rs.loopAdds ? 4 : 0, (148 * rs.loopAdds) / work) }} transition={{ duration: dur }} />
            </g>
          )}
        </svg>
        {!wide && (
          <div className="muted" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 12px", fontSize: 13, lineHeight: 1.5, margin: "4px 0 0" }}>
            {mode === "sumk" ? (
              <>
                <span>
                  k = <b style={{ color: "var(--fg)" }}>{fmt(k)}</b>: found <b style={{ color: "var(--fg)" }}>{f.total}</b>
                </span>
                <span>
                  <b style={{ color: "var(--fg)" }}>{f.i + 1}</b> {f.i === 0 ? "lookup" : "lookups"}
                </span>
                <span>
                  brute force <b style={{ color: "var(--fg)" }}>{(n * (n + 1)) / 2}</b>
                </span>
              </>
            ) : (
              <>
                <span>
                  <b style={{ color: "var(--fg)" }}>{rs.queries}</b> {rs.queries === 1 ? "query" : "queries"}
                </span>
                <span>
                  prefix <b style={{ color: "var(--fg)" }}>{n}</b> + <b style={{ color: "var(--fg)" }}>{rs.queries}</b>
                </span>
                <span>
                  loop <b style={{ color: "var(--fg)" }}>{rs.loopAdds}</b> added
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} />
      </p>
      <More label={mode === "range" ? "Your numbers and range" : "Your numbers and k"}>
        <div className="controls">
          <label className="control" htmlFor={`${uid}n`} style={{ minWidth: 160, maxWidth: 320 }}>
            <span>Numbers (−20…20, up to {MAX_NUMS})</span>
            <input id={`${uid}n`} type="text" value={text} autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); setIdx(0); }} />
          </label>
          {mode === "range" ? (
            <>
              <Slider label="From l" value={l} min={0} max={Math.max(0, n - 1)} onChange={(v) => setRs(query({ ...rs, l, r }, v, Math.max(v, r)))} />
              <Slider label="To r" value={r} min={0} max={Math.max(0, n - 1)} onChange={(v) => setRs(query({ ...rs, l, r }, Math.min(l, v), v))} />
            </>
          ) : (
            <Slider label="k" value={k} min={-10} max={15} onChange={(v) => { setK(v); setIdx(0); }} />
          )}
        </div>
      </More>
    </WidgetFrame>
  );
}

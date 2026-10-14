"use client";
import { useCallback, useState } from "react";
import { m } from "motion/react";
import { useFixedStep } from "@/lib/sim-loop";
import { useBoxWidth } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- LCS and edit distance tables (pure, tested)
export type Mode = "lcs" | "edit";
export type Dir = "diag" | "up" | "left";
export const MAX_LEN = 8;
export const PRESETS: Record<Mode, [string, string]> = { lcs: ["CLOUD", "COLD"], edit: ["KITTEN", "SITTING"] };
export const ARROW: Record<Dir, string> = { diag: "↖", up: "↑", left: "←" };
type Table = (number | null)[][];

/** Row 0 and column 0 are the empty prefix: LCS 0, or i + j edits (insert or delete everything). */
export const baseValue = (mode: Mode, i: number, j: number) => (mode === "lcs" ? 0 : i + j);

export interface Option {
  dir: Dir;
  value: number;
  /** LCS may only step diagonally (+1) when the two letters match. */
  legal: boolean;
  name: string;
}

/** The three neighbours cell (i, j) can come from, with what each would give. */
export function options(a: string, b: string, mode: Mode, dp: Table, i: number, j: number): Option[] {
  const same = a[i - 1] === b[j - 1];
  const d = dp[i - 1][j - 1] ?? 0;
  const u = dp[i - 1][j] ?? 0;
  const l = dp[i][j - 1] ?? 0;
  if (mode === "lcs")
    return [
      { dir: "diag", value: d + 1, legal: same, name: "match + 1" },
      { dir: "up", value: u, legal: true, name: `drop ${a[i - 1]}` },
      { dir: "left", value: l, legal: true, name: `drop ${b[j - 1]}` },
    ];
  return [
    { dir: "diag", value: same ? d : d + 1, legal: true, name: same ? "keep, free" : "replace + 1" },
    { dir: "up", value: u + 1, legal: true, name: "delete + 1" },
    { dir: "left", value: l + 1, legal: true, name: "insert + 1" },
  ];
}

/** LCS keeps the largest legal option, edit distance the cheapest. */
export const bestOf = (opts: Option[], mode: Mode) => {
  const v = opts.filter((o) => o.legal).map((o) => o.value);
  return mode === "lcs" ? Math.max(...v) : Math.min(...v);
};
/** The arrow drawn in a cell: the first winning option, preferring the diagonal. */
export const winner = (opts: Option[], mode: Mode): Dir => opts.find((o) => o.legal && o.value === bestOf(opts, mode))!.dir;

export function emptyTable(a: string, b: string, mode: Mode): Table {
  return Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 || j === 0 ? baseValue(mode, i, j) : null)));
}

export function fillTable(a: string, b: string, mode: Mode): number[][] {
  const dp = emptyTable(a, b, mode);
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = bestOf(options(a, b, mode, dp, i, j), mode);
  return dp as number[][];
}

export interface Walk {
  cells: [number, number][];
  /** LCS: the common letters. Edit: one entry per column of the alignment ("keep K", "K→S", "−E", "+G"). */
  ops: string[];
  notes: string[];
}

/** Walk back from the corner, following a neighbour that explains each value. */
export function walkBack(a: string, b: string, mode: Mode, dp: Table): Walk {
  let i = a.length;
  let j = b.length;
  const cells: [number, number][] = [[i, j]];
  const ops: string[] = [];
  const notes: string[] = [];
  const v = (r: number, c: number) => dp[r][c] ?? 0;
  while (mode === "lcs" ? i > 0 && j > 0 : i > 0 || j > 0) {
    const same = i > 0 && j > 0 && a[i - 1] === b[j - 1];
    if (mode === "lcs") {
      if (same) {
        ops.unshift(a[i - 1]);
        notes.push(`${a[i - 1]} matches: step diagonally and keep it.`);
        i--;
        j--;
      } else if (v(i - 1, j) >= v(i, j - 1)) {
        notes.push(`${a[i - 1]} ≠ ${b[j - 1]}: up is at least as big as left, so drop ${a[i - 1]}.`);
        i--;
      } else {
        notes.push(`${a[i - 1]} ≠ ${b[j - 1]}: left is bigger, so drop ${b[j - 1]}.`);
        j--;
      }
    } else if (same && v(i, j) === v(i - 1, j - 1)) {
      ops.unshift(`keep ${a[i - 1]}`);
      notes.push(`${a[i - 1]} = ${b[j - 1]}: keep it for free.`);
      i--;
      j--;
    } else if (i > 0 && j > 0 && v(i, j) === v(i - 1, j - 1) + 1) {
      ops.unshift(`${a[i - 1]}→${b[j - 1]}`);
      notes.push(`Replace ${a[i - 1]} with ${b[j - 1]}.`);
      i--;
      j--;
    } else if (i > 0 && v(i, j) === v(i - 1, j) + 1) {
      ops.unshift(`−${a[i - 1]}`);
      notes.push(`Delete ${a[i - 1]}.`);
      i--;
    } else {
      ops.unshift(`+${b[j - 1]}`);
      notes.push(`Insert ${b[j - 1]}.`);
      j--;
    }
    cells.push([i, j]);
  }
  return { cells, ops, notes };
}

/** Calls made by plain recursion (no memo) from (m, n): a match recurses once; a mismatch twice (LCS) or three times (edit). */
export function naiveCalls(a: string, b: string, mode: Mode): number {
  const c = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(1));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) c[i][j] = 1 + c[i - 1][j - 1];
      else c[i][j] = 1 + c[i - 1][j] + c[i][j - 1] + (mode === "edit" ? c[i - 1][j - 1] : 0);
    }
  return c[a.length][b.length];
}

/** Letters only, upper-cased, 1 to 8 of them. */
export const cleanWord = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, MAX_LEN);

export type Phase = "fill" | "trace" | "done";
export interface Lab {
  a: string;
  b: string;
  mode: Mode;
  dp: Table;
  arrows: (Dir | null)[][];
  /** Inner cells filled so far, row by row. */
  k: number;
  phase: Phase;
  walk: Walk | null;
  /** Cells of the walk shown so far. */
  w: number;
  last: [number, number] | null;
  right: number;
  miss: number;
  /** Why the reader's last move was wrong, or null. */
  oops: string | null;
  steps: number;
  acc: number;
}

export const cellAt = (s: Pick<Lab, "b" | "k">): [number, number] => [1 + Math.floor(s.k / s.b.length), 1 + (s.k % s.b.length)];

export function initLab(a: string, b: string, mode: Mode): Lab {
  const s: Lab = { a, b, mode, dp: emptyTable(a, b, mode), arrows: emptyTable(a, b, mode).map((r) => r.map(() => null)), k: 0, phase: "fill", walk: null, w: 0, last: null, right: 0, miss: 0, oops: null, steps: 0, acc: 0 };
  return a.length && b.length ? s : startWalk(s);
}

function startWalk(s: Lab): Lab {
  const walk = walkBack(s.a, s.b, s.mode, s.dp);
  return { ...s, phase: walk.cells.length > 1 ? "trace" : "done", walk, w: 1 };
}

function fill(s: Lab, mine: boolean): Lab {
  const [i, j] = cellAt(s);
  const opts = options(s.a, s.b, s.mode, s.dp, i, j);
  const dp = s.dp.map((r) => [...r]);
  const arrows = s.arrows.map((r) => [...r]);
  dp[i][j] = bestOf(opts, s.mode);
  arrows[i][j] = winner(opts, s.mode);
  const next: Lab = { ...s, dp, arrows, k: s.k + 1, last: [i, j], oops: null, right: s.right + (mine ? 1 : 0), steps: s.steps + 1 };
  return next.k === s.a.length * s.b.length ? startWalk(next) : next;
}

/** One automatic move: fill the next cell, or show one more cell of the walk back. */
export function stepLab(s: Lab): Lab {
  if (s.phase === "fill") return fill(s, false);
  if (s.phase === "trace") {
    const w = s.w + 1;
    return { ...s, w, last: null, oops: null, phase: w >= s.walk!.cells.length ? "done" : "trace", steps: s.steps + 1 };
  }
  return s;
}

/** The reader picks the neighbour for the next cell. Right: the cell fills. Wrong: a miss, with the reason. */
export function guess(s: Lab, dir: Dir): Lab {
  if (s.phase !== "fill") return s;
  const [i, j] = cellAt(s);
  const opts = options(s.a, s.b, s.mode, s.dp, i, j);
  const o = opts.find((x) => x.dir === dir)!;
  const best = bestOf(opts, s.mode);
  if (o.legal && o.value === best) return fill(s, true);
  const top = opts.find((x) => x.legal && x.value === best)!;
  const oops = !o.legal
    ? `${s.a[i - 1]} and ${s.b[j - 1]} differ, so there is no diagonal + 1.`
    : `${ARROW[dir]} gives ${o.value}, but ${ARROW[top.dir]} gives ${best}: ${s.mode === "lcs" ? "keep the largest" : "take the cheapest"}.`;
  return { ...s, miss: s.miss + 1, oops, steps: s.steps + 1 };
}

export function tickLab(s: Lab, dt: number): Lab {
  if (s.phase === "done") return s;
  const acc = s.acc + dt;
  return acc >= (s.phase === "fill" ? 600 : 500) ? { ...stepLab(s), acc: 0 } : { ...s, acc };
}

/** The latest move as a sentence. */
export function describe(s: Lab): string {
  const { a, b, mode } = s;
  if (s.oops) return `Not quite: ${s.oops}`;
  if (s.phase === "done" && s.walk) {
    const ans = s.dp[a.length][b.length];
    if (mode === "lcs") return `Longest common subsequence of ${a} and ${b}: ${s.walk.ops.join("") || "none"}, length ${ans}.`;
    const edits = s.walk.ops.filter((o) => !o.startsWith("keep"));
    return `${a} becomes ${b} in ${ans} edit${ans === 1 ? "" : "s"}${edits.length ? `: ${edits.join(", ")}` : ""}.`;
  }
  if (s.phase === "trace" && s.w > 1) return `Walk back: ${s.walk!.notes[s.w - 2]}`;
  if (!s.last) return `Row 0 and column 0 are the empty prefix (${mode === "lcs" ? "LCS 0" : "i or j edits"}). Pick the move for the dashed cell, or press Run.`;
  const [i, j] = s.last;
  const opts = options(a, b, mode, s.dp, i, j);
  const [d, u, l] = opts;
  const v = s.dp[i][j];
  const same = a[i - 1] === b[j - 1];
  if (mode === "lcs") return same ? `dp[${i}][${j}]: ${a[i - 1]} = ${b[j - 1]}, a match: diagonal ${d.value - 1} + 1 = ${v}.` : `dp[${i}][${j}]: ${a[i - 1]} ≠ ${b[j - 1]}: the larger of up (${u.value}) and left (${l.value}) is ${v}.`;
  return same ? `dp[${i}][${j}]: ${a[i - 1]} = ${b[j - 1]}: copy the diagonal for free, ${v}.` : `dp[${i}][${j}]: ${a[i - 1]} ≠ ${b[j - 1]}: cheapest of replace ${d.value}, delete ${u.value}, insert ${l.value} is ${v}.`;
}

// ---------------------------------------------------------------- drawing

const CW = 46;
const CH = 38;
const HW = 34;
const HH = 30;
const tint = (v: string, p: number) => ({ fill: `color-mix(in srgb, ${v} ${p}%, var(--card))` });
const src = (i: number, j: number, d: Dir): [number, number] => (d === "diag" ? [i - 1, j - 1] : d === "up" ? [i - 1, j] : [i, j - 1]);

function Grid({ s, reduce, narrow }: { s: Lab; reduce: boolean; narrow: boolean }) {
  const { a, b } = s;
  const W = HW + (b.length + 1) * CW + 4;
  const H = HH + (a.length + 1) * CH + 4;
  const k = narrow ? 1.25 : 1;
  const cx = (j: number) => HW + j * CW + CW / 2;
  const cy = (i: number) => HH + i * CH + CH / 2;
  const next = s.phase === "fill" ? cellAt(s) : null;
  const focus = next ?? s.last;
  const reads = next ? [src(...next, "diag"), src(...next, "up"), src(...next, "left")] : [];
  const path = s.walk ? s.walk.cells.slice(0, s.w) : [];
  const onPath = (i: number, j: number) => path.some(([r, c]) => r === i && c === j);
  const keepRows = new Set<number>();
  const keepCols = new Set<number>();
  path.forEach(([i, j], n) => {
    const to = path[n + 1];
    if (to && to[0] === i - 1 && to[1] === j - 1 && a[i - 1] === b[j - 1]) {
      keepRows.add(i);
      keepCols.add(j);
    }
  });
  const label = `${s.mode === "lcs" ? "LCS" : "Edit distance"} table for ${a} (rows) and ${b} (columns), ${s.k} of ${a.length * b.length} cells filled.${s.phase === "done" ? ` Answer ${s.dp[a.length][b.length]}.` : ""}`;
  const cells = s.dp.flatMap((row, i) =>
    row.map((v, j) => {
      const cur = !!next && next[0] === i && next[1] === j;
      const just = !!s.last && s.last[0] === i && s.last[1] === j;
      const read = reads.some(([r, c]) => r === i && c === j);
      const lit = onPath(i, j);
      const style = lit ? tint("var(--good)", 22) : just ? tint("var(--accent)", 20) : read ? tint("var(--k-client)", 13) : { fill: i === 0 || j === 0 ? "var(--card-2)" : "var(--card)" };
      return { i, j, v, cur, just, read, lit, style };
    }),
  );
  const head = (on: boolean, match: boolean, kept: boolean) => ({ fontSize: 15 * k, fontWeight: 750, fill: kept ? "var(--good-ink)" : on ? (match ? "var(--accent)" : "var(--k-client)") : "var(--fg)" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label}>
      {["∅", ...b].map((ch, j) => (
        <text key={`c${j}`} x={cx(j)} y={HH - 9} textAnchor="middle" style={head(!!focus && focus[1] === j && j > 0, !!focus && a[focus[0] - 1] === ch, keepCols.has(j))}>
          {ch}
        </text>
      ))}
      {["∅", ...a].map((ch, i) => (
        <text key={`r${i}`} x={HW / 2} y={cy(i) + 5} textAnchor="middle" style={head(!!focus && focus[0] === i && i > 0, !!focus && b[focus[1] - 1] === ch, keepRows.has(i))}>
          {ch}
        </text>
      ))}
      {cells.map(({ i, j, cur, just, read, lit, style }) => (
        <rect key={`${i},${j}`} x={HW + j * CW + 2} y={HH + i * CH + 2} width={CW - 4} height={CH - 4} rx={7} style={style} stroke={lit ? "var(--good)" : cur || just ? "var(--accent)" : read ? "var(--k-client)" : "var(--border)"} strokeWidth={cur || just || lit || read ? 2 : 1} strokeDasharray={cur ? "4 3" : undefined} />
      ))}
      {path.length > 1 && <polyline points={path.map(([i, j]) => `${cx(j)},${cy(i)}`).join(" ")} fill="none" stroke="var(--good)" strokeWidth={2.4} strokeOpacity={0.6} strokeLinejoin="round" />}
      {s.last &&
        (() => {
          const [i, j] = s.last;
          const [r, c] = src(i, j, s.arrows[i][j]!);
          return <m.line key={`${i},${j}`} x1={cx(c)} y1={cy(r)} x2={cx(j)} y2={cy(i)} stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.3 }} />;
        })()}
      {cells.map(({ i, j, v, cur, lit, style }) => {
        const arrow = s.arrows[i][j];
        // a halo in the cell's own colour keeps the path line from striking through the number
        const halo = { stroke: style.fill, strokeWidth: 6, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
        return (
          <g key={`${i},${j}`}>
            {arrow && !narrow && (
              <text x={HW + j * CW + 7} y={HH + i * CH + 15} style={{ fontSize: 10.5, fill: lit ? "var(--good-ink)" : "var(--muted)", ...halo, strokeWidth: 3 }}>
                {ARROW[arrow]}
              </text>
            )}
            {v !== null ? (
              <m.g key={v} initial={reduce || i === 0 || j === 0 ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduce ? 0 : 0.25 }}>
                <text x={cx(j) + (arrow && !narrow ? 4 : 0)} y={cy(i) + 6 * k} textAnchor="middle" style={{ fontSize: 16 * k, fontWeight: lit ? 800 : 650, fontVariantNumeric: "tabular-nums", ...halo }}>
                  {v}
                </text>
              </m.g>
            ) : (
              cur && (
                <text x={cx(j)} y={cy(i) + 6 * k} textAnchor="middle" style={{ fontSize: 16 * k, fontWeight: 750, fill: "var(--accent)" }}>
                  ?
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The table never draws taller than this (px), so long words shrink it instead of pushing the controls off screen. */
const MAX_TABLE_PX = 300;
const MAX_TABLE_PX_PHONE = 196;

export function Dp2dLab() {
  const [mode, setMode] = useState<Mode>("lcs");
  const [wa, setWa] = useState(PRESETS.lcs[0]);
  const [wb, setWb] = useState(PRESETS.lcs[1]);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const width = useBoxWidth(ref) ?? 0;
  const step = useCallback((st: Lab, dt: number) => tickLab(st, dt * speed), [speed]);
  const [s, reset] = useFixedStep<Lab>(() => initLab(PRESETS.lcs[0], PRESETS.lcs[1], "lcs"), step, running && inView && !reduce, 50);
  const done = s.phase === "done";
  const tableW = HW + (s.b.length + 1) * CW + 4;
  const tableH = HH + (s.a.length + 1) * CH + 4;
  /** Wide (desktop pane): the moves and the answer sit in a column beside the table. Narrow (phones): under it. */
  const narrow = width > 0 && width < 480;
  const load = (a: string, b: string, md: Mode, run = false) => {
    reset(initLab(a, b, md));
    setRunning(run);
  };
  const setWord = (which: "a" | "b", raw: string) => {
    const w = cleanWord(raw);
    if (which === "a") setWa(w);
    else setWb(w);
    const [a, b] = which === "a" ? [w, wb] : [wa, w];
    if (a && b) load(a, b, mode);
  };
  const next = s.phase === "fill" ? cellAt(s) : null;
  const opts = next ? options(s.a, s.b, s.mode, s.dp, ...next) : [];
  const ok = !!wa && !!wb;
  const said = useThrottled(ok ? describe(s) : "Type at least one letter in each word.", 500);
  const area = s.a.length * s.b.length;
  const tableMax = Math.min(tableW * 1.2, (MAX_TABLE_PX / tableH) * tableW);
  const tableWidth = narrow ? Math.min(width, (MAX_TABLE_PX_PHONE / tableH) * tableW) : Math.min(tableMax, Math.max(0, width - 188));

  return (
    <WidgetFrame title="DP table lab" sub="Two words, one table. Each cell reads its diagonal, up and left neighbours. Pick the right one, or press Run, then watch the walk back spell the answer.">
      <div className="controls" style={{ alignItems: "center", columnGap: 10 }}>
        <Seg<Mode> labelMode="hidden"
          label="Problem"
          value={mode}
          onChange={(md) => {
            setMode(md);
            load(s.a, s.b, md);
          }}
          options={[
            { value: "lcs", label: "LCS" },
            { value: "edit", label: "Edit distance" },
          ]}
        />
        {(["a", "b"] as const).map((w) => (
          <label key={w} className="control" style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "0 1 106px" }}>
            <span title={w === "a" ? "Word A: the rows" : "Word B: the columns"}>{w === "a" ? "A" : "B"}</span>
            <input type="text" value={w === "a" ? wa : wb} onChange={(e) => setWord(w, e.target.value)} aria-label={`Word ${w === "a" ? "A (rows)" : "B (columns)"}`} aria-invalid={!(w === "a" ? wa : wb)} maxLength={MAX_LEN} spellCheck={false} autoComplete="off" style={{ width: "100%", minWidth: 0, padding: "0 6px" }} />
          </label>
        ))}
        <SimButtons
          running={running && !done && !reduce}
          reduce={reduce}
          onToggle={() => (done ? load(s.a, s.b, s.mode, true) : setRunning(!running))}
          onStep={() => (done ? load(s.a, s.b, s.mode) : reset(stepLab(s)))}
          onReset={() => load(s.a, s.b, s.mode)}
          stepHint={s.phase === "fill" ? "Fill the next cell" : "Walk back one cell"}
        />
      </div>
      <div ref={ref} style={{ display: "flex", flexWrap: narrow ? "wrap" : "nowrap", gap: 12, alignItems: "flex-start", justifyContent: "center" }}>
        <div style={{ flex: "0 1 auto", width: tableWidth || tableMax, maxWidth: "100%" }}>
          {/* drawn below about 0.8 px per unit (phones), the table switches to bigger type */}
          <Grid s={s} reduce={reduce} narrow={width > 0 && tableWidth / tableW < 0.8} />
        </div>
        <div style={{ flex: narrow ? "1 1 100%" : "0 1 176px", minWidth: 0, display: "grid", gap: 6, alignContent: "start" }}>
          {next && (
            <div role="group" aria-label={`Your move for dp[${next[0]}][${next[1]}]`} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 650, flex: narrow ? "1 1 100%" : undefined }}>
                Your move, dp[{next[0]}][{next[1]}] ({s.a[next[0] - 1]} vs {s.b[next[1] - 1]}):
              </span>
              {opts.map((o) => (
                <button key={o.dir} type="button" className="wbtn" onClick={() => reset(guess(s, o.dir))} aria-label={`${ARROW[o.dir]} ${o.dir === "diag" ? "diagonal" : o.dir}: ${o.name}, gives ${o.value}`} style={{ padding: "0 9px", fontSize: 12.5, ...(narrow ? {} : { width: "100%" }) }}>
                  <span aria-hidden style={{ fontSize: 15 }}>{ARROW[o.dir]}</span> {o.name} = {o.value}
                </button>
              ))}
            </div>
          )}
          {done && s.walk && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 650 }}>{s.mode === "lcs" ? "Common letters:" : "Alignment:"}</span>
              {(s.walk.ops.length ? s.walk.ops : ["none"]).map((o, n) => (
                <span key={n} className={`pill ${o.startsWith("keep") || s.mode === "lcs" ? "ok-ink" : "warn-ink"}`}>
                  {o}
                </span>
              ))}
            </div>
          )}
          {s.phase === "trace" && <span className="muted" style={{ fontSize: 13 }}>Walking back from the corner…</span>}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>
        Cells <b style={{ color: "var(--fg)" }}>{s.k}/{area}</b> · plain recursion <b style={{ color: "var(--fg)" }}>{naiveCalls(s.a, s.b, s.mode).toLocaleString("en-US")}</b> calls · your moves <b style={{ color: "var(--fg)" }}>{s.right}</b> right
        {s.miss ? <span className="warn-ink">, {s.miss} missed</span> : null}
      </p>
      <p className={`readout${s.oops ? " warn-ink" : ""}`} aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step or the move buttons." />
      </p>
      <More label="Example words and speed">
        <div className="controls">
          <button
            type="button"
            className="wbtn"
            onClick={() => {
              const [a, b] = PRESETS[mode];
              setWa(a);
              setWb(b);
              load(a, b, mode);
            }}
          >
            Example
          </button>
          {!reduce && <Slider label="Speed" value={speed} min={1} max={4} onChange={setSpeed} format={(v) => `${v}×`} />}
        </div>
      </More>
    </WidgetFrame>
  );
}

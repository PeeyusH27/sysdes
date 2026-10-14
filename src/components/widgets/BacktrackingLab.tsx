"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Lightbulb, RotateCcw, SkipForward } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export type QEvent =
  | { kind: "start" }
  | { kind: "place"; row: number; col: number }
  | { kind: "conflict"; row: number; col: number; by: number }
  | { kind: "backtrack"; row: number; col: number; dead: boolean }
  | { kind: "solution" }
  | { kind: "done" };
export interface QState {
  n: number;
  /** cols[r] = column of the queen in row r: the path, one queen per row. */
  cols: number[];
  /** Next column to try in row cols.length. */
  tryCol: number;
  tried: number;
  backtracks: number;
  solutions: number[][];
  solvedHere: boolean;
  done: boolean;
  last: QEvent;
}

/** Row of the first queen that attacks (row, col), or -1 when the square is safe. */
export function attacker(cols: (number | null)[], row: number, col: number): number {
  for (let r = 0; r < cols.length; r++) {
    const c = cols[r];
    if (r === row || c === null || c === undefined) continue;
    if (c === col || Math.abs(c - col) === Math.abs(row - r)) return r;
  }
  return -1;
}

export const initQueens = (n: number): QState => ({ n, cols: [], tryCol: 0, tried: 0, backtracks: 0, solutions: [], solvedHere: false, done: false, last: { kind: "start" } });

/** One move of the search: record a full board, try one square, or backtrack. */
export function stepQueens(s: QState): QState {
  if (s.done) return s;
  const { n, cols } = s;
  if (cols.length === n && !s.solvedHere) return { ...s, solutions: [...s.solutions, [...cols]], solvedHere: true, last: { kind: "solution" } };
  if (cols.length === n || s.tryCol >= n) {
    if (!cols.length) return { ...s, done: true, last: { kind: "done" } };
    const col = cols[cols.length - 1];
    const rest = cols.slice(0, -1);
    return { ...s, cols: rest, tryCol: col + 1, backtracks: s.backtracks + 1, solvedHere: false, last: { kind: "backtrack", row: rest.length, col, dead: cols.length < n } };
  }
  const row = cols.length;
  const col = s.tryCol;
  const by = attacker(cols, row, col);
  if (by >= 0) return { ...s, tryCol: col + 1, tried: s.tried + 1, last: { kind: "conflict", row, col, by } };
  return { ...s, cols: [...cols, col], tryCol: 0, tried: s.tried + 1, last: { kind: "place", row, col } };
}

export function runUntil(s: QState, stop: (s: QState) => boolean, cap = 1_000_000) {
  let x = s;
  for (let i = 0; i < cap && !x.done; i++) {
    x = stepQueens(x);
    if (stop(x)) break;
  }
  return x;
}
export const nextSolution = (s: QState) => runUntil(s, (x) => x.last.kind === "solution");
export const solveAll = (n: number) => runUntil(initQueens(n), () => false);

/** Your-turn board: board[r] is a column or null. Rows whose queen is attacked by another queen. */
export const clashes = (board: (number | null)[]) => board.flatMap((c, r) => (c !== null && attacker(board, r, c) >= 0 ? [r] : []));
export const reachable = (board: (number | null)[], sols: number[][]) => sols.filter((sol) => board.every((c, r) => c === null || sol[r] === c));
export const toggleQueen = (board: (number | null)[], r: number, c: number) => board.map((x, i) => (i === r ? (x === c ? null : c) : x));

// ---------------------------------------------------------------- view helpers
const BX = 6;
const BY = 26;
const BS = 290;
/**
 * Wide (desktop pane): the board with the call stack beside it, one frame per row, and the counters in a column.
 * Narrow (phones): the board fills the width and the stack is one row of small frames under it.
 */
const WIDE = { W: 440, H: 322, wide: true };
const NARROW = { W: 302, H: BY + BS + 46, wide: false };
type Lay = typeof WIDE;
const SX = 310;
const SW = 124;
const fmt = (x: number) => x.toLocaleString("en-US");
const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const CROWN = "M-11 7 L-13 -6 L-6 0 L0 -10 L6 0 L13 -6 L11 7 Z";

function Queen({ cell, tone }: { cell: number; tone: "ok" | "bad" | "win" }) {
  const k = cell / 38;
  const fill = tone === "bad" ? "var(--critical)" : tone === "win" ? "var(--good)" : "var(--accent)";
  return (
    <g transform={`scale(${k})`}>
      <circle r={15} fill={fill} opacity={0.18} />
      <path d={CROWN} fill={fill} stroke={fill} strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={-11} y={8} width={22} height={4} rx={1.5} fill={fill} />
    </g>
  );
}

function describeWatch(s: QState, total: number) {
  const e = s.last;
  const n = s.n;
  if (e.kind === "start") return `Step places queens row by row, trying columns left to right. A ${n} × ${n} board has ${total} solutions.`;
  if (e.kind === "place") return `Row ${e.row + 1}, column ${e.col + 1} is safe: place a queen and recurse into row ${e.row + 2 > n ? n : e.row + 2}. Depth ${s.cols.length}.`;
  if (e.kind === "conflict") {
    const how = s.cols[e.by] === e.col ? "same column" : "same diagonal";
    return `Row ${e.row + 1}, column ${e.col + 1} is attacked by the queen in row ${e.by + 1} (${how}). Pruned: try the next column.`;
  }
  if (e.kind === "backtrack")
    return e.dead
      ? `Row ${e.row + 2} has no safe square. Backtrack: lift the queen from row ${e.row + 1}, column ${e.col + 1}, and try further right.`
      : `Backtrack from the solution: lift the queen from row ${e.row + 1} and keep searching.`;
  if (e.kind === "solution") return `Solution ${s.solutions.length}: ${n} queens, none attacking. Record a copy, then backtrack for more.`;
  return `Search complete: ${s.solutions.length} solutions after ${fmt(s.tried)} squares tried. Brute force checks ${fmt(n ** n)} boards.`;
}

function describePlay(board: (number | null)[], sols: number[][]) {
  const placed = board.filter((c) => c !== null).length;
  const bad = clashes(board);
  if (!placed) return `Click a square to place a queen, one per row. Dots mark squares a queen attacks. ${sols.length} solutions exist.`;
  const rows = bad.map((r) => r + 1);
  if (bad.length) return `Clash: the queens in rows ${rows.slice(0, -1).join(", ")} and ${rows.at(-1)} attack each other. Move one.`;
  if (placed === board.length) return `Solved: ${placed} queens, none attacking.`;
  const left = reachable(board, sols).length;
  if (!left) return `${placed} queens, no clashes yet, but this is a dead end: no solution keeps them all. Backtrack: move one.`;
  return `${placed} queens, no clashes. ${left} ${left === 1 ? "solution is" : "solutions are"} still reachable from this board.`;
}

// ---------------------------------------------------------------- widget
export function BacktrackingLab() {
  const [n, setN] = useState(6);
  const [mode, setMode] = useState<"watch" | "play">("watch");
  const [speed, setSpeed] = useState(4);
  const [running, setRunning] = useState(false);
  const [board, setBoard] = useState<(number | null)[]>(() => Array(6).fill(null));
  const [focus, setFocus] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L: Lay = useNarrow(ref, 480) ? NARROW : WIDE;

  const step = useCallback((s: QState) => stepQueens(s), []);
  const [st, reset] = useFixedStep<QState>(() => initQueens(6), step, running && inView && !reduce && mode === "watch", 1000 / speed);
  const all = useMemo(() => solveAll(n).solutions, [n]);
  const play = mode === "play";
  const cell = BS / n;
  const cx = (c: number) => BX + c * cell + cell / 2;
  const cy = (r: number) => BY + r * cell + cell / 2;
  /** Stack frame r: a row beside the board (wide), or a small frame in the row under it (narrow). */
  const frame = (r: number) => (L.wide ? { x: SX, y: BY + r * cell + 3, w: SW, h: cell - 6 } : { x: BX + r * cell + 2, y: BY + BS + 12, w: cell - 4, h: 28 });

  const restart = (size = n) => {
    setRunning(false);
    reset(initQueens(size));
    setBoard(Array(size).fill(null));
  };
  const queens: (number | null)[] = play ? board : st.cols;
  const e = st.last;
  const bad = new Set(play ? clashes(board) : []);
  const solved = play ? board.every((c) => c !== null) && !bad.size : e.kind === "solution";
  const fromRow = play ? 0 : st.cols.length;
  const hit = (r: number, c: number) => r >= fromRow && queens[r] !== c && attacker(queens, r, c) >= 0;
  const hint = () => {
    const sol = reachable(board, all)[0];
    const r = board.findIndex((c) => c === null);
    if (sol && r >= 0) setBoard(toggleQueen(board, r, sol[r]));
  };
  const moveFocus = (i: number) => {
    setFocus(i);
    svgRef.current?.querySelector<SVGRectElement>(`[data-cell="${i}"]`)?.focus();
  };
  const onKey = (ev: React.KeyboardEvent, i: number) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const to: Record<string, number> = { ArrowLeft: c > 0 ? i - 1 : i, ArrowRight: c < n - 1 ? i + 1 : i, ArrowUp: r > 0 ? i - n : i, ArrowDown: r < n - 1 ? i + n : i };
    if (ev.key in to) {
      ev.preventDefault();
      moveFocus(to[ev.key]);
    } else if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      setBoard(toggleQueen(board, r, c));
    }
  };

  const sentence = play ? describePlay(board, all) : describeWatch(st, all.length);
  const said = useThrottled(sentence, 600);
  const label = play
    ? `${n} by ${n} board, your turn. ${
        board
          .map((c, r) => (c === null ? "" : `Row ${r + 1}: column ${c + 1}${bad.has(r) ? " (clash)" : ""}`))
          .filter(Boolean)
          .join(", ") || "No queens yet"
      }.`
    : `${n} by ${n} board. Queens: ${st.cols.map((c, r) => `row ${r + 1} column ${c + 1}`).join(", ") || "none"}. Depth ${st.cols.length} of ${n}. ${st.solutions.length} solutions found.`;
  const tryCell = !play && (e.kind === "conflict" || e.kind === "place") ? e : null;
  const dead = !play && e.kind === "backtrack" && e.dead ? e.row + 1 : -1;
  const stats = play
    ? [
        { k: "Queens", v: `${board.filter((c) => c !== null).length} of ${n}` },
        { k: "Clashes", v: bad.size ? `✕ ${bad.size} rows` : "✓ none" },
        { k: "Solutions", v: `${all.length} exist` },
      ]
    : [
        { k: "Solutions", v: `${st.solutions.length} of ${all.length}` },
        { k: "Squares tried", v: fmt(st.tried) },
        { k: "Backtracks", v: fmt(st.backtracks) },
        { k: "Brute force", v: `${n}${SUP[n]} = ${fmt(n ** n)} boards` },
      ];

  return (
    <WidgetFrame title="N-Queens: choose, explore, un-choose" sub="Place N queens so that none attack each other. Watch backtracking prune its way to every solution, or try it yourself.">
      <div className="controls">
        <Seg<"watch" | "play"> labelMode="hidden"
          label="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            restart();
          }}
          options={[
            { value: "watch", label: "Watch" },
            { value: "play", label: "Your turn" },
          ]}
        />
        {play ? (
          <>
            <button type="button" className="wbtn" onClick={hint}>
              <Lightbulb size={14} aria-hidden /> Hint
            </button>
            <button type="button" className="wbtn" onClick={() => setBoard(Array(n).fill(null))}>
              <RotateCcw size={14} aria-hidden /> Clear board
            </button>
          </>
        ) : (
          <>
            <SimButtons
              running={running && !st.done}
              reduce={reduce}
              onToggle={() => {
                if (st.done) reset(initQueens(n));
                setRunning((r) => !r || st.done);
              }}
              onStep={() => reset(stepQueens(st))}
              stepHint="Try one square or backtrack once"
              onReset={() => restart()}
            />
            <button type="button" className="wbtn" onClick={() => reset(nextSolution(st))} disabled={st.done} aria-label={L.wide ? undefined : "Next solution"} title="Next solution">
              <SkipForward size={14} aria-hidden /> {L.wide ? "Next solution" : null}
            </button>
          </>
        )}
      </div>

      <div ref={ref} style={{ display: "flex", flexWrap: L.wide ? "nowrap" : "wrap", gap: "6px 14px", alignItems: "center", justifyContent: "center" }}>
        <svg ref={svgRef} viewBox={`0 0 ${L.W} ${L.H}`} className="sim-svg" role={play ? "group" : "img"} aria-label={label} style={{ flex: L.wide ? "1 1 440px" : "1 1 100%", maxWidth: L.wide ? 440 : 420, minWidth: 0 }}>
          <text x={BX} y={16} className={solved ? undefined : "muted-text"} style={{ fontSize: 14, fontWeight: solved ? 750 : 400, fill: solved ? "var(--good-ink)" : undefined }}>
            {solved
              ? `✓ ${play ? "Solved" : `Solution ${st.solutions.length}`}${L.wide ? ": no queen attacks another" : ""}`
              : play
                ? L.wide
                  ? "Click a square · arrows + Enter work too"
                  : "Click a square"
                : `Row ${Math.min(st.cols.length + 1, n)} of ${n} · dots = attacked`}
          </text>
          <rect x={BX - 2} y={BY - 2} width={BS + 4} height={BS + 4} rx={6} fill="none" stroke={solved ? "var(--good)" : "var(--border-strong)"} strokeWidth={solved ? 3 : 1.5} />
          {Array.from({ length: n * n }, (_, i) => {
            const r = Math.floor(i / n);
            const c = i % n;
            const isTry = tryCell && tryCell.row === r && tryCell.col === c;
            const fill = isTry && e.kind === "conflict" ? "color-mix(in srgb, var(--critical) 26%, var(--card))" : (r + c) % 2 ? "color-mix(in srgb, var(--fg) 8%, var(--card))" : "var(--card)";
            const q = queens[r] === c;
            return (
              <g key={i}>
                <rect
                  data-cell={i}
                  x={BX + c * cell}
                  y={BY + r * cell}
                  width={cell}
                  height={cell}
                  fill={fill}
                  {...(play
                    ? {
                        role: "button",
                        tabIndex: (focus ?? 0) === i ? 0 : -1,
                        "aria-label": `Row ${r + 1}, column ${c + 1}: ${q ? "queen" : hit(r, c) ? "attacked" : "empty"}`,
                        onClick: () => {
                          setFocus(i);
                          setBoard(toggleQueen(board, r, c));
                        },
                        onKeyDown: (ev: React.KeyboardEvent) => onKey(ev, i),
                        onFocus: () => setFocus(i),
                        style: { cursor: "pointer", outline: "none" },
                      }
                    : {})}
                />
                {hit(r, c) && !isTry && <circle cx={cx(c)} cy={cy(r)} r={Math.max(2.5, cell * 0.08)} fill="var(--muted)" opacity={0.7} pointerEvents="none" />}
              </g>
            );
          })}
          {dead >= 0 && dead < n && (
            <g pointerEvents="none">
              <rect x={BX} y={BY + dead * cell} width={BS} height={cell} fill="color-mix(in srgb, var(--warning) 30%, transparent)" />
              <text x={BX + BS / 2} y={cy(dead) + 5} textAnchor="middle" style={{ fontSize: 13.5, fontWeight: 750, fill: "var(--warning-ink)" }}>
                ⚠ no safe square in row {dead + 1}
              </text>
            </g>
          )}
          {tryCell && e.kind === "conflict" && (
            <g pointerEvents="none">
              <line x1={cx(st.cols[e.by])} y1={cy(e.by)} x2={cx(e.col)} y2={cy(e.row)} stroke="var(--critical)" strokeWidth={2.5} strokeDasharray="5 4" />
              <text x={cx(e.col)} y={cy(e.row) + cell * 0.18} textAnchor="middle" style={{ fontSize: cell * 0.55, fontWeight: 800, fill: "var(--critical-ink)" }}>
                ✕
              </text>
            </g>
          )}
          <AnimatePresence initial={false}>
            {queens.map((c, r) =>
              c === null ? null : (
                <m.g
                  key={`${r}-${c}`}
                  pointerEvents="none"
                  initial={reduce ? false : { x: cx(c), y: cy(r) - cell * 0.7, opacity: 0 }}
                  animate={{ x: cx(c), y: cy(r), opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { y: cy(r) - cell * 0.7, opacity: 0, transition: { duration: 0.3 } }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
                >
                  <Queen cell={cell} tone={bad.has(r) ? "bad" : solved ? "win" : "ok"} />
                </m.g>
              ),
            )}
          </AnimatePresence>
          {play && focus !== null && (
            <rect
              x={BX + (focus % n) * cell + 2}
              y={BY + Math.floor(focus / n) * cell + 2}
              width={cell - 4}
              height={cell - 4}
              rx={4}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
              pointerEvents="none"
            />
          )}

          {/* call stack, one frame per placed row: beside the board, aligned with its rows (wide), or under it (narrow) */}
          <text x={L.wide ? SX : L.W - 2} y={16} textAnchor={L.wide ? "start" : "end"} className="muted-text" style={{ fontSize: 14 }}>
            {play ? (L.wide ? "Queens per row" : "") : L.wide ? `Stack depth ${st.cols.length}/${n}` : `stack ${st.cols.length}/${n}`}
          </text>
          <AnimatePresence initial={false}>
            {queens.map((c, r) => {
              if (c === null) return null;
              const f = frame(r);
              return (
                <m.g
                  key={`f${r}-${c}`}
                  initial={reduce ? false : L.wide ? { x: 30, opacity: 0 } : { y: 20, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { ...(L.wide ? { x: 30 } : { y: 20 }), opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: reduce ? 0 : 0.3 }}
                >
                  <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={6} fill="var(--card)" stroke={bad.has(r) ? "var(--critical)" : "var(--accent)"} />
                  <text x={L.wide ? f.x + 8 : f.x + f.w / 2} y={f.y + f.h / 2 + 4.5} textAnchor={L.wide ? "start" : "middle"} style={{ fontSize: L.wide ? Math.min(13.5, cell * 0.4) : 13, fontWeight: 650 }}>
                    {L.wide ? `row ${r + 1} → col ${c + 1}` : `${r + 1}→${c + 1}`}
                    {bad.has(r) ? " ✕" : ""}
                  </text>
                </m.g>
              );
            })}
          </AnimatePresence>
          {!play && !st.done && st.cols.length < n && (
            <m.g initial={false} animate={L.wide ? { x: 0, y: st.cols.length * cell } : { x: st.cols.length * cell, y: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
              {L.wide ? (
                <>
                  <rect x={SX} y={BY + 3} width={SW} height={cell - 6} rx={6} fill="none" stroke="var(--border-strong)" strokeDasharray="4 3" />
                  <text x={SX + 8} y={BY + cell / 2 + 4.5} className="muted-text" style={{ fontSize: Math.min(13, cell * 0.38) }}>
                    row {st.cols.length + 1}: try col {Math.min(st.tryCol + 1, n)}
                  </text>
                </>
              ) : (
                <>
                  <rect x={BX + 2} y={BY + BS + 12} width={cell - 4} height={28} rx={6} fill="none" stroke="var(--border-strong)" strokeDasharray="4 3" />
                  <text x={BX + cell / 2} y={BY + BS + 30.5} textAnchor="middle" className="muted-text" style={{ fontSize: 12.5 }}>
                    ?{Math.min(st.tryCol + 1, n)}
                  </text>
                </>
              )}
            </m.g>
          )}
        </svg>
        <dl style={{ flex: L.wide ? "0 0 auto" : "1 1 100%", display: "flex", flexDirection: L.wide ? "column" : "row", flexWrap: "wrap", gap: L.wide ? 8 : "2px 14px", margin: 0, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
          {stats.map((x) => (
            <div key={x.k} style={{ display: L.wide ? "block" : "flex", gap: 4 }}>
              <dt className="muted" style={{ fontSize: 12 }}>
                {x.k}
              </dt>
              <dd style={{ margin: 0, fontWeight: 650 }}>{x.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce && !play} what="Reduced motion: no auto-play; use Step or Next solution." />
      </p>
      <More label="Board size and speed">
        <div className="controls">
          <Slider
            label="Board size N"
            value={n}
            min={4}
            max={8}
            onChange={(v) => {
              setN(v);
              restart(v);
            }}
          />
          {!reduce && !play && <Slider label="Steps per second" value={speed} min={1} max={30} onChange={setSpeed} />}
        </div>
      </More>
    </WidgetFrame>
  );
}

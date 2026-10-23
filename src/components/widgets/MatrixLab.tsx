"use client";
import { useMemo, useState } from "react";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export type Grid = number[][];
export const makeGrid = (rows: number, cols: number): Grid => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c + 1));
const copy = (g: Grid): Grid => g.map((row) => row.slice());

export interface RotateFrame {
  grid: Grid;
  phase: "start" | "transpose" | "reverse" | "done";
  /** Cells just changed. */
  hot: [number, number][];
  text: string;
}

/** Rotate clockwise the pattern's way: swap each pair above the diagonal, then reverse every row. One frame per move. */
export function rotateFrames(n: number): RotateFrame[] {
  const g = makeGrid(n, n);
  const frames: RotateFrame[] = [{ grid: copy(g), phase: "start", hot: [], text: "Start. Step 1 mirrors the grid across its main diagonal (transpose); step 2 reverses each row." }];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [g[i][j], g[j][i]] = [g[j][i], g[i][j]];
      frames.push({ grid: copy(g), phase: "transpose", hot: [[i, j], [j, i]], text: `Transpose: swap the cells at (${i}, ${j}) and (${j}, ${i}). Only cells above the diagonal, so no pair is swapped twice.` });
    }
  }
  for (let i = 0; i < n; i++) {
    g[i].reverse();
    frames.push({ grid: copy(g), phase: "reverse", hot: g[i].map((_, c) => [i, c] as [number, number]), text: `Reverse row ${i}. Each row now reads in the opposite order.` });
  }
  frames.push({ grid: copy(g), phase: "done", hot: [], text: "Done: transpose plus reversed rows is a 90 degree clockwise turn, with no second grid." });
  return frames;
}

/** Reference: the cell at (i, j) goes straight to (j, n - 1 - i). */
export function rotateBrute(g: Grid): Grid {
  const n = g.length;
  const out = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j][n - 1 - i] = g[i][j];
  return out;
}

export type Side = "top" | "right" | "bottom" | "left";
export interface SpiralFrame {
  r: number;
  c: number;
  /** 1-based order in which this cell is read. */
  k: number;
  side: Side;
  /** The four walls at the moment this cell is read. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** One frame per cell, using the pattern's four moving walls. */
export function spiralFrames(rows: number, cols: number): SpiralFrame[] {
  const out: SpiralFrame[] = [];
  let top = 0;
  let bottom = rows - 1;
  let left = 0;
  let right = cols - 1;
  const read = (r: number, c: number, side: Side) => out.push({ r, c, k: out.length + 1, side, top, bottom, left, right });
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) read(top, c, "top");
    top++;
    for (let r = top; r <= bottom; r++) read(r, right, "right");
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) read(bottom, c, "bottom");
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) read(r, left, "left");
      left++;
    }
  }
  return out;
}

/** Reference: walk one cell at a time and turn right when the next cell is off the grid or already read. */
export function spiralBrute(rows: number, cols: number): [number, number][] {
  const seen = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  const dr = [0, 1, 0, -1];
  const dc = [1, 0, -1, 0];
  const out: [number, number][] = [];
  let r = 0;
  let c = 0;
  let d = 0;
  for (let k = 0; k < rows * cols; k++) {
    out.push([r, c]);
    seen[r][c] = true;
    const nr = r + dr[d];
    const nc = c + dc[d];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) d = (d + 1) % 4;
    r += dr[d];
    c += dc[d];
  }
  return out;
}

// ---------------------------------------------------------------- picture
type Mode = "rotate" | "spiral";
const SHAPES = { "3x3": [3, 3], "3x4": [3, 4], "4x3": [4, 3], "2x5": [2, 5] } as const;
type ShapeId = keyof typeof SHAPES;
const W = 340;
const H = 262;
const STEP_MS = 800;

interface Sim {
  pos: number;
  total: number;
  acc: number;
}
const stepSim = (s: Sim, dt: number): Sim => {
  if (s.pos >= s.total) return s;
  const acc = s.acc + dt;
  return acc >= STEP_MS ? { ...s, pos: s.pos + 1, acc: 0 } : { ...s, acc };
};

export function MatrixLab() {
  const [mode, setMode] = useState<Mode>("rotate");
  const [size, setSize] = useState<3 | 4 | 5>(3);
  const [shape, setShape] = useState<ShapeId>("3x4");
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();

  const rFrames = useMemo(() => rotateFrames(size), [size]);
  const [rows, cols] = SHAPES[shape];
  const sFrames = useMemo(() => spiralFrames(rows, cols), [rows, cols]);
  const total = mode === "rotate" ? rFrames.length - 1 : sFrames.length;
  const [sim, reset] = useFixedStep<Sim>({ pos: 0, total: rotateFrames(3).length - 1, acc: 0 }, stepSim, running && inView && !reduce);
  const pos = Math.min(sim.pos, total);
  const done = pos >= total;

  const restart = (t: number, keepRunning = true) => {
    reset({ pos: 0, total: t, acc: 0 });
    setRunning(keepRunning);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    restart(m === "rotate" ? rFrames.length - 1 : sFrames.length);
  };

  const R = mode === "rotate" ? size : rows;
  const C = mode === "rotate" ? size : cols;
  const cell = Math.min(52, Math.floor(300 / Math.max(R, C)), Math.floor((H - 62) / R));
  const gx = (W - C * cell) / 2;
  const gy = 40;

  const rf = rFrames[Math.min(pos, rFrames.length - 1)];
  const sf = pos > 0 ? sFrames[pos - 1] : null;
  const visited = new Map<string, number>();
  if (mode === "spiral") sFrames.slice(0, pos).forEach((f) => visited.set(`${f.r},${f.c}`, f.k));

  const sentence =
    mode === "rotate"
      ? rf.text
      : !sf
        ? "Four walls frame the unread cells. Read the top row, then the right column, the bottom row and the left column, moving each wall in after its side."
        : done
          ? `All ${rows * cols} cells read exactly once. The walls crossed, so the loop ended.`
          : `Cell (${sf.r}, ${sf.c}) is number ${sf.k}: the ${sf.side} side. Walls now: top ${sf.top}, bottom ${sf.bottom}, left ${sf.left}, right ${sf.right}.`;
  const said = useThrottled(sentence, 350);
  const phaseLabel = mode === "rotate" ? (rf.phase === "start" ? "Original" : rf.phase === "transpose" ? "Step 1: transpose" : rf.phase === "reverse" ? "Step 2: reverse each row" : "Rotated 90 degrees clockwise") : sf ? `Reading the ${sf.side} side` : "Spiral order";

  const label = mode === "rotate" ? `A ${size} by ${size} grid, ${phaseLabel}. Rows: ${rf.grid.map((r) => r.join(" ")).join(" / ")}.` : `A ${rows} by ${cols} grid read in spiral order; ${pos} of ${rows * cols} cells read.`;

  return (
    <WidgetFrame title="Matrix lab" sub="Rotate a grid in place, or read it in a spiral with four moving walls.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Seg<Mode>
          labelMode="hidden"
          compact
          label="Mode"
          value={mode}
          onChange={changeMode}
          options={[
            { value: "rotate", label: "Rotate" },
            { value: "spiral", label: "Spiral" },
          ]}
        />
        {mode === "rotate" ? (
          <Seg<string>
            labelMode="hidden"
            compact
            label="Grid size"
            value={String(size)}
            onChange={(v) => {
              const n = Number(v) as 3 | 4 | 5;
              setSize(n);
              restart(rotateFrames(n).length - 1);
            }}
            options={[
              { value: "3", label: "3×3" },
              { value: "4", label: "4×4" },
              { value: "5", label: "5×5" },
            ]}
          />
        ) : (
          <Seg<ShapeId>
            labelMode="hidden"
            compact
            label="Grid shape"
            value={shape}
            onChange={(v) => {
              setShape(v);
              restart(spiralFrames(SHAPES[v][0], SHAPES[v][1]).length);
            }}
            options={[
              { value: "3x3", label: "3×3" },
              { value: "3x4", label: "3×4" },
              { value: "4x3", label: "4×3" },
              { value: "2x5", label: "2×5" },
            ]}
          />
        )}
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (done) restart(total);
            else setRunning((r) => !r);
          }}
          onStep={() => reset({ pos: Math.min(pos + 1, total), total, acc: 0 })}
          stepHint={mode === "rotate" ? "Do the next swap or row reversal" : "Read the next cell"}
          onReset={() => restart(total, false)}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: 520, margin: "0 auto" }}>
          <text x={10} y={22} style={{ fontSize: 13.5, fontWeight: 750 }}>
            {phaseLabel}
          </text>
          {mode === "spiral" && sf && !done && (
            <rect x={gx + sf.left * cell - 2} y={gy + sf.top * cell - 2} width={(sf.right - sf.left + 1) * cell + 4} height={(sf.bottom - sf.top + 1) * cell + 4} rx={6} fill="none" stroke="var(--accent-2)" strokeWidth={2} strokeDasharray="5 4" />
          )}
          {Array.from({ length: R }, (_, r) =>
            Array.from({ length: C }, (_, c) => {
              const x = gx + c * cell;
              const y = gy + r * cell;
              let fill = "var(--card)";
              let stroke = "var(--border-strong)";
              let sw = 1.2;
              let text: string | number = "";
              if (mode === "rotate") {
                text = rf.grid[r][c];
                const hot = rf.hot.some(([hr, hc]) => hr === r && hc === c);
                if (hot) {
                  fill = rf.phase === "reverse" ? "color-mix(in srgb, var(--good) 18%, var(--card))" : "color-mix(in srgb, var(--accent) 16%, var(--card))";
                  stroke = rf.phase === "reverse" ? "var(--good)" : "var(--accent)";
                  sw = 2.2;
                }
              } else {
                const k = visited.get(`${r},${c}`);
                const isNow = sf && sf.r === r && sf.c === c;
                text = k ?? "";
                if (k) fill = "color-mix(in srgb, var(--good) 14%, var(--card))";
                if (isNow) {
                  fill = "color-mix(in srgb, var(--accent) 22%, var(--card))";
                  stroke = "var(--accent)";
                  sw = 2.4;
                }
              }
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x + 1.5} y={y + 1.5} width={cell - 3} height={cell - 3} rx={7} fill={fill} stroke={stroke} strokeWidth={sw} />
                  <text x={x + cell / 2} y={y + cell / 2 + 5} textAnchor="middle" style={{ fontSize: cell > 40 ? 16 : 14, fontWeight: 750, fontFamily: "var(--font-mono)" }}>
                    {text}
                  </text>
                </g>
              );
            }),
          )}
          <text x={10} y={H - 8} className="muted-text" style={{ fontSize: 11.5 }}>
            {mode === "rotate" ? `step ${pos} of ${total}` : `${pos} of ${rows * cols} cells read`}
          </text>
        </svg>
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step." />
      </p>
    </WidgetFrame>
  );
}

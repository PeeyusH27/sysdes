import { arr, defineTrace, grid, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

type Cell = [number, number, Tone];
const copy = (m: number[][]) => m.map((r) => r.slice());
const rectangular = (m: number[][]) => m.length > 0 && m.every((r) => r.length === m[0].length && r.length > 0);

export const rotateImage = defineTrace({
  id: "rotate-transpose-reverse",
  title: "Rotate 90 degrees clockwise: transpose, then reverse every row",
  description: "Swapping each pair of cells across the main diagonal transposes the grid in place, and reversing each row afterwards turns the transpose into a clockwise quarter turn.",
  code: `
function rotate(m) {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {         //@pairs
      [m[i][j], m[j][i]] = [m[j][i], m[i][j]]; //@swap
    }
  }
  for (const row of m) row.reverse();         //@reverse
}`,
  presets: [
    { label: "3 by 3", input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] } },
    { label: "4 by 4", input: { matrix: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]] } },
  ],
  fields: { matrix: { maxItems: 5, maxRow: 5, min: 0, max: 99, help: "A square grid: one row per line, numbers separated by spaces (up to 5 by 5)." } },
  validate: ({ matrix }) => (!rectangular(matrix) || matrix.length !== matrix[0].length) && "The grid must be square: as many rows as columns.",
  run(t, { matrix }) {
    const m = copy(matrix);
    const n = m.length;
    const g = (tones: Cell[] = []) => grid("matrix", m, { tones });
    t.step("pairs", `Rotating a grid in place sounds hard, so split it in two easy moves. First transpose: swap every cell above the diagonal with its mirror across it.`, { views: [g()], vars: { n } });
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        t.step("swap", `Swap m[${i}][${j}] = ${m[i][j]} with m[${j}][${i}] = ${m[j][i]}. Only cells with j > i are visited, so each pair is swapped once and not undone.`, { views: [g([[i, j, "active"], [j, i, "active"]])], vars: { i, j } });
        [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
      }
    }
    t.step("reverse", `The transpose is done: rows have become columns. Now reverse each row, which mirrors the grid left to right.`, { views: [g(Array.from({ length: n }, (_, i) => [i, i, "done"] as Cell))], vars: { n } });
    for (let i = 0; i < n; i++) {
      m[i].reverse();
      t.step("reverse", `Row ${i} reversed. After this, the old row ${i} reads top to bottom down column ${n - 1 - i}.`, { views: [g(m[i].map((_, c) => [i, c, "found"] as Cell))], vars: { row: i } });
    }
    t.step("reverse", `Transpose plus reverse rows equals a clockwise quarter turn, using no second grid: O(1) extra space.`, { views: [g(), note("Rotated 90 degrees clockwise", "found")], vars: { n } });
  },
});

export const spiralBounds = defineTrace({
  id: "spiral-boundaries",
  title: "Spiral order: four walls that move inward",
  description: "Walk the top row, right column, bottom row and left column of the remaining rectangle, moving each wall one step inward after its side is read, until the walls cross.",
  code: `
function spiralOrder(m) {
  const out = [];
  let top = 0, bottom = m.length - 1;
  let left = 0, right = m[0].length - 1;      //@init
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(m[top][c]); //@top-row
    top++;
    for (let r = top; r <= bottom; r++) out.push(m[r][right]); //@right-col
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(m[bottom][c]); //@bottom-row
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(m[r][left]); //@left-col
      left++;
    }
  }
  return out;                                 //@done
}`,
  presets: [
    { label: "3 by 4", input: { matrix: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] } },
    { label: "One row left over", input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]] } },
  ],
  fields: { matrix: { maxItems: 5, maxRow: 6, min: 0, max: 99, help: "One row per line, numbers separated by spaces (up to 5 rows of 6)." } },
  validate: ({ matrix }) => !rectangular(matrix) && "Every row needs the same number of values.",
  run(t, { matrix }) {
    const m = matrix;
    const out: number[] = [];
    const seen: Cell[] = [];
    let top = 0;
    let bottom = m.length - 1;
    let left = 0;
    let right = m[0].length - 1;
    const views = (side: Cell[] = []) => [grid("matrix", m, { tones: [...seen, ...side] }), arr("output", out, { tones: Object.fromEntries(out.map((_, i) => [i, "done" as Tone])) })];
    const take = (cells: [number, number][]) => {
      const side: Cell[] = cells.map(([r, c]) => [r, c, "found"]);
      cells.forEach(([r, c]) => out.push(m[r][c]));
      return side;
    };
    const mark = (side: Cell[]) => seen.push(...side.map(([r, c]) => [r, c, "done"] as Cell));
    t.step("init", `Four walls frame the unread part of the grid: top ${top}, bottom ${bottom}, left ${left}, right ${right}. We read its border clockwise, then shrink the frame.`, { views: views(), vars: { top, bottom, left, right } });
    while (top <= bottom && left <= right) {
      let side = take(Array.from({ length: right - left + 1 }, (_, k) => [top, left + k] as [number, number]));
      t.step("top-row", `Read the top row, left to right. That row is finished, so the top wall moves down: top = ${top + 1}.`, { views: views(side), vars: { top, bottom, left, right } });
      mark(side);
      top++;
      side = take(Array.from({ length: Math.max(0, bottom - top + 1) }, (_, k) => [top + k, right] as [number, number]));
      t.step("right-col", side.length ? `Read the right column, top to bottom. Now the right wall moves in: right = ${right - 1}.` : `No rows are left under the top wall, so the right column adds nothing.`, { views: views(side), vars: { top, bottom, left, right } });
      mark(side);
      right--;
      if (top <= bottom) {
        side = take(Array.from({ length: Math.max(0, right - left + 1) }, (_, k) => [bottom, right - k] as [number, number]));
        t.step("bottom-row", side.length ? `Read the bottom row, right to left. The bottom wall moves up: bottom = ${bottom - 1}.` : `No columns are left, so the bottom row adds nothing.`, { views: views(side), vars: { top, bottom, left, right } });
        mark(side);
        bottom--;
      } else {
        t.step("bottom-row", `top has passed bottom: there is no separate bottom row. Without this check a single leftover row would be read twice.`, { views: views(), vars: { top, bottom, left, right } });
      }
      if (left <= right) {
        side = take(Array.from({ length: Math.max(0, bottom - top + 1) }, (_, k) => [bottom - k, left] as [number, number]));
        t.step("left-col", side.length ? `Read the left column, bottom to top. The left wall moves in: left = ${left + 1}.` : `No rows are left, so the left column adds nothing.`, { views: views(side), vars: { top, bottom, left, right } });
        mark(side);
        left++;
      } else {
        t.step("left-col", `left has passed right: there is no separate left column. Without this check a single leftover column would be read twice.`, { views: views(), vars: { top, bottom, left, right } });
      }
    }
    t.step("done", `The walls have crossed, so every cell was read exactly once: ${m.length * m[0].length} cells, O(rows × columns).`, { views: [...views(), note(`Answer: [${out.join(", ")}]`, "found")], vars: { top, bottom, left, right } });
  },
});

export const lifeEncoding = defineTrace({
  id: "life-state-encoding",
  title: "Game of Life in place: store old and new state in one cell",
  description: "Cells are updated one by one using extra values: 2 means alive now but dead next, 3 means dead now but alive next, so neighbour counts still see the old generation; a last pass keeps only the new state.",
  code: `
function gameOfLife(b) {
  // 0 dead, 1 alive, 2 alive -> dead, 3 dead -> alive
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b[0].length; c++) {
      const live = aliveNeighbours(b, r, c);  //@count
      if (b[r][c] === 1 && (live < 2 || live > 3)) b[r][c] = 2; //@die
      else if (b[r][c] === 0 && live === 3) b[r][c] = 3;        //@born
    }
  }
  for (const row of b)
    for (let c = 0; c < row.length; c++) row[c] = row[c] === 1 || row[c] === 3 ? 1 : 0; //@settle
}`,
  presets: [
    { label: "Blinker", input: { board: [[0, 1, 0], [0, 1, 0], [0, 1, 0]] } },
    { label: "Corner block", input: { board: [[1, 1, 0], [1, 0, 0], [0, 0, 0]] } },
  ],
  fields: { board: { maxItems: 4, maxRow: 4, min: 0, max: 1, help: "0 is dead, 1 is alive. One row per line (up to 4 by 4)." } },
  validate: ({ board }) => (!rectangular(board) ? "Every row needs the same number of cells." : board.some((r) => r.some((v) => v !== 0 && v !== 1)) ? "Cells must be 0 or 1." : null),
  run(t, { board }) {
    const b = copy(board);
    const R = b.length;
    const C = b[0].length;
    const alive = (v: number) => v === 1 || v === 2;
    t.step("count", `Every cell must be judged by the old generation. We cannot overwrite a cell with its new state yet, or its neighbours would see a mix.`, { views: [grid("board", b)], vars: { generation: "old" } });
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        let live = 0;
        const nb: Cell[] = [];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
          if (alive(b[nr][nc])) { live++; nb.push([nr, nc, "compare"]); }
        }
        const v = b[r][c];
        if (v === 1 && (live < 2 || live > 3)) {
          t.step("die", `Cell (${r}, ${c}) is alive with ${live} live neighbours: ${live < 2 ? "too lonely" : "too crowded"}. Mark it 2: alive now, dead next. Neighbours still count it as alive.`, { views: [grid("board", b, { tones: [...nb, [r, c, "bad"]] })], vars: { r, c, live } });
          b[r][c] = 2;
        } else if (v === 0 && live === 3) {
          t.step("born", `Cell (${r}, ${c}) is dead with exactly 3 live neighbours, so it is born. Mark it 3: dead now, alive next. Neighbours still count it as dead.`, { views: [grid("board", b, { tones: [...nb, [r, c, "new"]] })], vars: { r, c, live } });
          b[r][c] = 3;
        } else {
          t.step("count", `Cell (${r}, ${c}) is ${v === 1 ? "alive" : "dead"} with ${live} live neighbour${live === 1 ? "" : "s"}: ${v === 1 ? "it survives" : "no birth"}, so it keeps its value.`, { views: [grid("board", b, { tones: [...nb, [r, c, "active"]] })], vars: { r, c, live } });
        }
      }
    }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) b[r][c] = b[r][c] === 1 || b[r][c] === 3 ? 1 : 0;
    t.step("settle", `One last pass keeps only the new state: 1 and 3 become 1, 0 and 2 become 0. No second board was needed.`, { views: [grid("board", b), note("Next generation", "found")], vars: { generation: "new" } });
  },
});

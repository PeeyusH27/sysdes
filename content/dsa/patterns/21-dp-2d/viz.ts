import { arr, defineTrace, grid, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

type Cell = [number, number, Tone];

export const lcsTable = defineTrace({
  id: "dp-lcs-table",
  title: "Two strings: fill the LCS table, then walk back",
  description:
    "dp[i][j] is the longest common subsequence of the first i letters of a and the first j letters of b. Each cell reads its diagonal neighbour on a match, or the cells above and to the left otherwise; a walk back from the corner recovers the subsequence.",
  code: `
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0)); //@init
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1; //@match
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);       //@skip
    }
  }
  let i = m, j = n, out = "";                                     //@back
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out = a[i - 1] + out; i--; j--; } //@take
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;                   //@up
    else j--;                                                     //@left
  }
  return out;                                                     //@done
}`,
  presets: [
    { label: "CLOUD vs COLD", input: { a: "CLOUD", b: "COLD" } },
    { label: "Nothing in common", input: { a: "ABC", b: "XY" } },
  ],
  run(t, { a, b }) {
    const m = a.length;
    const n = b.length;
    const dp: (number | string)[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : "")));
    const rowLabels = ["∅", ...a];
    const colLabels = ["∅", ...b];
    const view = (tones: Cell[] = []) => grid(`dp: rows = prefixes of "${a}", columns = prefixes of "${b}"`, dp, { rowLabels, colLabels, tones });
    const num = (i: number, j: number) => dp[i][j] as number;

    const base: Cell[] = [];
    for (let i = 0; i <= m; i++) base.push([i, 0, "muted"]);
    for (let j = 1; j <= n; j++) base.push([0, j, "muted"]);
    t.step("init", `dp[i][j] = the length of the longest common subsequence of the first i letters of "${a}" and the first j letters of "${b}". Row 0 and column 0 (∅) are the empty prefix: nothing in common, so 0.`, {
      views: [view(base)],
      vars: { m, n },
    });

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = num(i - 1, j - 1) + 1;
          t.step("match", `${a[i - 1]} = ${b[j - 1]}: both last letters can be used together, so take the best without them (diagonal, ${num(i - 1, j - 1)}) plus 1. dp[${i}][${j}] = ${dp[i][j]}.`, {
            views: [view([[i - 1, j - 1, "compare"], [i, j, "new"]])],
            vars: { i, j, "a[i-1]": a[i - 1], "b[j-1]": b[j - 1] },
          });
        } else {
          dp[i][j] = Math.max(num(i - 1, j), num(i, j - 1));
          t.step("skip", `${a[i - 1]} ≠ ${b[j - 1]}: one of these last letters is not in the answer. Drop ${a[i - 1]} (above, ${num(i - 1, j)}) or drop ${b[j - 1]} (left, ${num(i, j - 1)}), keep the larger: ${dp[i][j]}.`, {
            views: [view([[i - 1, j, "compare"], [i, j - 1, "compare"], [i, j, "new"]])],
            vars: { i, j, "a[i-1]": a[i - 1], "b[j-1]": b[j - 1] },
          });
        }
      }
    }

    let i = m;
    let j = n;
    let out = "";
    const path: Cell[] = [];
    t.step("back", `The table is full and the answer cell dp[${m}][${n}] = ${num(m, n)}. To recover the letters themselves, walk back from that corner, retracing which neighbour each cell came from.`, {
      views: [view([[m, n, "active"]])],
      vars: { i, j, out },
    });
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        out = a[i - 1] + out;
        path.push([i, j, "found"]);
        t.step("take", `${a[i - 1]} = ${b[j - 1]}, so this cell came from the diagonal: ${a[i - 1]} is in the subsequence. Move up and left.`, { views: [view([...path])], vars: { i, j, out } });
        i--;
        j--;
      } else if (num(i - 1, j) >= num(i, j - 1)) {
        path.push([i, j, "window"]);
        t.step("up", `${a[i - 1]} ≠ ${b[j - 1]}, and the cell above already reaches the same length (${num(i - 1, j)}) without ${a[i - 1]}: move up.`, { views: [view([...path, [i - 1, j, "compare"]])], vars: { i, j, out } });
        i--;
      } else {
        path.push([i, j, "window"]);
        t.step("left", `${a[i - 1]} ≠ ${b[j - 1]}, and the cell to the left is the larger one (${num(i, j - 1)}): this value came without ${b[j - 1]}, so move left.`, { views: [view([...path, [i, j - 1, "compare"]])], vars: { i, j, out } });
        j--;
      }
    }
    t.step("done", out ? `The walk reached the empty row or column. Reading the ✓ cells gives "${out}", a common subsequence of length ${out.length}. Ties in the walk can lead to a different, equally long answer.` : "The walk reached the empty row or column without a single match: the strings share no letters, so the answer is the empty string.", {
      views: [view([...path]), note(out ? `LCS = "${out}" (length ${out.length})` : `LCS = "" (length 0)`, out ? "found" : "bad")],
      vars: { i, j, out },
    });
  },
});

export const knapsackTable = defineTrace({
  id: "dp-knapsack-table",
  title: "0/1 knapsack: items × capacity",
  description:
    "dp[i][c] is the best value using the first i items with capacity c. Each cell either skips item i (the cell above) or takes it (the cell above, w columns to the left, plus its value). A walk back lists the chosen items.",
  code: `
function knapsack(weights, values, W) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0)); //@init
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1], v = values[i - 1];
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];                                //@skip
      if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v); //@take
    }
  }
  return dp[n][W];                                            //@done
}`,
  presets: [
    { label: "3 items, capacity 5", input: { weights: [2, 3, 4], values: [3, 4, 6], W: 5 } },
    { label: "Ratio greedy fails", input: { weights: [3, 2, 2], values: [5, 3, 3], W: 4 } },
  ],
  run(t, { weights, values, W }) {
    const n = weights.length;
    const dp: (number | string)[][] = Array.from({ length: n + 1 }, (_, i) => new Array(W + 1).fill(i === 0 ? 0 : ""));
    const rowLabels = ["none", ...weights.map((w, k) => `#${k + 1} w${w} $${values[k]}`)];
    const colLabels = Array.from({ length: W + 1 }, (_, c) => c);
    const view = (tones: Cell[] = []) => grid("dp: rows = items considered, columns = capacity", dp, { rowLabels, colLabels, tones });
    const num = (i: number, c: number) => dp[i][c] as number;

    t.step("init", `dp[i][c] = the best total value using only the first i items, with capacity c. Row 0 (no items) is all 0. Each item can be taken at most once.`, {
      views: [view(Array.from({ length: W + 1 }, (_, c) => [0, c, "muted"] as Cell))],
      vars: { W },
    });

    for (let i = 1; i <= n; i++) {
      const w = weights[i - 1];
      const v = values[i - 1];
      // Capacities below the item's weight can't hold it: those cells just copy the row above (one frame for all).
      const tooSmall = Math.min(w - 1, W);
      const copied: Cell[] = [];
      for (let c = 0; c <= tooSmall; c++) {
        dp[i][c] = num(i - 1, c);
        copied.push([i - 1, c, "compare"], [i, c, "new"]);
      }
      if (tooSmall >= 0) {
        t.step("skip", `Item #${i} weighs ${w}, so capacities 0 to ${tooSmall} can't hold it. Skipping is the only option there: copy the row above.`, {
          views: [view(copied)],
          vars: { i, c: tooSmall, w, v },
        });
      }
      for (let c = tooSmall + 1; c <= W; c++) {
        const skip = num(i - 1, c);
        const take = num(i - 1, c - w) + v;
        dp[i][c] = Math.max(skip, take);
        t.step("take", `Capacity ${c}: skip item #${i} (above: ${skip}) or take it (row above at capacity ${c} - ${w} = ${c - w}, worth ${num(i - 1, c - w)}, plus $${v} = ${take}). Best: ${dp[i][c]}.`, {
          views: [view([[i - 1, c, "compare"], [i - 1, c - w, "compare"], [i, c, "new"]])],
          vars: { i, c, w, v },
        });
      }
    }

    const chosen: number[] = [];
    const path: Cell[] = [];
    for (let i = n, c = W; i > 0; i--) {
      if (num(i, c) !== num(i - 1, c)) {
        chosen.push(i);
        path.push([i, c, "found"]);
        c -= weights[i - 1];
      } else path.push([i, c, "window"]);
    }
    chosen.reverse();
    // Greedy by value per unit of weight, to show when it falls short.
    let room = W;
    let greedy = 0;
    for (const k of weights.map((_, k) => k).sort((x, y) => values[y] / weights[y] - values[x] / weights[x])) {
      if (weights[k] <= room) {
        room -= weights[k];
        greedy += values[k];
      }
    }
    const greedyNote = greedy < num(n, W) ? ` Taking the best value-per-weight item first would only reach ${greedy}.` : "";
    t.step("done", `The answer is dp[${n}][${W}] = ${num(n, W)}. Walking up from it, a cell that differs from the one above means that item was taken (✓): items ${chosen.map((k) => `#${k}`).join(" and ")}.${greedyNote}`, {
      views: [view(path), note(`Best value ${num(n, W)}: items ${chosen.map((k) => `#${k}`).join(", ")}`, "found")],
      vars: { W },
    });
  },
});

export const knapsackRow = defineTrace({
  id: "dp-knapsack-row",
  title: "One row: the loop direction decides 0/1 or unbounded",
  description:
    "The knapsack table compressed to one row. Going from high capacity to low reads values from before the current item (each item once); going from low to high reads values that already include it (unlimited copies).",
  code: `
function bestValue(items, W, unbounded) {
  const dp = new Array(W + 1).fill(0);             //@init
  for (const [w, v] of items) {                    //@item
    if (unbounded) {
      for (let c = w; c <= W; c++)
        dp[c] = Math.max(dp[c], dp[c - w] + v);    //@up
    } else {
      for (let c = W; c >= w; c--)
        dp[c] = Math.max(dp[c], dp[c - w] + v);    //@down
    }
  }
  return dp[W];                                    //@done
}`,
  presets: [
    { label: "0/1: high to low", input: { items: [[2, 3], [3, 5]] as [number, number][], W: 6, unbounded: false } },
    { label: "Unbounded: low to high", input: { items: [[2, 3], [3, 5]] as [number, number][], W: 6, unbounded: true } },
  ],
  run(t, { items, W, unbounded }) {
    const dp: number[] = new Array(W + 1).fill(0);
    const view = (c: number | null, band: [number, number] | null, tones: Record<number, Tone> = {}) =>
      arr("dp (best value at each capacity)", dp, { pointers: c === null ? {} : { c }, window: band, tones });

    t.step("init", `One row instead of a table: dp[c] = the best value with capacity c using the items processed so far. The shaded band will show which cells already include the current item.`, {
      views: [view(null, null)],
      vars: { W },
    });

    items.forEach(([w, v], k) => {
      t.step("item", `Item #${k + 1}: weight ${w}, value ${v}. Every cell still holds the answer without this item. ${unbounded ? "Sweep capacities from low to high." : "Sweep capacities from high to low."}`, {
        views: [view(null, null)],
        vars: { w, v },
      });
      if (unbounded) {
        for (let c = w; c <= W; c++) {
          const before = dp[c];
          const take = dp[c - w] + v;
          const updated = c - w >= w;
          dp[c] = Math.max(before, take);
          t.step(
            "up",
            `dp[${c}] = max(${before}, dp[${c - w}] + ${v} = ${take}) = ${dp[c]}. ${updated ? `dp[${c - w}] was already updated for this item, so taking it again is allowed: that is the unbounded case.` : `dp[${c - w}] lies below weight ${w}, where this item's sweep started, so it still holds a value without the item.`}`,
            { views: [view(c, [w, c], { [c - w]: "compare", [c]: "new" })], vars: { w, v, c } },
          );
        }
      } else {
        for (let c = W; c >= w; c--) {
          const before = dp[c];
          const take = dp[c - w] + v;
          dp[c] = Math.max(before, take);
          t.step(
            "down",
            `dp[${c}] = max(${before}, dp[${c - w}] + ${v} = ${take}) = ${dp[c]}. dp[${c - w}] is to the left, not yet touched for this item, so it is the value without item #${k + 1}: the item is counted at most once.`,
            { views: [view(c, [c, W], { [c - w]: "compare", [c]: "new" })], vars: { w, v, c } },
          );
        }
      }
    });

    // The answer the other loop direction would give, to contrast the two presets.
    const other = new Array(W + 1).fill(0);
    for (const [w, v] of items) {
      if (unbounded) for (let c = W; c >= w; c--) other[c] = Math.max(other[c], other[c - w] + v);
      else for (let c = w; c <= W; c++) other[c] = Math.max(other[c], other[c - w] + v);
    }
    t.step(
      "done",
      unbounded
        ? `dp[${W}] = ${dp[W]}, more than the ${other[W]} you get when each item is used once: reading cells that already include an item let it be used again. Low to high is right for unbounded knapsack and Coin Change II.`
        : `dp[${W}] = ${dp[W]}, with each item used at most once. Sweeping low to high would have reused items and claimed ${other[W]}. High to low is right for 0/1 problems like Partition Equal Subset Sum.`,
      { views: [view(null, null, { [W]: "found" }), note(`Answer: ${dp[W]}`, "found")], vars: { W } },
    );
  },
});

import { arr, defineTrace, hashmap, NodeIds, note, tree, type TNode } from "@/components/algo/trace";
import type { Tone, View } from "@/components/algo/types";

/**
 * Running example for the whole lesson: Min Cost Climbing Stairs.
 * cost[i] is paid when you leave step i, a move climbs 1 or 2 steps, you may start on step 0 or 1 for free,
 * and the top is step n (one past the last step). best(i) = cheapest total cost to stand on step i.
 */

export const recursionTree = defineTrace({
  id: "dp-recursion-tree",
  title: "Plain recursion vs memoized recursion: the call tree",
  description:
    "The call tree of best(5) for the min-cost stairs problem. Without a memo the same subproblems are solved again and again; with a memo every repeated call becomes a leaf.",
  code: `
function best(i) {                                      //@call
  if (i <= 1) return 0;                                 //@base
  return Math.min(best(i - 1) + cost[i - 1],            //@recurse
                  best(i - 2) + cost[i - 2]);
}

function bestMemo(i, memo) {                            //@mcall
  if (i <= 1) return 0;                                 //@mbase
  if (memo.has(i)) return memo.get(i);                  //@hit
  const value = Math.min(bestMemo(i - 1, memo) + cost[i - 1],
                         bestMemo(i - 2, memo) + cost[i - 2]);
  memo.set(i, value);                                   //@save
  return value;
}`,
  presets: [
    { label: "Plain recursion", input: { cost: [1, 4, 2, 3, 1], memo: false } },
    { label: "With a memo", input: { cost: [1, 4, 2, 3, 1], memo: true } },
  ],
  run(t, { cost, memo: useMemo }) {
    const ids = new NodeIds();
    const memo = new Map<number, number>();
    // Per call node: is it still on the call stack, was it a memo hit, is it wasted work (inside a repeated subtree)?
    const info = new Map<TNode, { running: boolean; hit: boolean; wasted: boolean }>();
    const badges = new Map<TNode, number>();
    const solvedOnce = new Set<number>();
    let root: TNode | null = null;
    let calls = 0;
    let wastedCalls = 0;
    const n = cost.length;
    const fn = useMemo ? "bestMemo" : "best";

    const toneOf = (node: TNode, now: TNode): Tone => {
      const s = info.get(node)!;
      if (s.hit) return "found";
      if (s.wasted) return "bad";
      if (node === now) return "active";
      return s.running ? "window" : "done";
    };
    const views = (now: TNode, memoTones: [unknown, Tone][] = [], extra: View[] = []) => {
      const tones = [...info.keys()].map((node) => [node, toneOf(node, now)] as [TNode, Tone]);
      const v: View[] = [tree(`calls of ${fn}(i)`, root, { ids, pointers: { now }, tones, badges: [...badges] })];
      if (useMemo) v.push(hashmap("memo (i → best)", memo, { tones: memoTones }));
      return [...v, ...extra];
    };

    const call = (i: number, parent: TNode | null, side: "left" | "right", insideRepeat: boolean): number => {
      const node: TNode = { val: i, left: null, right: null };
      if (parent) parent[side] = node;
      else root = node;
      calls++;
      const isRoot = node === root;
      const repeated = !useMemo && i > 1 && solvedOnce.has(i);
      const wasted = insideRepeat || repeated;
      if (wasted) wastedCalls++;
      info.set(node, { running: true, hit: false, wasted });

      if (i <= 1) {
        info.get(node)!.running = false;
        badges.set(node, 0);
        t.step(useMemo ? "mbase" : "base", `${fn}(${i}) is a base case: you may start on step ${i} for free, so it costs 0.${insideRepeat ? " This call is still wasted work: it only happens because a repeated subtree is being rebuilt." : ""}`, {
          views: views(node),
          vars: { i, calls },
        });
        return 0;
      }

      if (useMemo && memo.has(i)) {
        const v = memo.get(i)!;
        Object.assign(info.get(node)!, { running: false, hit: true });
        badges.set(node, v);
        t.step("hit", `bestMemo(${i}) is already in the memo (${v}): return it at once. This call is a leaf, so the subtree below it is never rebuilt.`, {
          views: views(node, [[i, "found"]]),
          vars: { i, calls },
        });
        return v;
      }

      let caption = `${fn}(${i}): the last move onto step ${i} came from step ${i - 1} or from step ${i - 2}, so ask for both.`;
      if (isRoot) caption = `${fn}(${n}) asks for the cheapest way to stand on the top, step ${n}, with cost = [${cost.join(", ")}]. The last move came from step ${n - 1} or step ${n - 2}, so ask for both.`;
      if (repeated) caption = `${fn}(${i}) again! It was already solved further left, but plain recursion has no memory, so its whole subtree is rebuilt from scratch.`;
      t.step(useMemo ? "mcall" : "call", caption, { views: views(node), vars: { i, calls } });

      const a = call(i - 1, node, "left", wasted);
      const b = call(i - 2, node, "right", wasted);
      const value = Math.min(a + cost[i - 1], b + cost[i - 2]);
      badges.set(node, value);
      info.get(node)!.running = false;
      solvedOnce.add(i);
      const formula = `min(${a} + ${cost[i - 1]}, ${b} + ${cost[i - 2]}) = ${value}`;

      if (useMemo) {
        memo.set(i, value);
        t.step(
          "save",
          isRoot
            ? `bestMemo(${i}) = ${formula}. Done after ${calls} calls: each subproblem was solved once, and every repeat was a memo hit (✓).`
            : `bestMemo(${i}) = ${formula}. Save it in the memo, so any later bestMemo(${i}) is free.`,
          { views: views(node, [[i, "new"]], isRoot ? [note(`best(${n}) = ${value} after ${calls} calls`, "found")] : []), vars: { i, calls } },
        );
      } else {
        t.step(
          "recurse",
          isRoot
            ? `best(${i}) = ${formula}. That took ${calls} calls for only ${n + 1} different subproblems: the ${wastedCalls} calls marked ✕ recomputed answers that were already known. One more step in the staircase roughly doubles this.`
            : `best(${i}) = ${formula}.`,
          { views: views(node, [], isRoot ? [note(`best(${n}) = ${value} after ${calls} calls, ${wastedCalls} of them wasted`, "bad")] : []), vars: { i, calls } },
        );
      }
      return value;
    };

    call(n, null, "left", false);
  },
});

export const fillTable = defineTrace({
  id: "dp-fill-table",
  title: "Bottom-up: fill dp[] from the base cases up",
  description:
    "The dp array for min-cost stairs is filled left to right; each cell reads the two cells before it and keeps the cheaper way in. Then the optimal path is read back from the table.",
  code: `
function minCost(cost) {
  const n = cost.length;
  const dp = new Array(n + 1).fill(0);           //@init
  dp[0] = 0; dp[1] = 0;     // start on 0 or 1 free //@base
  for (let i = 2; i <= n; i++) {
    const oneStep = dp[i - 1] + cost[i - 1];
    const twoStep = dp[i - 2] + cost[i - 2];     //@read
    dp[i] = Math.min(oneStep, twoStep);          //@fill
  }
  return dp[n];                                  //@done
}`,
  presets: [
    { label: "Seven steps", input: { cost: [1, 4, 2, 3, 1, 5, 2] } },
    { label: "Two steps", input: { cost: [10, 15] } },
  ],
  run(t, { cost }) {
    const n = cost.length;
    const dp: number[] = new Array(n + 1).fill(0);
    const from: number[] = new Array(n + 1).fill(-1);
    let filled = 0;
    const shown = () => dp.map((v, k) => (k < filled ? v : ""));
    const views = (i: number | null, dpTones: Record<number, Tone> = {}, costTones: Record<number, Tone> = {}) => [
      arr("cost (paid when you leave a step)", cost, { tones: costTones }),
      arr("dp (cheapest cost to stand on step i)", shown(), { pointers: i === null ? {} : { i }, tones: dpTones }),
    ];

    t.step("init", `State in words: dp[i] = the cheapest total cost to stand on step i. The top is step ${n}, one past the last step, so dp needs ${n + 1} cells.`, {
      views: views(null),
      vars: { n },
    });
    filled = 2;
    t.step("base", "Base cases: you may start on step 0 or step 1 without paying, so dp[0] = 0 and dp[1] = 0. The recurrence can't build these: they have no two earlier steps.", {
      views: views(null, { 0: "new", 1: "new" }),
      vars: { n },
    });

    for (let i = 2; i <= n; i++) {
      const oneStep = dp[i - 1] + cost[i - 1];
      const twoStep = dp[i - 2] + cost[i - 2];
      t.step(
        "read",
        `To stand on step ${i}, the last move came from step ${i - 1} (dp[${i - 1}] + cost[${i - 1}] = ${dp[i - 1]} + ${cost[i - 1]} = ${oneStep}) or from step ${i - 2} (dp[${i - 2}] + cost[${i - 2}] = ${dp[i - 2]} + ${cost[i - 2]} = ${twoStep}). Both cells are already filled.`,
        { views: views(i, { [i - 1]: "compare", [i - 2]: "compare", [i]: "active" }, { [i - 1]: "compare", [i - 2]: "compare" }), vars: { i, oneStep, twoStep } },
      );
      dp[i] = Math.min(oneStep, twoStep);
      from[i] = oneStep <= twoStep ? i - 1 : i - 2;
      filled = i + 1;
      t.step("fill", `dp[${i}] = min(${oneStep}, ${twoStep}) = ${dp[i]}, coming from step ${from[i]}. Every later cell reads this number instead of recomputing it.`, {
        views: views(i, { [from[i]]: "compare", [i]: "new" }, { [from[i]]: "compare" }),
        vars: { i, oneStep, twoStep },
      });
    }

    const path: number[] = [];
    for (let i = n; i > 1; i = from[i]) path.push(from[i]);
    const paid = path.reverse();
    const dpTones: Record<number, Tone> = { [n]: "found" };
    const costTones: Record<number, Tone> = {};
    for (const s of paid) {
      dpTones[s] = "found";
      costTones[s] = "found";
    }
    t.step(
      "done",
      `The answer cell is dp[${n}] = ${dp[n]}. Following the "came from" choices back from the top gives the path: pay on step${paid.length > 1 ? "s" : ""} ${paid.join(", ")}. Each cell only read the two before it, so two variables would be enough (O(1) space).`,
      { views: [...views(null, dpTones, costTones), note(`Answer: ${dp[n]} (pay ${paid.map((s) => cost[s]).join(" + ")})`, "found")], vars: { n } },
    );
  },
});

export const overAmount = defineTrace({
  id: "dp-over-amount",
  title: "DP over an amount: fewest perfect squares",
  description:
    "dp[a] is the fewest perfect squares that add up to a. Each cell tries every square that fits and reads the cell for the amount left over.",
  code: `
function numSquares(n) {
  const dp = new Array(n + 1).fill(Infinity);    //@init
  dp[0] = 0;                                     //@base
  for (let a = 1; a <= n; a++) {
    for (let k = 1; k * k <= a; k++) {
      dp[a] = Math.min(dp[a], dp[a - k * k] + 1); //@relax
    }
  }
  return dp[n];                                  //@done
}`,
  presets: [
    { label: "n = 12", input: { n: 12 } },
    { label: "n = 7", input: { n: 7 } },
  ],
  run(t, { n }) {
    const dp: number[] = new Array(n + 1).fill(Infinity);
    const pick: number[] = new Array(n + 1).fill(0);
    const view = (a: number | null, tones: Record<number, Tone> = {}) => arr("dp (fewest squares that sum to a)", dp, { pointers: a === null ? {} : { a }, tones });

    t.step("init", `State in words: dp[a] = the fewest perfect squares that add up to a. Every cell starts at ∞, which means "not solved yet".`, { views: [view(null)], vars: { n } });
    dp[0] = 0;
    t.step("base", "Base case: the amount 0 needs no squares at all, so dp[0] = 0. Every other amount is built on top of it.", { views: [view(null, { 0: "new" })], vars: { n } });

    for (let a = 1; a <= n; a++) {
      const tries: string[] = [];
      const tones: Record<number, Tone> = {};
      for (let k = 1; k * k <= a; k++) {
        const cand = dp[a - k * k] + 1;
        tries.push(`${k * k} leaves ${a - k * k}: dp[${a - k * k}] + 1 = ${cand}`);
        tones[a - k * k] = "compare";
        if (cand < dp[a]) {
          dp[a] = cand;
          pick[a] = k * k;
        }
      }
      tones[a] = "new";
      t.step("relax", `dp[${a}]: try each square that fits as the last piece. ${tries.join("; ")}. The fewest is ${dp[a]}.`, {
        views: [view(a, tones)],
        vars: { a, "dp[a]": dp[a] },
      });
    }

    const parts: number[] = [];
    const tones: Record<number, Tone> = {};
    for (let a = n; a > 0; a -= pick[a]) {
      parts.push(pick[a]);
      tones[a] = "found";
    }
    tones[0] = "found";
    parts.sort((x, y) => y - x);
    const greedy: number[] = [];
    for (let left = n; left > 0; ) {
      const sq = Math.floor(Math.sqrt(left)) ** 2;
      greedy.push(sq);
      left -= sq;
    }
    const why =
      greedy.length > dp[n]
        ? `Grabbing the biggest square first would need ${greedy.length} (${greedy.join(" + ")}): greedy fails here, the table doesn't.`
        : `No combination of fewer squares works: the table tried every last square for every amount.`;
    t.step("done", `Walking the chosen squares back from dp[${n}] gives ${parts.join(" + ")}, so the answer is ${dp[n]}. ${why}`, {
      views: [view(null, tones), note(`Answer: ${dp[n]} (${parts.join(" + ")} = ${n})`, "found")],
      vars: { n },
    });
  },
});

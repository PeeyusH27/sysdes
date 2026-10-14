// Small precondition helpers for the `validate` / `prepare` hooks in content/dsa/patterns/*/viz.ts.
// Each check returns a short sentence for the reader, or null when the input is fine.
import { buildTree, type TNode } from "./trace";

export const isSorted = (xs: readonly number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
export const ascending = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

/** Sorts `key` of the input if needed and tells the reader why. */
export function sortField<I extends Record<string, unknown>>(input: I, key: keyof I & string, why: string, say: (n: string) => void): I {
  const xs = input[key] as number[];
  if (isSorted(xs)) return input;
  say(`Sorted ${key} first: ${why}`);
  return { ...input, [key]: ascending(xs) };
}

export const letterOf = (i: number) => String.fromCharCode(65 + i);
const nodeName = (i: number, letters: boolean) => (letters ? letterOf(i) : String(i));

/** Node ids in range, no self-loops, no repeated edges (unless `repeats`). */
export function edgeProblem(n: number, edges: readonly (readonly number[])[], o: { directed?: boolean; letters?: boolean; repeats?: boolean } = {}): string | null {
  const seen = new Set<string>();
  for (const [a, b] of edges) {
    for (const v of [a, b]) if (v < 0 || v >= n) return `Edge ${nodeName(a, !!o.letters)}-${nodeName(b, !!o.letters)} uses node ${nodeName(v, !!o.letters)}, but the nodes are ${nodeName(0, !!o.letters)} to ${nodeName(n - 1, !!o.letters)}.`;
    if (a === b) return `Edge ${nodeName(a, !!o.letters)}-${nodeName(b, !!o.letters)} is a self-loop. Connect two different nodes.`;
    const k = o.directed ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (seen.has(k) && !o.repeats) return `Edge ${nodeName(a, !!o.letters)}-${nodeName(b, !!o.letters)} appears twice. List each edge once.`;
    seen.add(k);
  }
  return null;
}

/** A level-order list that buildTree turns into a tree using every value, no deeper than `maxDepth` levels. */
export function treeProblem(values: readonly (number | null)[], maxLevels = 5): string | null {
  const root = buildTree(values);
  if (!root) return "The tree needs a root value first.";
  let count = 0;
  let deepest = 0;
  const walk = (n: TNode | null, d: number) => {
    if (!n) return;
    count++;
    deepest = Math.max(deepest, d);
    walk(n.left, d + 1);
    walk(n.right, d + 1);
  };
  walk(root, 1);
  const given = values.filter((v) => v !== null).length;
  if (count < given) return `${given - count} value${given - count === 1 ? " has" : "s have"} no parent: in level order, a null has no children, so drop the values under it.`;
  if (deepest > maxLevels) return `That tree is ${deepest} levels deep. Keep it to ${maxLevels} so it fits on screen.`;
  return null;
}

/** In-order values strictly increase: left subtree < node < right subtree. */
export function bstProblem(values: readonly (number | null)[]): string | null {
  const out: number[] = [];
  const walk = (n: TNode | null) => {
    if (!n) return;
    walk(n.left);
    out.push(n.val as number);
    walk(n.right);
  };
  walk(buildTree(values));
  const i = out.findIndex((x, k) => k > 0 && out[k - 1] >= x);
  return i === -1 ? null : `Not a binary search tree: in order, ${out[i - 1]} comes before ${out[i]}. Every left subtree must hold smaller values, every right subtree bigger ones.`;
}

/** Every value distinct (backtracking traces use values as node ids). */
export function distinctProblem(name: string, xs: readonly unknown[]): string | null {
  const dup = xs.find((x, i) => xs.indexOf(x) !== i);
  return dup === undefined ? null : `${name} has ${String(dup)} twice. Use distinct values.`;
}

/** Equal-length rows made only of the given characters. */
export function gridProblem(rows: readonly string[]): string | null {
  const w = rows[0]?.length ?? 0;
  const bad = rows.findIndex((r) => r.length !== w);
  return bad === -1 ? null : `Row ${bad + 1} has ${rows[bad].length} cells but row 1 has ${w}. Every row needs the same width.`;
}

/** start ≤ end (start < end when `strict`), and the whole set spans at most `maxSpan` time units. */
export function intervalProblem(iv: readonly (readonly number[])[], o: { strict?: boolean; maxSpan?: number } = {}): string | null {
  for (const [s, e] of iv) {
    if (s > e || (o.strict && s === e)) return `[${s}, ${e}] ${s === e ? "is empty" : "ends before it starts"}: each interval needs start ${o.strict ? "<" : "≤"} end.`;
  }
  const from = Math.min(...iv.map((x) => x[0]));
  const to = Math.max(...iv.map((x) => x[1]));
  if (o.maxSpan !== undefined && to - from > o.maxSpan) return `The intervals run from ${from} to ${to}. Keep them within ${o.maxSpan} time units so the timeline fits.`;
  return null;
}

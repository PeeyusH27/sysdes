import { arr, defineTrace, graph, hashset, note, stack } from "@/components/algo/trace";
import type { Tone, View } from "@/components/algo/types";
import { distinctProblem } from "@/components/algo/checks";

interface CallNode {
  id: string;
  label: string;
  parent: string | null;
  depth: number;
  kids: string[];
  x: number;
  y: number;
}

/**
 * A recursion tree recorded in a first pass over the algorithm, so every call keeps a fixed position while the
 * trace replays the search and reveals the calls one by one.
 */
class CallTree {
  readonly nodes = new Map<string, CallNode>();

  add(id: string, label: string, parent: string | null) {
    const depth = parent === null ? 0 : this.nodes.get(parent)!.depth + 1;
    this.nodes.set(id, { id, label, parent, depth, kids: [], x: 50, y: 0 });
    if (parent !== null) this.nodes.get(parent)!.kids.push(id);
  }

  /** Leaves get evenly spaced x positions in visiting order; each parent sits above the middle of its children. */
  layout() {
    const all = [...this.nodes.values()];
    const leaves = all.filter((n) => n.kids.length === 0).length;
    const maxDepth = Math.max(...all.map((n) => n.depth));
    let slot = 0;
    const place = (n: CallNode) => {
      n.y = maxDepth === 0 ? 50 : (n.depth / maxDepth) * 100;
      if (n.kids.length === 0) {
        n.x = leaves === 1 ? 50 : (slot++ / (leaves - 1)) * 100;
        return;
      }
      n.kids.forEach((k) => place(this.nodes.get(k)!));
      n.x = (this.nodes.get(n.kids[0])!.x + this.nodes.get(n.kids[n.kids.length - 1])!.x) / 2;
    };
    place(all.find((n) => n.parent === null)!);
  }

  view(label: string, visible: Set<string>, o: { tones?: [string, Tone][]; path?: string[]; badges?: [string, unknown][] } = {}): View {
    const shown = [...this.nodes.values()].filter((n) => visible.has(n.id));
    const path = o.path ?? [];
    const edgeTones: [string, string, Tone][] = [];
    for (let i = 1; i < path.length; i++) edgeTones.push([path[i - 1], path[i], "active"]);
    return graph(
      label,
      {
        nodes: shown.map((n) => ({ id: n.id, label: n.label, x: Math.round(n.x), y: Math.round(n.y) })),
        edges: shown.filter((n) => n.parent !== null).map((n) => ({ from: n.parent!, to: n.id })),
      },
      { tones: o.tones, edgeTones, badges: o.badges },
    );
  }
}

/** Node id for a path of choices; the root is the empty path. */
const idOf = (path: readonly unknown[]) => (path.length ? path.join(",") : "root");
/** Ids of the root and every prefix of the path: the calls currently on the call stack. */
const stackIds = (path: readonly unknown[]) => ["root", ...path.map((_, i) => idOf(path.slice(0, i + 1)))];
const fmtPath = (path: readonly unknown[]) => `[${path.join(", ")}]`;

/** Tones for the tree: finished statuses first, then the calls on the stack, then the current call. */
function treeTones(status: Map<string, Tone>, onStack: string[], current: string, currentTone: Tone): [string, Tone][] {
  const tones: [string, Tone][] = [...status];
  for (const id of onStack) if (!status.has(id)) tones.push([id, "window"]);
  tones.push([current, currentTone]);
  return tones;
}

export const combinationsTree = defineTrace({
  id: "combinations-tree",
  title: "Choose, explore, un-choose: the recursion tree",
  description:
    "Backtracking lists every way to pick k numbers from 1 to n: each call pushes a number bigger than the last one, recurses, then pops it, and the recursion tree grows one call at a time.",
  code: `
function combinations(n, k) {
  const result = [], path = [];
  function backtrack(start) {
    if (path.length === k) {
      result.push([...path]);            //@record
      return;
    }
    for (let i = start; i <= n; i++) {   //@loop
      path.push(i);                      //@choose
      backtrack(i + 1);                  //@explore
      path.pop();                        //@unchoose
    }
  }
  backtrack(1);                          //@start
  return result;                         //@done
}`,
  presets: [
    { label: "n = 4, k = 2", input: { n: 4, k: 2 } },
    { label: "n = 3, k = 3: dead ends", input: { n: 3, k: 3 } },
  ],
  fields: { n: { min: 1, max: 6 }, k: { min: 1, max: 6 } },
  validate: ({ n, k }) => {
    if (k > n) return `k can't be bigger than n: there are no ways to pick ${k} of ${n} numbers.`;
    let calls = 0;
    for (let d = 0, c = 1; d <= k; d++, c = (c * (n - d + 1)) / d) calls += c;
    return calls > 22 && `n = ${n}, k = ${k} makes ${calls} calls. Keep it to 22 so the tree fits: try a smaller n or k.`;
  },
  run(t, { n, k }) {
    // Pass 1: record the whole recursion tree so nodes have fixed positions.
    const tree = new CallTree();
    tree.add("root", "[]", null);
    const build = (start: number, p: number[]) => {
      if (p.length === k) return;
      for (let i = start; i <= n; i++) {
        tree.add(idOf([...p, i]), [...p, i].join(","), idOf(p));
        build(i + 1, [...p, i]);
      }
    };
    build(1, []);
    tree.layout();

    // Pass 2: replay the search.
    const visible = new Set(["root"]);
    const status = new Map<string, Tone>();
    const path: number[] = [];
    const result: string[] = [];
    const deadEnds: string[] = [];
    let newest: string | null = null;
    const views = (currentTone: Tone = "active", extra: View[] = []): View[] => {
      const onStack = stackIds(path);
      return [
        tree.view("recursion tree", visible, { tones: treeTones(status, onStack, onStack[onStack.length - 1], currentTone), path: onStack }),
        stack("path", path),
        hashset("result", result, { tones: newest ? [[newest, "new"]] : [] }),
        ...extra,
      ];
    };
    t.step("start", `Call backtrack(1) with an empty path: the root of the recursion tree. Every node is one call, and the path from the root to it is the list of choices made so far.`, {
      views: views(),
      vars: { n, k, start: 1 },
    });

    const backtrack = (start: number) => {
      const here = idOf(path);
      if (path.length === k) {
        result.push(fmtPath(path));
        newest = fmtPath(path);
        status.set(here, "found");
        t.step("record", `The path ${fmtPath(path)} has k = ${k} numbers: record a copy and return. A copy, because path itself will keep changing.`, {
          views: views("found"),
          vars: { start, depth: path.length, found: result.length },
        });
        newest = null;
        return;
      }
      if (start > n) {
        status.set(here, "muted");
        deadEnds.push(fmtPath(path));
        t.step("loop", `start = ${start} is past n = ${n}: no numbers are left to choose, but the path ${fmtPath(path)} is still shorter than k. A dead end: return without recording.`, {
          views: views("muted"),
          vars: { start, depth: path.length, found: result.length },
        });
        return;
      }
      for (let i = start; i <= n; i++) {
        path.push(i);
        visible.add(idOf(path));
        t.step("choose", `Choose ${i}: push it, so the path is ${fmtPath(path)}. Explore with start = ${i + 1}: only numbers bigger than ${i} may follow, so no combination is built twice in another order.`, {
          views: views("new"),
          vars: { start, i, depth: path.length, found: result.length },
        });
        backtrack(i + 1);
        const child = idOf(path);
        const finished = fmtPath(path);
        if (!status.has(child)) status.set(child, "done");
        path.pop();
        t.step("unchoose", `The call for ${finished} has returned. Un-choose ${i}: pop it, so the path is ${fmtPath(path)} again and the next number can take its place.`, {
          views: views(),
          vars: { start, i, depth: path.length, found: result.length },
        });
      }
    };
    backtrack(1);
    status.set("root", "done");
    const many = result.length === 1 ? "combination" : "combinations";
    t.step(
      "done",
      `The loop at the root has tried every first number: ${result.length} ${many}${result.length > 1 ? ", each built exactly once" : ""}.${
        deadEnds.length === 1
          ? ` The grey call ${deadEnds[0]} was a dead end that could never reach ${k} numbers; checking "are enough numbers left?" before recursing would prune it.`
          : deadEnds.length
            ? ` The ${deadEnds.length} grey calls (${deadEnds.join(", ")}) were dead ends that could never reach ${k} numbers; checking "are enough numbers left?" before recursing would prune them.`
            : ""
      }`,
      {
        views: views("done", [note(`${result.length} ${many}: ${result.join(" ")}`, "found")]),
        vars: { n, k, found: result.length },
      },
    );
  },
});

export const arrangementsTree = defineTrace({
  id: "arrangements-used",
  title: "Order matters: any unused item can go next",
  description:
    "Ordered selections of k items: each call loops over every item, skips the ones marked in used[], and un-chooses by popping the item and clearing its flag.",
  code: `
function arrangements(items, k) {
  const result = [], path = [];
  const used = items.map(() => false);
  function backtrack() {
    if (path.length === k) {
      result.push([...path]);              //@record
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;               //@skip
      used[i] = true; path.push(items[i]); //@choose
      backtrack();                         //@explore
      path.pop(); used[i] = false;         //@unchoose
    }
  }
  backtrack();                             //@start
  return result;                           //@done
}`,
  presets: [
    { label: "a, b, c taken 2 at a time", input: { items: ["a", "b", "c"], k: 2 } },
    { label: "All permutations of x, y", input: { items: ["x", "y"], k: 2 } },
  ],
  fields: { items: { minItems: 2, maxItems: 4, maxLength: 2, chars: "a-z0-9" }, k: { min: 1, max: 4 } },
  validate: ({ items, k }) => {
    if (k > items.length) return `k can't be bigger than the ${items.length} items.`;
    let calls = 0;
    for (let d = 0, p = 1; d <= k; d++, p *= items.length - d + 1) calls += p;
    return distinctProblem("items", items) ?? (calls > 22 && `That makes ${calls} calls. Keep it to 22 so the tree fits: try fewer items or a smaller k.`);
  },
  run(t, { items, k }) {
    const tree = new CallTree();
    tree.add("root", "[]", null);
    const build = (p: string[]) => {
      if (p.length === k) return;
      for (const it of items) {
        if (p.includes(it)) continue;
        tree.add(idOf([...p, it]), [...p, it].join(","), idOf(p));
        build([...p, it]);
      }
    };
    build([]);
    tree.layout();

    const visible = new Set(["root"]);
    const status = new Map<string, Tone>();
    const used = items.map(() => false);
    const path: string[] = [];
    const result: string[] = [];
    let newest: string | null = null;
    const views = (currentTone: Tone = "active", itemTones: Record<number, Tone> = {}, extra: View[] = []): View[] => {
      const onStack = stackIds(path);
      const tones: Record<number, Tone> = {};
      const usedTones: Record<number, Tone> = {};
      used.forEach((u, i) => {
        if (u) tones[i] = usedTones[i] = "muted";
      });
      return [
        tree.view("recursion tree", visible, { tones: treeTones(status, onStack, onStack[onStack.length - 1], currentTone), path: onStack }),
        arr("items", items, { tones: { ...tones, ...itemTones } }),
        arr("used", used, { tones: usedTones }),
        stack("path", path),
        hashset("result", result, { tones: newest ? [[newest, "new"]] : [] }),
        ...extra,
      ];
    };
    t.step("start", `Start with an empty path and every used flag false. Unlike combinations, there is no start index: after choosing ${items[1]}, ${items[0]} may still come next.`, {
      views: views(),
      vars: { k, depth: 0, found: 0 },
    });

    const backtrack = () => {
      if (path.length === k) {
        result.push(path.join(""));
        newest = path.join("");
        status.set(idOf(path), "found");
        t.step("record", `The path ${fmtPath(path)} holds k = ${k} items: record a copy and return.`, { views: views("found"), vars: { k, depth: path.length, found: result.length } });
        newest = null;
        return;
      }
      for (let i = 0; i < items.length; i++) {
        if (used[i]) continue;
        const skipped = items.filter((_, j) => j < i && used[j]);
        used[i] = true;
        path.push(items[i]);
        visible.add(idOf(path));
        t.step(
          "choose",
          `${skipped.length ? `Skip ${skipped.join(" and ")}: used[] says ${skipped.length > 1 ? "they are" : "it is"} already in the path. ` : ""}Choose ${items[i]}: set used[${i}] = true and push it. The path is ${fmtPath(path)}.`,
          { views: views("new", { [i]: "new" }), vars: { i, depth: path.length, found: result.length } },
        );
        backtrack();
        const child = idOf(path);
        if (!status.has(child)) status.set(child, "done");
        path.pop();
        used[i] = false;
        t.step("unchoose", `Un-choose ${items[i]}: pop it and set used[${i}] = false, so sibling branches can use ${items[i]} in a later position.`, {
          views: views("active", { [i]: "compare" }),
          vars: { i, depth: path.length, found: result.length },
        });
      }
    };
    backtrack();
    status.set("root", "done");
    t.step("done", `Every item has been tried in every position: ${result.length} ordered selections, one per leaf of the tree.`, {
      views: views("done", {}, [note(`${result.length} arrangements: ${result.join(" ")}`, "found")]),
      vars: { k, found: result.length },
    });
  },
});

export const pruningTree = defineTrace({
  id: "subset-sum-pruning",
  title: "Pruning: stop as soon as a branch can't work",
  description:
    "Find groups of distinct positive numbers that add up to a target: the numbers are sorted, and as soon as the next number is bigger than what is still missing, the loop breaks and every later branch is skipped.",
  code: `
function subsetsWithSum(nums, target) {
  nums.sort((a, b) => a - b);
  const result = [], path = [];
  function backtrack(start, remaining) {
    if (remaining === 0) {
      result.push([...path]);                  //@record
      return;
    }
    for (let i = start; i < nums.length; i++) { //@loop
      if (nums[i] > remaining) break;          //@prune
      path.push(nums[i]);                      //@choose
      backtrack(i + 1, remaining - nums[i]);   //@explore
      path.pop();                              //@unchoose
    }
  }
  backtrack(0, target);                        //@start
  return result;                               //@done
}`,
  presets: [
    { label: "nums = [4, 1, 3, 2], target 5", input: { nums: [4, 1, 3, 2], target: 5 } },
    { label: "No answer: target 5 from [6, 2, 4]", input: { nums: [6, 2, 4], target: 5 } },
  ],
  fields: { nums: { min: 1, max: 20, maxItems: 6 }, target: { min: 1, max: 30 } },
  validate: ({ nums, target }) => {
    const dup = distinctProblem("nums", nums);
    if (dup) return dup;
    const sorted = [...nums].sort((a, b) => a - b);
    let calls = 1;
    const walk = (start: number, rem: number) => {
      if (rem === 0) return;
      for (let i = start; i < sorted.length; i++) {
        calls++;
        if (sorted[i] > rem) break;
        walk(i + 1, rem - sorted[i]);
      }
    };
    walk(0, target);
    return calls > 24 && `That search makes ${calls} calls. Keep it to 24 so the tree fits: try a smaller target or fewer numbers.`;
  },
  run(t, { nums, target }) {
    nums.sort((a, b) => a - b);
    const tree = new CallTree();
    tree.add("root", "[]", null);
    const build = (start: number, rem: number, p: number[]) => {
      if (rem === 0) return;
      for (let i = start; i < nums.length; i++) {
        tree.add(idOf([...p, nums[i]]), [...p, nums[i]].join(","), idOf(p));
        if (nums[i] > rem) break;
        build(i + 1, rem - nums[i], [...p, nums[i]]);
      }
    };
    build(0, target, []);
    tree.layout();

    const visible = new Set(["root"]);
    const status = new Map<string, Tone>();
    const remainingAt = new Map<string, number>([["root", target]]);
    const path: number[] = [];
    const result: string[] = [];
    let newest: string | null = null;
    const views = (currentTone: Tone = "active", extra: View[] = []): View[] => {
      const onStack = stackIds(path);
      return [
        tree.view("recursion tree (badge = amount still missing)", visible, {
          tones: treeTones(status, onStack, onStack[onStack.length - 1], currentTone),
          path: onStack,
          badges: [...remainingAt].filter(([id]) => visible.has(id)),
        }),
        arr("nums (sorted)", nums),
        stack("path", path),
        hashset("result", result, { tones: newest ? [[newest, "new"]] : [] }),
        ...extra,
      ];
    };
    t.step("start", `Sort the numbers: [${nums.join(", ")}]. Start at the root with ${target} still missing. Sorting is what makes pruning possible.`, {
      views: views(),
      vars: { target, remaining: target, depth: 0 },
    });

    const backtrack = (start: number, remaining: number) => {
      if (remaining === 0) {
        result.push(fmtPath(path));
        newest = fmtPath(path);
        status.set(idOf(path), "found");
        t.step("record", `Nothing is missing: ${path.join(" + ")} = ${target}. Record a copy of the path and return.`, { views: views("found"), vars: { target, remaining, depth: path.length } });
        newest = null;
        return;
      }
      let broke = false;
      for (let i = start; i < nums.length; i++) {
        if (nums[i] > remaining) {
          const cut = idOf([...path, nums[i]]);
          visible.add(cut);
          status.set(cut, "bad");
          const later = nums.slice(i + 1);
          t.step(
            "prune",
            `${nums[i]} is bigger than the ${remaining} still missing, so this branch can't work.${later.length ? ` The numbers after it (${later.join(", ")}) are even bigger, so break: none of them is tried.` : " Break without making the call."}`,
            { views: views(), vars: { target, remaining, i, depth: path.length } },
          );
          broke = true;
          break;
        }
        path.push(nums[i]);
        const id = idOf(path);
        visible.add(id);
        remainingAt.set(id, remaining - nums[i]);
        t.step("choose", `Choose ${nums[i]}: the path is ${fmtPath(path)} and ${remaining - nums[i]} is still missing. Explore with start = ${i + 1}, so ${nums[i]} isn't used twice.`, {
          views: views("new"),
          vars: { target, remaining: remaining - nums[i], i, depth: path.length },
        });
        backtrack(i + 1, remaining - nums[i]);
        if (!status.has(id)) status.set(id, "done");
        path.pop();
        t.step("unchoose", `Un-choose ${nums[i]}: the path is back to ${fmtPath(path)}, with ${remaining} missing. Try the next number.`, {
          views: views(),
          vars: { target, remaining, i, depth: path.length },
        });
      }
      if (!broke && start >= nums.length && path.length) {
        status.set(idOf(path), "muted");
        t.step("loop", `No numbers are left after ${path[path.length - 1]}, and ${remaining} is still missing: a dead end. Return.`, {
          views: views("muted"),
          vars: { target, remaining, depth: path.length },
        });
      }
    };
    backtrack(0, target);
    status.set("root", "done");
    t.step(
      "done",
      result.length
        ? `Search finished: ${result.length} group${result.length > 1 ? "s" : ""} add up to ${target}. The red nodes are branches the break cut off before they were ever called.`
        : `Search finished with no answer: every branch was cut the moment the next number overshot what was still missing, so the empty result costs only a handful of calls.`,
      {
        views: views("done", [note(result.length ? `Answer: ${result.join(" ")}` : "Answer: [] (no group adds up to the target)", result.length ? "found" : "bad")]),
        vars: { target, found: result.length },
      },
    );
  },
});

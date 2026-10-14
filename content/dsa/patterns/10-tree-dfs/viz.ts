import { arr, buildTree, defineTrace, NodeIds, note, stack, tree, type TNode } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";
import { bstProblem, treeProblem } from "@/components/algo/checks";

export const subtreeHeight = defineTrace({
  id: "tree-height",
  title: "Return a value up: the height of every subtree",
  description: "A post-order DFS asks each subtree for its height, then combines the two answers at the node; finished nodes show the height they returned.",
  code: `
function height(node) {              //@call
  if (node === null) return 0;        //@base
  const left = height(node.left);     //@left
  const right = height(node.right);   //@right
  return 1 + Math.max(left, right);   //@combine
}`,
  presets: [
    { label: "Uneven tree", input: { values: [8, 3, 10, 1, 6, null, 14, null, null, 4, 7] as (number | null)[] } },
    { label: "Skewed tree", input: { values: [1, 2, null, 3, null, 4] as (number | null)[] } },
  ],
  validate: ({ values }) => treeProblem(values),
  run(t, { values }) {
    const root = buildTree(values)!;
    const ids = new NodeIds();
    const heights = new Map<TNode, number>();
    const calls: TNode[] = [];
    const views = (current: TNode | null) => {
      const tones: [TNode, Tone][] = [...heights.keys()].map((n) => [n, "done"]);
      for (const n of calls) tones.push([n, n === current ? "active" : "window"]);
      return [
        tree("tree", root, { ids, tones, badges: [...heights].map(([n, h]) => [n, `h=${h}`]), pointers: current ? { node: current } : {} }),
        stack("call stack", calls.map((n) => `height(${String(n.val)})`), { tones: calls.length ? { [calls.length - 1]: "active" } : {} }),
      ];
    };
    const v = (n: TNode) => String(n.val);

    t.step("call", `Call height(${v(root)}) on the root. A node can't know its height until both subtrees have answered, so the work happens on the way back up (post-order).`, {
      views: views(null),
      vars: { node: v(root) },
    });

    const visit = (node: TNode): number => {
      calls.push(node);
      let left = 0;
      let right = 0;
      if (!node.left && !node.right) {
        t.step("base", `${v(node)} is a leaf. Both of its children are null, and the base case says an empty subtree has height 0.`, {
          views: views(node),
          vars: { node: v(node), left: 0, right: 0 },
        });
      } else {
        t.step("left", node.left ? `height(${v(node)}) first asks its left subtree, rooted at ${v(node.left)}, and waits on the call stack.` : `${v(node)} has no left child: height(null) returns 0 straight away.`, {
          views: views(node),
          vars: { node: v(node), left: node.left ? "?" : 0, right: "?" },
        });
        if (node.left) left = visit(node.left);
        t.step("right", node.right ? `The left side answered ${left}. Now height(${v(node)}) asks its right subtree, rooted at ${v(node.right)}.` : `The left side answered ${left}. There is no right child, so height(null) gives 0.`, {
          views: views(node),
          vars: { node: v(node), left, right: node.right ? "?" : 0 },
        });
        if (node.right) right = visit(node.right);
      }
      const h = 1 + Math.max(left, right);
      heights.set(node, h);
      calls.pop();
      t.step("combine", `Both answers are in: 1 + max(${left}, ${right}) = ${h}. height(${v(node)}) returns ${h} to ${calls.length ? `height(${v(calls[calls.length - 1])})` : "the caller"} and leaves the call stack.`, {
        views: views(calls[calls.length - 1] ?? null),
        vars: { node: v(node), left, right, height: h },
      });
      return h;
    };

    const total = visit(root);
    const longest: string[] = [];
    for (let n: TNode | null = root; n; ) {
      longest.push(v(n));
      const l: number = n.left ? heights.get(n.left)! : 0;
      const r: number = n.right ? heights.get(n.right)! : 0;
      n = l >= r ? n.left : n.right;
    }
    t.step("combine", `Every node was visited once and the root returned ${total}: the longest root-to-leaf path, ${longest.join(" → ")}, has ${total} nodes. O(n) time, O(h) stack.`, {
      views: [...views(null), note(`height(root) = ${total}`, "found")],
      vars: { height: total },
    });
  },
});

export const carryDown = defineTrace({
  id: "carry-down-max",
  title: "Carry state down: count the good nodes",
  description: "A pre-order DFS passes the largest value seen on the path so far down to each child; a node is good when it is at least that large.",
  code: `
function goodNodes(root) {
  const dfs = (node, maxSoFar) => {
    if (node === null) return 0;                   //@base
    const good = node.val >= maxSoFar ? 1 : 0;     //@check
    const nextMax = Math.max(maxSoFar, node.val);  //@carry
    return good + dfs(node.left, nextMax) + dfs(node.right, nextMax); //@recurse
  };
  return dfs(root, -Infinity);                     //@start
}`,
  presets: [
    { label: "Mixed values", input: { values: [5, 3, 8, 6, 2, 7, 9, 7] as (number | null)[] } },
    { label: "All negative", input: { values: [-1, -5, -3, null, -2] as (number | null)[] } },
  ],
  validate: ({ values }) => treeProblem(values),
  run(t, { values }) {
    const root = buildTree(values)!;
    const ids = new NodeIds();
    const verdict = new Map<TNode, Tone>();
    const carried = new Map<TNode, number>();
    let count = 0;
    const view = (current: TNode | null) =>
      tree("tree", root, {
        ids,
        tones: [...[...verdict].map(([n, tone]) => [n, tone] as [TNode, Tone]), ...(current ? [[current, "active"] as [TNode, Tone]] : [])],
        badges: [...carried].map(([n, m]) => [n, `max=${m === -Infinity ? "-∞" : m}`]),
        pointers: current ? { node: current } : {},
      });
    const fmt = (m: number) => (m === -Infinity ? "-∞" : String(m));

    t.step("start", "Start at the root with maxSoFar = -∞: nothing is above the root, so it is good whatever its value. Each badge shows the max a node receives from its ancestors.", {
      views: [view(null)],
      vars: { maxSoFar: "-∞", good: 0 },
    });

    const dfs = (node: TNode, maxSoFar: number) => {
      carried.set(node, maxSoFar);
      const good = (node.val as number) >= maxSoFar;
      if (good) count++;
      verdict.set(node, good ? "found" : "bad");
      t.step(
        "check",
        good
          ? `${String(node.val)} ≥ ${fmt(maxSoFar)}, the largest value above it, so ${String(node.val)} is good (count ${count}).`
          : `${String(node.val)} is smaller than ${fmt(maxSoFar)}, which sits somewhere above it on the path, so it is not good.`,
        { views: [view(node)], vars: { node: node.val as number, maxSoFar: fmt(maxSoFar), good: count } },
      );
      const nextMax = Math.max(maxSoFar, node.val as number);
      if (node.left || node.right) {
        t.step("carry", `Hand max(${fmt(maxSoFar)}, ${String(node.val)}) = ${nextMax} down to the children. Each child gets its own copy, so nothing has to be undone afterwards.`, {
          views: [view(node)],
          vars: { node: node.val as number, maxSoFar: fmt(maxSoFar), nextMax, good: count },
        });
      }
      if (node.left) dfs(node.left, nextMax);
      if (node.right) dfs(node.right, nextMax);
    };
    dfs(root, -Infinity);

    t.step("recurse", `Every call added its own 1 or 0 to what its children returned, and the root's call returns ${count}. Information flowed down (the max) and the count flowed back up.`, {
      views: [view(null), note(`Good nodes: ${count}`, "found")],
      vars: { good: count },
    });
  },
});

export const inorderStack = defineTrace({
  id: "inorder-stack",
  title: "Iterative DFS: in-order with an explicit stack",
  description: "An explicit stack replaces recursion: slide left pushing nodes, pop and visit one, then move into its right subtree. On a BST the output comes out sorted.",
  code: `
function inorder(root) {
  const out = [], stack = [];
  let node = root;                          //@init
  while (node !== null || stack.length) {   //@loop
    while (node !== null) {
      stack.push(node);                     //@push
      node = node.left;
    }
    node = stack.pop();                     //@pop
    out.push(node.val);                     //@visit
    node = node.right;                      //@right
  }
  return out;                               //@done
}`,
  presets: [
    { label: "Balanced BST", input: { values: [6, 3, 9, 1, 4, 8, 10] as (number | null)[] } },
    { label: "Left-skewed BST", input: { values: [4, 3, null, 2, null, 1] as (number | null)[] } },
  ],
  validate: ({ values }) => treeProblem(values) ?? bstProblem(values),
  run(t, { values }) {
    const root = buildTree(values);
    const ids = new NodeIds();
    const st: TNode[] = [];
    const out: unknown[] = [];
    const visited = new Set<TNode>();
    const views = (node: TNode | null, highlight: TNode | null = node) => {
      const tones: [TNode, Tone][] = [...visited].map((n) => [n, "done"]);
      for (const n of st) tones.push([n, "window"]);
      if (highlight) tones.push([highlight, "active"]);
      return [
        tree("tree", root, { ids, tones, pointers: node ? { node } : {} }),
        stack("stack", st.map((n) => n.val), { tones: st.length ? { [st.length - 1]: "active" } : {} }),
        arr("out", out, { tones: out.length ? { [out.length - 1]: "new" } : {} }),
      ];
    };
    let node = root;
    t.step("init", "Start with node at the root and an empty stack. The stack will hold the ancestors whose left side we are still exploring.", { views: views(node), vars: { node: node ? (node.val as number) : null } });
    while (node !== null || st.length) {
      while (node !== null) {
        st.push(node);
        const next: TNode | null = node.left;
        t.step(
          "push",
          next
            ? `Push ${String(node.val)}: it must wait until everything smaller (its left subtree) is done. Slide left to ${String(next.val)}.`
            : `Push ${String(node.val)}. It has no left child, so nothing smaller is left to explore below it.`,
          { views: views(next, node), vars: { node: next ? (next.val as number) : null, stackSize: st.length } },
        );
        node = next;
      }
      const top = st.pop()!;
      visited.add(top);
      out.push(top.val);
      t.step("visit", `Pop ${String(top.val)} and visit it: its whole left subtree is already in out, so it is the smallest value not yet output.`, {
        views: views(top),
        vars: { node: top.val as number, stackSize: st.length },
      });
      node = top.right;
      t.step(
        "right",
        node
          ? `Move into ${String(top.val)}'s right subtree (${String(node.val)}): those values come after ${String(top.val)} and before anything still on the stack.`
          : st.length
            ? `${String(top.val)} has no right subtree, so the next value to output is the one on top of the stack (${String(st[st.length - 1].val)}).`
            : `${String(top.val)} has no right subtree and the stack is empty: there is nothing left to visit.`,
        { views: views(node, node ?? null), vars: { node: node ? (node.val as number) : null, stackSize: st.length } },
      );
    }
    t.step("done", `node is null and the stack is empty, so every node was pushed once and popped once. out is sorted: [${out.join(", ")}].`, {
      views: [...views(null), note(`In-order: ${out.join(", ")}`, "found")],
      vars: { node: null, stackSize: 0 },
    });
  },
});

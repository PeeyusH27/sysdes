import { arr, buildTree, defineTrace, NodeIds, note, queue, tree, type TNode } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";
import { treeProblem } from "@/components/algo/checks";

export const levelLoop = defineTrace({
  id: "bfs-level-max",
  title: "Queue + level-size loop: the largest value on each level",
  description: "BFS takes a snapshot of the queue length at the start of each level, processes exactly that many nodes, and enqueues their children for the next level.",
  code: `
function levelMaxes(root) {
  if (root === null) return [];
  const result = [], queue = [root];
  let head = 0;                                //@init
  while (head < queue.length) {
    const size = queue.length - head;          //@size
    let max = -Infinity;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];              //@dequeue
      max = Math.max(max, node.val);
      if (node.left) queue.push(node.left);    //@push
      if (node.right) queue.push(node.right);
    }
    result.push(max);                          //@record
  }
  return result;                               //@done
}`,
  presets: [
    { label: "Four levels", input: { values: [8, 3, 10, 1, 6, null, 14, null, null, 4, 7] as (number | null)[] } },
    { label: "Negative values", input: { values: [-4, -7, -2, -9, null, null, -5] as (number | null)[] } },
  ],
  validate: ({ values }) => treeProblem(values),
  run(t, { values }) {
    const root = buildTree(values)!;
    const ids = new NodeIds();
    const q: TNode[] = [root];
    let head = 0;
    const result: number[] = [];
    const done = new Set<TNode>();
    const views = (current: TNode | null, levelEnd: number) => {
      const tones: [TNode, Tone][] = [...done].map((n) => [n, "done"]);
      for (let i = head; i < q.length; i++) tones.push([q[i], i < levelEnd ? "window" : "new"]);
      if (current) tones.push([current, "active"]);
      const waiting = q.slice(head);
      return [
        tree("tree", root, { ids, tones, pointers: current ? { node: current } : {} }),
        queue("queue (front first)", waiting.map((n) => n.val), { tones: Object.fromEntries(waiting.map((_, i) => [i, head + i < levelEnd ? "window" : "new"])) }),
        arr("result", result, { tones: result.length ? { [result.length - 1]: "new" } : {} }),
      ];
    };
    const fmt = (m: number) => (m === -Infinity ? "-∞" : String(m));
    t.step("init", "Put the root in the queue. The queue will always hold the rest of the current level, followed by the start of the next one.", { views: views(null, 1), vars: { head: 0, size: "?", max: "-∞" } });
    let level = 0;
    while (head < q.length) {
      level++;
      const size = q.length - head;
      const levelEnd = q.length;
      t.step("size", `Level ${level} starts. ${size === 1 ? "Exactly 1 node is waiting, and it is" : `Exactly ${size} nodes are waiting, and they are`} the whole level: snapshot size = ${size} before anything new is added.`, {
        views: views(null, levelEnd),
        vars: { level, head, size, max: "-∞" },
      });
      let max = -Infinity;
      for (let i = 0; i < size; i++) {
        const node = q[head++];
        max = Math.max(max, node.val as number);
        const kids = [node.left, node.right].filter((c): c is TNode => c !== null);
        for (const c of kids) q.push(c);
        done.add(node);
        t.step(
          "push",
          `Take ${String(node.val)} from the front (head moves to ${head}); max on this level is now ${fmt(max)}. ${kids.length === 2 ? `Its children ${String(kids[0].val)} and ${String(kids[1].val)} join the back, behind the rest of level ${level}.` : kids.length === 1 ? `Its child ${String(kids[0].val)} joins the back, behind the rest of level ${level}.` : "It has no children to enqueue."}`,
          { views: views(node, levelEnd), vars: { level, head, size, i, max } },
        );
      }
      result.push(max);
      t.step("record", `${size === 1 ? `The only node of level ${level} is done` : `All ${size} nodes of level ${level} are done`}, so record ${max}. ${head < q.length ? `Whatever is in the queue now is exactly level ${level + 1}.` : "Nothing was enqueued, so this was the last level."}`, {
        views: views(null, q.length),
        vars: { level, head, size, max },
      });
    }
    t.step("done", `The queue is empty: every node was enqueued once and dequeued once, O(n). The largest value on each level: [${result.join(", ")}].`, {
      views: [...views(null, q.length), note(`Result: [${result.join(", ")}]`, "found")],
      vars: { head, max: result[result.length - 1] },
    });
  },
});

export const firstLeaf = defineTrace({
  id: "bfs-first-leaf",
  title: "Early exit: the first leaf BFS meets is the shallowest",
  description: "BFS visits nodes in order of depth, so it can return as soon as it dequeues a leaf; the queue is a plain array with a head index, so nothing is ever shifted.",
  code: `
function minDepth(root) {
  if (root === null) return 0;
  const queue = [root];
  let head = 0, depth = 0;                         //@init
  while (head < queue.length) {
    depth++;                                       //@level
    const size = queue.length - head;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];                  //@dequeue
      if (!node.left && !node.right) return depth; //@leaf
      if (node.left) queue.push(node.left);        //@push
      if (node.right) queue.push(node.right);
    }
  }
}`,
  presets: [
    { label: "Shallow leaf on the right", input: { values: [1, 2, 3, 4, 5, null, null, 6, 7, 8] as (number | null)[] } },
    { label: "Root with one child", input: { values: [1, 2, null, 3, 4] as (number | null)[] } },
  ],
  validate: ({ values }) => treeProblem(values),
  run(t, { values }) {
    const root = buildTree(values)!;
    const ids = new NodeIds();
    const q: TNode[] = [root];
    let head = 0;
    let depth = 0;
    const seen = new Set<TNode>();
    const views = (current: TNode | null, extra: [TNode, Tone][] = [], finished = false) => {
      const tones: [TNode, Tone][] = [...seen].map((n) => [n, "done"]);
      for (let i = head; i < q.length; i++) tones.push([q[i], "window"]);
      if (current) tones.push([current, "active"]);
      return [
        tree("tree", root, { ids, tones: [...tones, ...extra], pointers: current ? { node: current } : {} }),
        arr("queue array", q.map((n) => n.val), { pointers: finished ? {} : { head }, tones: Object.fromEntries(q.map((_, i) => [i, i < head ? "muted" : "window"])) }),
      ];
    };
    t.step("init", "The queue is a plain array plus a head index. Dequeuing reads queue[head] and moves head forward; the array itself is never shifted, so each dequeue is O(1).", {
      views: views(null),
      vars: { head, depth },
    });
    while (head < q.length) {
      depth++;
      const size = q.length - head;
      t.step("level", depth === 1 ? "Depth 1 is just the root. If it has no children, the answer is 1." : `Depth ${depth}: ${size === 1 ? "the 1 node from head to the end of the array is" : `the ${size} nodes from head to the end of the array are`} this level. Every shallower node has been checked, and none of them was a leaf.`, {
        views: views(null),
        vars: { head, depth, size },
      });
      for (let i = 0; i < size; i++) {
        const node = q[head++];
        seen.add(node);
        t.step("dequeue", `Dequeue: read queue[${head - 1}] = ${String(node.val)} and move head to ${head}. The slots before head stay in the array but are out of play.`, {
          views: views(node),
          vars: { head, depth, size },
        });
        if (!node.left && !node.right) {
          const skipped: [TNode, Tone][] = [];
          const mark = (n: TNode | null) => {
            if (!n) return;
            if (!seen.has(n)) skipped.push([n, "muted"]);
            mark(n.left);
            mark(n.right);
          };
          mark(root);
          const untouched = skipped.length;
          t.step("leaf", `${String(node.val)} has no children: it is a leaf, and BFS reaches depths in increasing order, so no leaf can be shallower. Return ${depth}. The ${untouched} faded node${untouched === 1 ? " is" : "s are"} never visited.`, {
            views: [...views(node, [...skipped, [node, "found"]], true), note(`Minimum depth: ${depth}`, "found")],
            vars: { head, depth, size },
          });
          return;
        }
        const kids = [node.left, node.right].filter((c): c is TNode => c !== null);
        for (const c of kids) q.push(c);
        t.step(
          "push",
          `${String(node.val)} is not a leaf${kids.length === 1 ? " (one child is not enough: a leaf has none)" : ""}. Push ${kids.map((c) => String(c.val)).join(" and ")} onto the end of the array for the next depth.`,
          { views: views(node), vars: { head, depth, size } },
        );
      }
    }

  },
});

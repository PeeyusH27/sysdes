import { buildList, defineTrace, linked, note, type LNode } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

type Ptrs = Record<string, LNode | null | undefined>;

/** Drops undefined pointers (not in play yet); keeps explicit nulls, which are drawn on the "null" ghost. */
const only = (p: Ptrs) => Object.fromEntries(Object.entries(p).filter(([, n]) => n !== undefined)) as Record<string, LNode | null>;
/** Drops both undefined and null pointers (for pointers that simply ran off the end). */
const live = (p: Ptrs) => Object.fromEntries(Object.entries(p).filter(([, n]) => n)) as Record<string, LNode>;
const v = (n: LNode | null | undefined) => (n ? n.val : null);

export const reverseList = defineTrace({
  id: "reverse-list",
  title: "Reverse a list: save, flip, advance",
  description: "Three pointers walk the list once; each step saves curr.next, points curr back at prev, and moves prev and curr forward, so the arrows flip one by one.",
  code: `
function reverseList(head) {
  let prev = null, curr = head;   //@init
  while (curr) {
    const next = curr.next;       //@save
    curr.next = prev;             //@flip
    prev = curr;
    curr = next;                  //@advance
  }
  return prev;                    //@done
}`,
  presets: [
    { label: "Five nodes", input: { values: [1, 2, 3, 4, 5] } },
    { label: "Two nodes", input: { values: [7, 9] } },
  ],
  run(t, { values }) {
    const nodes = buildList(values);
    let prev: LNode | null = null;
    let curr: LNode | null = nodes[0];
    const reversed = new Set<LNode>();
    const view = (p: Ptrs, tones: [LNode, Tone][] = []) =>
      linked("list", nodes, { pointers: only(p), tones: [...[...reversed].map((n) => [n, "done"] as [LNode, Tone]), ...tones] });
    t.step("init", "prev starts as null: the first node will become the tail, and the tail must point to null. curr starts on the head.", { views: [view({ prev, curr }, [[curr, "active"]])], vars: { prev: null, curr: v(curr) } });
    while (curr) {
      const next: LNode | null = curr.next;
      t.step("save", next ? `Save curr.next (${next.val}) in next before touching anything. Once the arrow is flipped, next is the only way to reach the rest of the list.` : "Save curr.next: it is null, because curr is the last node.", {
        views: [view({ prev, curr, next: next ?? undefined }, [[curr, "active"], ...(next ? [[next, "compare"] as [LNode, Tone]] : [])])],
        vars: { prev: v(prev), curr: v(curr), next: v(next) },
      });
      curr.next = prev;
      reversed.add(curr);
      const flipText = !prev
        ? `Point ${curr.val} at prev, which is null: ${curr.val} is now the tail of the reversed part.`
        : next
          ? `Point ${curr.val} back at prev (${prev.val}). The arrow ${curr.val} → ${next.val} is gone, but next still holds the rest.`
          : `Point ${curr.val} back at prev (${prev.val}). Its old arrow went to null, so nothing is lost.`;
      t.step("flip", flipText, {
        views: [view({ prev, curr, next: next ?? undefined }, [[curr, "new"], ...(next ? [[next, "compare"] as [LNode, Tone]] : [])])],
        vars: { prev: v(prev), curr: v(curr), next: v(next) },
      });
      prev = curr;
      curr = next;
      t.step("advance", curr ? `Move prev to ${prev.val} (the reversed part now starts there) and curr to the saved next, ${curr.val}.` : `Move prev to ${prev.val} and curr to the saved next, which is null: every arrow has been flipped.`, {
        views: [view(curr ? { prev, curr } : { prev }, curr ? [[curr, "active"]] : [])],
        vars: { prev: v(prev), curr: v(curr) },
      });
    }
    t.step("done", `curr is null, so the loop ends. prev is on ${prev!.val}, the old tail, which is the new head.`, {
      views: [view({ prev }, nodes.map((n) => [n, "found"] as [LNode, Tone])), note(`New head: ${prev!.val} (reads ${[...values].reverse().join(" → ")})`, "found")],
      vars: { prev: v(prev) },
    });
  },
});

export const reverseSegment = defineTrace({
  id: "reverse-segment",
  title: "Reverse a sublist and splice it back",
  description: "Starting from a dummy node, the k nodes after `before` are reversed with prev, curr and next, then two links reconnect the reversed segment to the rest of the list.",
  code: `
function reverseAfter(before, k) {
  const first = before.next;          //@first
  let prev = null, curr = first;
  for (let i = 0; i < k; i++) {
    const next = curr.next;           //@save
    curr.next = prev;                 //@flip
    prev = curr; curr = next;         //@advance
  }
  before.next = prev;                 //@front
  first.next = curr;                  //@back
  return first;                       //@done
}`,
  presets: [
    { label: "Middle segment", input: { values: [1, 2, 3, 4, 5, 6], beforePos: 2, k: 3 } },
    { label: "From the head", input: { values: [1, 2, 3, 4], beforePos: 0, k: 3 } },
  ],
  run(t, { values, beforePos, k }) {
    const nodes = buildList(["D", ...values]);
    const before = nodes[beforePos];
    const first = before.next!;
    const segment = nodes.slice(beforePos + 1, beforePos + 1 + k);
    let prev: LNode | null = null;
    let curr: LNode | null = first;
    const view = (p: Ptrs, tones: [LNode, Tone][] = []) =>
      linked("list", nodes, { pointers: only(p), tones: [[nodes[0], "muted"], [before, "pivot"], ...segment.map((n) => [n, "window"] as [LNode, Tone]), ...tones] });
    const where = beforePos === 0 ? "D is a dummy node in front of the head, so a segment that starts at the head still has a node before it." : `D is a dummy node in front of the head. before is node ${before.val}, found by walking ${beforePos} steps from D.`;
    t.step("first", `${where} first = before.next = ${first.val}: after the reversal it will be the segment's last node.`, { views: [view({ before, first })], vars: { k, first: first.val } });
    for (let i = 0; i < k; i++) {
      const next: LNode | null = curr!.next;
      t.step("save", `Save next = ${v(next)} before flipping ${curr!.val}.`, { views: [view({ before, prev, curr, next: next ?? undefined }, [[curr!, "active"]])], vars: { i, prev: v(prev), curr: v(curr), next: v(next) } });
      curr!.next = prev;
      t.step("flip", prev ? `Point ${curr!.val} back at ${prev.val}.` : `Point ${curr!.val} at null for now. It is the segment's future tail; the last splice step will connect it to the rest of the list.`, {
        views: [view({ before, prev, curr, next: next ?? undefined }, [[curr!, "new"]])],
        vars: { i, prev: v(prev), curr: v(curr), next: v(next) },
      });
      prev = curr;
      curr = next;
      t.step("advance", `Move prev to ${prev!.val} and curr to ${v(curr)}. ${i + 1} of ${k} nodes reversed.`, { views: [view({ before, prev, curr: curr ?? undefined })], vars: { i: i + 1, prev: v(prev), curr: v(curr) } });
    }
    const reversedText = segment.map((n) => n.val).reverse().join(" → ");
    before.next = prev;
    t.step("front", `The segment now reads ${reversedText}, but before still pointed at ${first.val}, its old first node. Set before.next = prev, so ${before.val} → ${prev!.val}.`, {
      views: [view({ before, prev, curr: curr ?? undefined, first }, [[before, "new"]])],
      vars: { "before.next": v(before.next), "first.next": v(first.next) },
    });
    first.next = curr;
    t.step("back", `${first.val}, now the segment's last node, still points at null. Set first.next = curr (${v(curr)}) to reattach the rest of the list.`, {
      views: [view({ before, first, curr: curr ?? undefined }, [[first, "new"]])],
      vars: { "before.next": v(before.next), "first.next": v(first.next) },
    });
    const out: unknown[] = [];
    for (let n = nodes[0].next; n; n = n.next) out.push(n.val);
    t.step("done", `Return first (${first.val}): it is the node in front of whatever comes next, so the same call can reverse the next group. The list from D.next reads ${out.join(" → ")}.`, {
      views: [view({ before, first }, segment.map((n) => [n, "found"] as [LNode, Tone])), note(`D.next: ${out.join(" → ")}`, "found")],
      vars: { "before.next": v(before.next), "first.next": v(first.next) },
    });
  },
});

export const weaveHalves = defineTrace({
  id: "weave-halves",
  title: "Weave the front half with the reversed back half",
  description: "Two lists are interleaved in place: each step saves both successors, then points a at b and b at a's old successor, straightening the arrows into the final order.",
  code: `
function weave(a, b) {
  const head = a;                           //@init
  while (a && b) {
    const aNext = a.next, bNext = b.next;   //@save
    a.next = b;                             //@link-a
    b.next = aNext ?? bNext;                //@link-b
    a = aNext; b = bNext;                   //@advance
  }
  return head;                              //@done
}`,
  presets: [
    { label: "Halves of 1…6", input: { front: [1, 2, 3], back: [6, 5, 4] } },
    { label: "Halves of 1…5", input: { front: [1, 2, 3], back: [5, 4] } },
  ],
  run(t, { front, back }) {
    const A = buildList(front);
    const B = buildList(back);
    // Draw the nodes in the order they will end up in, so the arrows straighten out as the weave proceeds.
    const order: LNode[] = [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i]) order.push(A[i]);
      if (B[i]) order.push(B[i]);
    }
    let a: LNode | null = A[0];
    let b: LNode | null = B[0];
    const woven = new Set<LNode>();
    const view = (p: Ptrs, tones: [LNode, Tone][] = []) => linked("list", order, { pointers: live(p), tones: [...[...woven].map((n) => [n, "done"] as [LNode, Tone]), ...tones] });
    const total = front.length + back.length;
    t.step("init", `The list 1 → … → ${total} was cut after its middle (${front.at(-1)}) and the back half reversed: a = ${front.join(" → ")} and b = ${back.join(" → ")}. Nodes are drawn in their final order, so the curved arrows are the ones still to fix.`, {
      views: [view({ a, b }, [[a, "active"], [b, "compare"]])],
      vars: { a: v(a), b: v(b) },
    });
    while (a && b) {
      const aNext: LNode | null = a.next;
      const bNext: LNode | null = b.next;
      t.step("save", `Save both successors first: aNext = ${v(aNext)} and bNext = ${v(bNext)}. The next two lines overwrite a.next and b.next.`, {
        views: [view({ a, b, aNext, bNext }, [[a, "active"], [b, "compare"]])],
        vars: { a: v(a), b: v(b), aNext: v(aNext), bNext: v(bNext) },
      });
      a.next = b;
      t.step("link-a", `a.next = b: ${a.val} now points at ${b.val}.`, { views: [view({ a, b, aNext, bNext }, [[a, "new"], [b, "compare"]])], vars: { a: v(a), b: v(b), aNext: v(aNext), bNext: v(bNext) } });
      b.next = aNext ?? bNext;
      t.step("link-b", aNext ? `b.next = aNext: ${b.val} points at ${aNext.val}, so the front half continues after it.` : `aNext is null, so b keeps its own rest: ${b.val} points at ${v(bNext)}.`, {
        views: [view({ a, b, aNext, bNext }, [[a, "new"], [b, "new"]])],
        vars: { a: v(a), b: v(b), aNext: v(aNext), bNext: v(bNext) },
      });
      woven.add(a);
      woven.add(b);
      a = aNext;
      b = bNext;
      t.step("advance", b ? `Move a to ${v(a)} and b to ${v(b)}.` : a ? `b is null: the back half is used up. ${a.val} is already linked in its place at the end.` : "Both halves are used up.", {
        views: [view({ a, b }, [...(a ? [[a, "active"] as [LNode, Tone]] : []), ...(b ? [[b, "compare"] as [LNode, Tone]] : [])])],
        vars: { a: v(a), b: v(b) },
      });
    }
    const out: unknown[] = [];
    for (let n: LNode | null = A[0]; n; n = n.next) out.push(n.val);
    t.step("done", `Every arrow is straight: the list from the head reads ${out.join(" → ")}, first, last, second, second-to-last, and so on. No node was created or copied.`, {
      views: [view({ head: A[0] }, order.map((n) => [n, "found"] as [LNode, Tone])), note(out.join(" → "), "found")],
      vars: { head: A[0].val },
    });
  },
});

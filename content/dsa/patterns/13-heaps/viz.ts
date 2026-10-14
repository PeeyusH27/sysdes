import { arr, defineTrace, heapTree, note } from "@/components/algo/trace";
import type { Tone, View } from "@/components/algo/types";

const parentOf = (i: number) => (i - 1) >> 1;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const swap = <T>(a: T[], i: number, j: number) => ([a[i], a[j]] = [a[j], a[i]]);

/** Sift helpers for traces that show the heap only after each operation. */
function siftUp<T>(a: T[], i: number, less: (x: T, y: T) => boolean) {
  while (i > 0 && less(a[i], a[parentOf(i)])) {
    swap(a, i, parentOf(i));
    i = parentOf(i);
  }
}
function siftDown<T>(a: T[], i: number, less: (x: T, y: T) => boolean) {
  for (;;) {
    const l = 2 * i + 1;
    const r = l + 1;
    let best = i;
    if (l < a.length && less(a[l], a[best])) best = l;
    if (r < a.length && less(a[r], a[best])) best = r;
    if (best === i) return;
    swap(a, i, best);
    i = best;
  }
}
function heapPush<T>(a: T[], v: T, less: (x: T, y: T) => boolean) {
  a.push(v);
  siftUp(a, a.length - 1, less);
}
function heapPop<T>(a: T[], less: (x: T, y: T) => boolean): T {
  const top = a[0];
  const last = a.pop()!;
  if (a.length > 0) {
    a[0] = last;
    siftDown(a, 0, less);
  }
  return top;
}

export const heapPushPop = defineTrace({
  id: "heap-push-pop",
  title: "Min-heap: push sifts up, pop sifts down",
  description:
    "Values are pushed into an array-backed min-heap and swap upward past larger parents; pop takes the root, moves the last leaf to the top and swaps it down below its smaller child until the heap rule holds again.",
  code: `
const a = []; // the heap: a[0] is the minimum //@init

function push(value) {
  a.push(value);                            //@append
  let i = a.length - 1;
  while (i > 0) {                           //@upLoop
    const parent = (i - 1) >> 1;
    if (a[parent] <= a[i]) break;           //@upStop
    [a[i], a[parent]] = [a[parent], a[i]];  //@upSwap
    i = parent;
  }
}

function pop() {
  const top = a[0];                         //@top
  const last = a.pop();
  if (a.length === 0) return top;           //@empty
  a[0] = last;                              //@moveLast
  let i = 0;
  while (true) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let small = i;
    if (l < a.length && a[l] < a[small]) small = l;
    if (r < a.length && a[r] < a[small]) small = r;
    if (small === i) break;                 //@downStop
    [a[i], a[small]] = [a[small], a[i]];    //@downSwap
    i = small;
  }
  return top;                               //@return
}`,
  presets: [
    { label: "Push 5 values, pop 2", input: { pushes: [5, 3, 8, 1, 4], pops: 2 } },
    { label: "Pop until empty", input: { pushes: [6, 2, 9, 4], pops: 4 } },
  ],
  fields: { pushes: { maxItems: 10 }, pops: { min: 0, max: 10, help: "How many times to pop after the pushes." } },
  validate: ({ pushes, pops }) => pops > pushes.length && `Can't pop ${pops} times from a heap of ${pushes.length}.`,
  run(t, { pushes, pops }) {
    const a: number[] = [];
    const popped: number[] = [];
    const views = (tones: Record<number, Tone> = {}, pointers: Record<string, number> = {}, extra: View[] = []): View[] => [
      heapTree("heap as a tree", a, { tones }),
      ...(a.length ? [arr("the same heap as an array", a, { tones, pointers })] : []),
      ...(popped.length ? [arr("popped so far", popped)] : []),
      ...extra,
    ];
    t.step("init", "An empty min-heap. Its rule: every parent is less than or equal to its children, so the smallest value always sits at the root, index 0.", {
      views: views(),
      vars: { size: 0 },
    });

    for (const v of pushes) {
      a.push(v);
      let i = a.length - 1;
      if (i === 0) {
        t.step("append", `push(${v}): the heap is empty, so ${v} becomes the root.`, { views: views({ 0: "new" }, { i }), vars: { value: v, i, size: a.length } });
        continue;
      }
      t.step("append", `push(${v}): append it as the last leaf, index ${i}. Only the path from this leaf up to the root can break the heap rule now.`, {
        views: views({ [i]: "new" }, { i }),
        vars: { value: v, i, size: a.length },
      });
      let stopped = false;
      while (i > 0) {
        const p = parentOf(i);
        if (a[p] <= a[i]) {
          t.step("upStop", `${a[i]} is not smaller than its parent ${a[p]} (index ${p}), so the heap rule holds: stop.`, {
            views: views({ [i]: "active", [p]: "compare" }, { i, parent: p }),
            vars: { value: v, i, parent: p },
          });
          stopped = true;
          break;
        }
        swap(a, i, p);
        t.step("upSwap", `${v} is smaller than its parent ${a[i]}, so they swap: ${v} moves up to index ${p}.`, {
          views: views({ [p]: "active", [i]: "compare" }, { i: p }),
          vars: { value: v, i: p },
        });
        i = p;
      }
      if (!stopped) {
        t.step("upLoop", `${v} reached the root: it is the new minimum. A push costs at most one swap per level, O(log n).`, {
          views: views({ 0: "active" }, { i: 0 }),
          vars: { value: v, i: 0, size: a.length },
        });
      }
    }

    for (let k = 0; k < pops; k++) {
      const top = a[0];
      t.step("top", `pop(): the minimum is always at the root, so the answer is ${top}. The hard part is repairing the heap without it.`, {
        views: views({ 0: "found" }),
        vars: { top, size: a.length },
      });
      const last = a.pop()!;
      if (a.length === 0) {
        popped.push(top);
        t.step("empty", `${top} was the only value left, so the heap is now empty. Return ${top}.`, {
          views: views({}, {}, [note(`Popped in order: ${popped.join(", ")}: always the current minimum, so the output comes out sorted.`, "found")]),
          vars: { top, size: 0 },
        });
        continue;
      }
      a[0] = last;
      t.step("moveLast", `Move the last leaf, ${last}, into the root's place. The tree stays complete, but ${last} may be bigger than its children: sink it.`, {
        views: views({ 0: "active" }, { i: 0 }),
        vars: { top, i: 0, size: a.length },
      });
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let small = i;
        if (l < a.length && a[l] < a[small]) small = l;
        if (r < a.length && a[r] < a[small]) small = r;
        if (small === i) {
          const kids = [l, r].filter((c) => c < a.length);
          const tones: Record<number, Tone> = { [i]: "active" };
          kids.forEach((c) => (tones[c] = "compare"));
          t.step(
            "downStop",
            kids.length
              ? `${a[i]} is not bigger than its children (${kids.map((c) => a[c]).join(" and ")}), so the heap rule holds: stop.`
              : `${a[i]} has no children at index ${i}, so it can't sink further: stop.`,
            { views: views(tones, { i }), vars: { top, i, size: a.length } },
          );
          break;
        }
        swap(a, i, small);
        t.step("downSwap", `The smaller child, ${a[i]}, is smaller than ${last}: swap them so the smaller value moves up. ${last} sinks to index ${small}.`, {
          views: views({ [small]: "active", [i]: "compare" }, { i: small }),
          vars: { top, i: small, size: a.length },
        });
        i = small;
      }
      popped.push(top);
      const last2 = k === pops - 1;
      t.step("return", `Return ${top}. The heap is valid again after at most one swap per level: O(log n).`, {
        views: views({ 0: "pivot" }, {}, last2 ? [note(`Popped in order: ${popped.join(", ")}: each pop returns the current minimum.`, "found")] : []),
        vars: { top, size: a.length },
      });
    }
  },
});

interface Item {
  v: number;
  i: number;
}

export const topK = defineTrace({
  id: "top-k-min-heap",
  title: "Top k: a min-heap of size k keeps the k largest",
  description:
    "Each value is pushed into a min-heap; whenever the heap holds more than k values, the root (the smallest) is popped, so the heap always holds the k largest values seen so far and its root is the kth largest.",
  code: `
function kLargest(nums, k) {
  const heap = new Heap((a, b) => a - b);  //@init
  for (const x of nums) {
    heap.push(x);                          //@push
    if (heap.size() > k) heap.pop();       //@pop
  }
  return heap;   // root = kth largest     //@done
}`,
  presets: [
    { label: "k = 3", input: { nums: [3, 1, 5, 12, 2, 11, 7], k: 3 } },
    { label: "Duplicates, k = 2", input: { nums: [4, 4, 1, 4, 2], k: 2 } },
  ],
  fields: { k: { min: 1, max: 12 } },
  validate: ({ nums, k }) => k > nums.length && `k = ${k} is more than the ${nums.length} values in nums.`,
  run(t, { nums, k }) {
    const heap: Item[] = [];
    const less = (x: Item, y: Item) => x.v < y.v;
    const evicted = new Set<number>();
    const views = (cur: number | null, numTones: Record<number, Tone> = {}, heapTones: Record<number, Tone> = {}, extra: View[] = []): View[] => {
      const tones: Record<number, Tone> = {};
      for (const it of heap) tones[it.i] = "window";
      for (const i of evicted) tones[i] = "muted";
      return [
        arr("nums", nums, { pointers: cur === null ? {} : { x: cur }, tones: { ...tones, ...numTones } }),
        heapTree(`min-heap (at most k = ${k})`, heap.map((it) => it.v), { tones: heapTones }),
        ...extra,
      ];
    };
    t.step("init", `Keep a min-heap that never holds more than k = ${k} values. Its root is the smallest of the values kept: once the walk ends, that is the kth largest.`, {
      views: views(null),
      vars: { k, size: 0 },
    });
    nums.forEach((x, idx) => {
      heapPush(heap, { v: x, i: idx }, less);
      const at = heap.findIndex((it) => it.i === idx);
      t.step(
        "push",
        heap.length <= k
          ? `Push ${x}. The heap holds ${heap.length} of at most ${k} values, so nothing has to leave yet.`
          : `Push ${x}. Now the heap holds ${heap.length} values, one more than k: the smallest of them can't be in the top ${k}.`,
        { views: views(idx, { [idx]: "active" }, { [at]: "new" }), vars: { x, size: heap.length, root: heap[0].v } },
      );
      if (heap.length > k) {
        const out = heapPop(heap, less);
        evicted.add(out.i);
        t.step(
          "pop",
          out.i === idx
            ? `Pop the root, ${out.v}: the value we just pushed is the smallest, so it was never good enough for the top ${k}.`
            : `Pop the root, ${out.v}: the ${k} values left are all at least as big, so it is out for good. The new root, ${heap[0].v}, is the ${ordinal(k)} largest so far.`,
          { views: views(idx, { [out.i]: "bad" }, { 0: "pivot" }), vars: { x, size: heap.length, root: heap[0].v } },
        );
      }
    });
    const kept = heap.map((it) => it.v).sort((p, q) => q - p);
    t.step("done", `Every value was pushed once and popped at most once, each O(log k). The heap holds the ${k} largest values, ${kept.join(", ")}, and its root ${heap[0].v} is the ${ordinal(k)} largest.`, {
      views: views(null, {}, { 0: "found" }, [note(`Top ${k}: ${kept.join(", ")} · kth largest = ${heap[0].v}`, "found")]),
      vars: { size: heap.length, root: heap[0].v },
    });
  },
});

interface Head {
  value: number;
  list: number;
  index: number;
}

export const kWayMerge = defineTrace({
  id: "k-way-merge",
  title: "K-way merge: a heap of the current heads",
  description:
    "The first value of every sorted array goes into a min-heap; popping the smallest head gives the next output value, and that array's next value is pushed in its place until the heap is empty.",
  code: `
function mergeSorted(arrays) {
  const heap = new Heap((a, b) => a.value - b.value); //@init
  arrays.forEach((arr, list) => {
    if (arr.length) heap.push({ value: arr[0], list, index: 0 }); //@seed
  });
  const out = [];
  while (heap.size() > 0) {
    const { value, list, index } = heap.pop();  //@pop
    out.push(value);
    if (index + 1 < arrays[list].length)
      heap.push({ value: arrays[list][index + 1], list, index: index + 1 }); //@advance
  }
  return out;                                   //@done
}`,
  presets: [
    { label: "Three arrays", input: { arrays: [[1, 4, 9], [2, 3, 10], [5, 6]] } },
    { label: "An empty array and duplicates", input: { arrays: [[1, 1], [], [0, 1, 2]] } },
  ],
  fields: { arrays: { maxItems: 5, maxRow: 5, help: "One array per line, numbers separated by spaces, - for an empty one (up to 5 arrays)." } },
  validate: ({ arrays }) => {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    if (total === 0) return "Give at least one array some values.";
    return total > 12 && `That is ${total} values in total. Keep it to 12 so the output fits.`;
  },
  prepare: (input, say) => {
    if (input.arrays.every((a) => a.every((x, i) => i === 0 || a[i - 1] <= x))) return input;
    say("Sorted each array first: k-way merge only works on sorted arrays.");
    return { ...input, arrays: input.arrays.map((a) => [...a].sort((x, y) => x - y)) };
  },
  run(t, { arrays }) {
    const names = ["A", "B", "C", "D", "E"];
    const heap: Head[] = [];
    const less = (x: Head, y: Head) => x.value < y.value;
    const next = arrays.map(() => 0);
    const out: number[] = [];
    const views = (heapTones: Record<number, Tone> = {}, listTone: [number, number, Tone] | null = null, extra: View[] = []): View[] => [
      ...arrays.map((a, l) => {
        const tones: Record<number, Tone> = {};
        for (let i = 0; i < next[l]; i++) tones[i] = "done";
        for (const h of heap) if (h.list === l) tones[h.index] = "window";
        if (listTone && listTone[0] === l) tones[listTone[1]] = listTone[2];
        return arr(`array ${names[l]}`, a, { pointers: a.length ? { head: Math.min(next[l], a.length) } : {}, tones });
      }),
      heapTree("min-heap of heads (badge = array)", heap.map((h) => h.value), {
        tones: heapTones,
        badges: Object.fromEntries(heap.map((h, i) => [i, names[h.list]])),
      }),
      ...(out.length ? [arr("out", out, { tones: { [out.length - 1]: "new" } })] : []),
      ...extra,
    ];
    t.step("init", `Every array is sorted, so the next output value is always one of the ${arrays.length} heads. A min-heap of heads finds the smallest in O(log k).`, {
      views: views(),
      vars: { k: arrays.length, heapSize: 0 },
    });
    arrays.forEach((a, l) => {
      if (a.length) heapPush(heap, { value: a[0], list: l, index: 0 }, less);
    });
    const empty = arrays.map((a, l) => (a.length ? null : names[l])).filter(Boolean);
    t.step("seed", `Push the first value of every array.${empty.length ? ` Array ${empty.join(", ")} is empty, so it contributes nothing.` : ""} The heap holds one entry per array, never more.`, {
      views: views(),
      vars: { k: arrays.length, heapSize: heap.length },
    });
    while (heap.length > 0) {
      const h = heapPop(heap, less);
      out.push(h.value);
      next[h.list] = h.index + 1;
      const more = h.index + 1 < arrays[h.list].length;
      const tie = heap.find((x) => x.value === h.value);
      t.step(
        "pop",
        `Pop ${h.value} from array ${names[h.list]}: it is the smallest head, so it is the next output value.${tie ? ` (It ties with array ${names[tie.list]}'s head; either order gives the same output.)` : ""}${more ? "" : ` Array ${names[h.list]} is now used up, so nothing replaces it.`}`,
        { views: views({}, [h.list, h.index, "found"]), vars: { value: h.value, list: names[h.list], heapSize: heap.length } },
      );
      if (more) {
        const nv = arrays[h.list][h.index + 1];
        heapPush(heap, { value: nv, list: h.list, index: h.index + 1 }, less);
        const at = heap.findIndex((x) => x.list === h.list);
        t.step("advance", `Array ${names[h.list]}'s next value, ${nv}, becomes its new head: push it. The heap again has one entry per unfinished array.`, {
          views: views({ [at]: "new" }, [h.list, h.index + 1, "new"]),
          vars: { value: nv, list: names[h.list], heapSize: heap.length },
        });
      }
    }
    t.step("done", `The heap is empty, so every value has been output in sorted order. Each of the ${out.length} values was pushed and popped once: O(N log k).`, {
      views: views({}, null, [note(`Merged: ${out.join(", ")}`, "found")]),
      vars: { heapSize: 0, total: out.length },
    });
  },
});

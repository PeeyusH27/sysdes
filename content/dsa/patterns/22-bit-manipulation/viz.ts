import { arr, defineTrace, grid, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** The lowest `width` bits of x, highest first. */
const bitsOf = (x: number, width: number) => Array.from({ length: width }, (_, k) => (x >> (width - 1 - k)) & 1);
const bin = (x: number, width: number) => bitsOf(x, width).join("");
const weights = (width: number) => Array.from({ length: width }, (_, k) => String(2 ** (width - 1 - k)));

export const xorAccumulate = defineTrace({
  id: "xor-accumulate",
  title: "XOR cancels pairs",
  description:
    "acc is XOR-ed with every value in turn. Each value flips the bits where it has a 1, so a value seen twice flips the same bits back, and only the bits of the value seen once survive.",
  code: `
function xorAll(nums) {
  let acc = 0;              //@init
  for (const x of nums) {
    acc ^= x;               //@xor
  }
  return acc;               //@done
}`,
  presets: [
    {
      label: "Single number",
      input: {
        nums: [5, 9, 3, 12, 3, 5, 12],
        width: 4,
        intro: "Every value appears twice except one.",
        outro: "The pairs 5, 3 and 12 cancelled, so acc is the single value",
      },
    },
    {
      label: "Missing number",
      input: {
        nums: [0, 1, 2, 3, 4, 3, 0, 4, 1],
        width: 3,
        intro: "Missing number as XOR: the first five values are the full range 0 to 4, the last four are the array [3, 0, 4, 1].",
        outro: "Every number in the array met its twin in the range, so acc is the missing number",
      },
    },
  ],
  fields: { nums: { min: 0, max: 63, maxItems: 10 }, width: false, intro: false, outro: false },
  prepare: (input) => ({
    ...input,
    width: Math.max(1, Math.max(...input.nums).toString(2).length),
    intro: "Every value is XOR-ed into acc.",
    outro: "Values seen an even number of times cancel out, so acc is the XOR of the rest",
  }),
  run(t, { nums, width, intro, outro }) {
    let acc = 0;
    const seen = new Map<number, number>();
    const rowLabels = [...nums.map(String), "acc"];
    const views = (i: number | null, flipped: number[] = [], final = false) => {
      const tones: [number, number, Tone][] = [];
      if (i !== null) bitsOf(nums[i], width).forEach((b, c) => b && tones.push([i, c, "active"]));
      flipped.forEach((c) => tones.push([nums.length, c, "new"]));
      if (final) bitsOf(acc, width).forEach((b, c) => b && tones.push([nums.length, c, "found"]));
      const cellTones: Record<number, Tone> = {};
      for (let k = 0; k < (i ?? nums.length); k++) cellTones[k] = "done";
      if (i !== null) cellTones[i] = "active";
      return [
        arr("nums", nums, { pointers: i === null ? {} : { x: i }, tones: cellTones }),
        grid("bits", [...nums.map((v) => bitsOf(v, width)), bitsOf(acc, width)], { rowLabels, colLabels: weights(width), tones }),
      ];
    };
    t.step("init", `${intro} acc starts at 0, all bits off. The grid shows every value in binary; the last row is acc.`, { views: views(null), vars: { acc } });
    nums.forEach((x, i) => {
      const before = acc;
      acc ^= x;
      const flipped = bitsOf(x, width).flatMap((b, c) => (b ? [c] : []));
      const count = (seen.get(x) ?? 0) + 1;
      seen.set(x, count);
      const cols = flipped.map((c) => weights(width)[c]).join(" and ");
      const tail = count === 2 ? ` This is the second ${x}: it flips back exactly the bits the first ${x} flipped.` : "";
      const caption =
        x === 0
          ? `acc ^= 0 changes nothing: 0 has no 1 bits, and x ^ 0 = x. acc stays ${acc}.${count === 2 ? " Both copies of 0 are now in, and they cancel like any other pair." : ""}`
          : `acc ^= ${x}: wherever ${x} has a 1 (the ${cols} column${flipped.length > 1 ? "s" : ""}), acc's bit flips. ${bin(before, width)} becomes ${bin(acc, width)}, so acc = ${acc}.${tail}`;
      t.step("xor", caption, {
        views: views(i, flipped),
        vars: { x, acc, [`acc (binary)`]: bin(acc, width) },
      });
    });
    t.step("done", `${outro}: ${acc}. Each bit of acc is the parity of its column: a column with an even number of 1s ends at 0.`, {
      views: [...views(null, [], true), note(`Return ${acc}`, "found")],
      vars: { acc, [`acc (binary)`]: bin(acc, width) },
    });
  },
});

export const popcountKernighan = defineTrace({
  id: "popcount-kernighan",
  title: "n & (n - 1) drops the lowest set bit",
  description:
    "Subtracting 1 flips the lowest set bit of n and every bit below it, so n & (n - 1) clears exactly that bit; counting the steps until n is 0 counts the set bits.",
  code: `
function popcount(n) {
  let count = 0;            //@init
  while (n !== 0) {
    const below = n - 1;    //@minus
    n = n & below;          //@and
    count++;
  }
  return count;             //@done
}`,
  presets: [
    { label: "n = 44 (101100)", input: { n: 44, width: 6 } },
    { label: "Power of two: n = 32", input: { n: 32, width: 6 } },
  ],
  fields: { n: { min: 1, max: 255 }, width: false },
  prepare: (input) => ({ ...input, width: Math.max(4, input.n.toString(2).length) }),
  run(t, { n, width }) {
    const start = n;
    let count = 0;
    const removed: number[] = [];
    const views = (rows: (number | null)[], tones: [number, number, Tone][] = []) => [
      grid("bits", rows.map((v) => (v === null ? Array(width).fill("") : bitsOf(v, width))), { rowLabels: ["n", "n - 1", "n & (n - 1)"], colLabels: weights(width), tones }),
      arr("bits removed", removed),
    ];
    t.step("init", `n = ${n} is ${bin(n, width)} in binary. Instead of testing all ${width} positions, remove one set bit per loop and count the loops.`, {
      views: views([n, null, null], bitsOf(n, width).flatMap((b, c): [number, number, Tone][] => (b ? [[0, c, "active"]] : []))),
      vars: { n, count },
    });
    while (n !== 0) {
      const below = n - 1;
      const low = n & -n;
      const lowCol = width - 1 - Math.log2(low);
      const changed: [number, number, Tone][] = [];
      for (let c = lowCol; c < width; c++) changed.push([0, c, "compare"], [1, c, "compare"]);
      t.step("minus", `n - 1 = ${below}. Subtracting 1 turns the lowest 1 of n (the ${low} bit) into 0 and every 0 below it into 1; the higher bits don't change.`, {
        views: views([n, below, null], changed),
        vars: { n, below, count },
      });
      const result = n & below;
      removed.push(low);
      count++;
      const tones: [number, number, Tone][] = [[2, lowCol, "bad"]];
      bitsOf(result, width).forEach((b, c) => b && tones.push([2, c, "found"]));
      t.step(
        "and",
        result === 0
          ? `${bin(n, width)} & ${bin(below, width)} = 0: the last set bit (${low}) is gone. count = ${count}.`
          : `${bin(n, width)} & ${bin(below, width)} = ${bin(result, width)}: the lower part cancels, so the ${low} bit is cleared and the higher bits stay. count = ${count}, and n becomes ${result}.`,
        { views: views([n, below, result], tones), vars: { n: result, below, count } },
      );
      n = result;
    }
    t.step(
      "done",
      count === 1
        ? `n is 0 after a single step, so ${start} has exactly one set bit: it is a power of two. That is why n > 0 && (n & (n - 1)) === 0 tests for powers of two.`
        : `n is 0 after ${count} loops, one per set bit. The removed bits ${removed.join(" + ")} add back up to ${start}.`,
      { views: [...views([0, null, null]), note(`popcount(${start}) = ${count}`, "found")], vars: { n: 0, count } },
    );
  },
});

export const subsetMasks = defineTrace({
  id: "subset-masks",
  title: "Subsets as bitmasks",
  description:
    "Counting mask from 0 to 2^n - 1 visits every pattern of n bits once; bit i of the mask says whether items[i] is in the subset, so each mask is exactly one subset.",
  code: `
function subsets(items) {
  const out = [];                                         //@init
  for (let mask = 0; mask < 1 << items.length; mask++) {
    const subset = [];
    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) subset.push(items[i]);         //@pick
    }
    out.push(subset);                                     //@push
  }
  return out;                                             //@done
}`,
  presets: [{ label: "Three items", input: { items: ["a", "b", "c"] } }],
  fields: { items: { maxItems: 4, maxLength: 3, chars: "a-z0-9" } },
  run(t, { items }) {
    const n = items.length;
    const total = 1 << n;
    const masks = Array.from({ length: total }, (_, m) => bitsOf(m, n));
    const colLabels = [...items].reverse(); // the highest bit is drawn on the left
    const views = (mask: number | null, subset: string[]) => {
      const tones: [number, number, Tone][] = [];
      for (let m = 0; m < (mask ?? total); m++) bitsOf(m, n).forEach((b, c) => b && tones.push([m, c, "done"]));
      if (mask !== null) bitsOf(mask, n).forEach((b, c) => tones.push([mask, c, b ? "found" : "muted"]));
      const itemTones: Record<number, Tone> = {};
      if (mask !== null) items.forEach((_, i) => (itemTones[i] = mask & (1 << i) ? "found" : "muted"));
      return [
        grid("masks", masks, { rowLabels: masks.map((_, m) => m), colLabels, tones }),
        arr("items", items, { tones: itemTones }),
        arr("subset", subset),
      ];
    };
    t.step("init", `${n} items, so ${total} masks: 0 to ${total - 1}. Each column of the grid is one item (bit 0 is ${items[0]}, on the right), and each row is one mask.`, {
      views: views(null, []),
      vars: { mask: 0, subsets: 0 },
    });
    for (let mask = 0; mask < total; mask++) {
      const subset = items.filter((_, i) => mask & (1 << i));
      const picked = items.flatMap((it, i) => (mask & (1 << i) ? [`bit ${i} (${it})`] : []));
      t.step(
        "push",
        mask === 0
          ? `mask = 0 = ${bin(0, n)}: no bit is set, so the subset is empty. The empty set counts.`
          : `mask = ${mask} = ${bin(mask, n)}: ${picked.join(" and ")} ${picked.length > 1 ? "are" : "is"} set, so the subset is [${subset.join(", ")}].`,
        { views: views(mask, subset), vars: { mask, binary: bin(mask, n), subsets: mask + 1 } },
      );
    }
    t.step("done", `All ${total} masks are used, so every subset appears exactly once: each bit is one include-or-skip choice, and counting runs through every combination of choices.`, {
      views: [...views(null, []), note(`${total} subsets`, "found")],
      vars: { mask: total, subsets: total },
    });
  },
});

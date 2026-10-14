import { arr, defineTrace, note, span } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";
import { sortField } from "@/components/algo/checks";

/** Indices outside [lo, hi] have been ruled out: show them muted. */
const outside = (n: number, lo: number, hi: number) => {
  const t: Record<number, Tone> = {};
  for (let i = 0; i < n; i++) if (i < lo || i > hi) t[i] = "muted";
  return t;
};

export const classicSearch = defineTrace({
  id: "classic-binary-search",
  title: "Exact match: halve the range until the target is found",
  description: "Binary search keeps an inclusive range [lo, hi] that must contain the target if it exists, compares the middle element and discards the half that cannot contain it.",
  code: `
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;        //@init
  while (lo <= hi) {                       //@loop
    const mid = Math.floor((lo + hi) / 2); //@mid
    if (nums[mid] === target) return mid;  //@found
    if (nums[mid] < target) lo = mid + 1;  //@right
    else hi = mid - 1;                     //@left
  }
  return -1;                               //@none
}`,
  presets: [
    { label: "Target present", input: { nums: [3, 8, 12, 17, 21, 30, 44, 52], target: 44 } },
    { label: "Target missing", input: { nums: [3, 8, 12, 17, 21, 30, 44, 52], target: 10 } },
  ],
  prepare: (input, say) => sortField(input, "nums", "binary search only works on sorted values.", say),
  run(t, { nums, target }) {
    let lo = 0;
    let hi = nums.length - 1;
    let checks = 0;
    const view = (mid: number | null, tones: Record<number, Tone> = {}) =>
      arr("nums", nums, { pointers: mid === null ? { lo, hi } : { lo, mid, hi }, tones: { ...outside(nums.length, lo, hi), ...tones } });
    t.step("init", `The array is sorted. If ${target} is anywhere, it is inside [lo, hi] = [0, ${hi}]: that sentence is the invariant every step must keep true.`, {
      views: [view(null)],
      vars: { target, lo, hi },
    });
    while (lo <= hi) {
      const size = hi - lo + 1;
      t.step("loop", `lo <= hi, so the range is not empty yet: ${size === 1 ? `only index ${lo} is left` : `${size} candidates, indices ${lo} to ${hi}`}.`, { views: [view(null, span(lo, hi, "window"))], vars: { target, lo, hi } });
      const mid = Math.floor((lo + hi) / 2);
      checks++;
      t.step("mid", `The middle of [${lo}, ${hi}] is index ${mid}, rounding down. Compare nums[${mid}] = ${nums[mid]} with ${target}.`, {
        views: [view(mid, { [mid]: "pivot" })],
        vars: { target, lo, hi, mid },
      });
      if (nums[mid] === target) {
        t.step("found", `nums[${mid}] is ${target}: return ${mid}. Binary search looked at ${checks} elements; a left-to-right scan would have looked at ${mid + 1}.`, {
          views: [view(mid, { [mid]: "found" }), note(`Answer: ${mid}`, "found")],
          vars: { target, lo, hi, mid },
        });
        return;
      }
      if (nums[mid] < target) {
        t.step("right", `${nums[mid]} < ${target}. The array is sorted, so index ${mid} and everything left of it are too small. Drop them: lo = ${mid + 1}.`, {
          views: [view(mid, span(lo, mid, "bad"))],
          vars: { target, lo, hi, mid },
        });
        lo = mid + 1;
      } else {
        t.step("left", `${nums[mid]} > ${target}, so index ${mid} and everything right of it are too big. Drop them: hi = ${mid - 1}.`, {
          views: [view(mid, span(mid, hi, "bad"))],
          vars: { target, lo, hi, mid },
        });
        hi = mid - 1;
      }
    }
    t.step("none", `lo (${lo}) has passed hi (${hi}): the range is empty. By the invariant, ${target} is not in the array, so return -1 after only ${checks} comparisons.`, {
      views: [view(null), note("Answer: -1", "bad")],
      vars: { target, lo, hi },
    });
  },
});

export const lowerBound = defineTrace({
  id: "lower-bound",
  title: "First true: the first index with nums[i] >= target",
  description: "The lower bound search keeps the first index whose value is at least the target inside [lo, hi], with hi starting one past the end, and shrinks the range until lo equals hi.",
  code: `
function lowerBound(nums, target) {
  let lo = 0, hi = nums.length;            //@init
  while (lo < hi) {                        //@loop
    const mid = Math.floor((lo + hi) / 2); //@mid
    if (nums[mid] < target) lo = mid + 1;  //@right
    else hi = mid;                         //@left
  }
  return lo;                               //@done
}`,
  presets: [
    { label: "Duplicates", input: { nums: [1, 3, 3, 3, 5, 8, 9], target: 3 } },
    { label: "Bigger than everything", input: { nums: [1, 3, 3, 3, 5, 8, 9], target: 10 } },
  ],
  prepare: (input, say) => sortField(input, "nums", "binary search only works on sorted values.", say),
  run(t, { nums, target }) {
    let lo = 0;
    let hi = nums.length;
    const n = nums.length;
    // What the invariant lets us claim: before lo the test is false, from hi on it is true.
    const okRow = (mid: number | null, final = false) => {
      const values = nums.map((_, i) => (i < lo ? "F" : i >= hi ? "T" : "?"));
      const tones: Record<number, Tone> = {};
      for (let i = 0; i < n; i++) {
        if (i < lo) tones[i] = "bad";
        else if (i >= hi) tones[i] = final && i === lo ? "found" : "done";
      }
      if (mid !== null) tones[mid] = "pivot";
      return arr(`nums[i] >= ${target}?`, values, { pointers: { lo, hi }, tones });
    };
    const numsRow = (mid: number | null, tones: Record<number, Tone> = {}) => arr("nums", nums, { pointers: mid === null ? {} : { mid }, tones });
    t.step("init", `Ask "is nums[i] >= ${target}?" for every i. In a sorted array the answers go F, F, …, T, T, and we want the first T. It may not exist, so hi starts at ${n}, one past the end.`, {
      views: [numsRow(null), okRow(null)],
      vars: { target, lo, hi },
    });
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      t.step("mid", `The answer is somewhere in [${lo}, ${hi}]. Check the middle: mid = ${mid}, nums[${mid}] = ${nums[mid]}.`, {
        views: [numsRow(mid, { [mid]: "pivot" }), okRow(mid)],
        vars: { target, lo, hi, mid },
      });
      if (nums[mid] < target) {
        lo = mid + 1;
        t.step("right", `${nums[mid]} < ${target}: F. Every index up to ${mid} is F too (the array is sorted), so the first T is after mid: lo = ${lo}.`, {
          views: [numsRow(mid, { [mid]: "bad" }), okRow(null)],
          vars: { target, lo, hi, mid },
        });
      } else {
        hi = mid;
        t.step("left", `${nums[mid]} >= ${target}: T. Index ${mid} might be the first T, so keep it: hi = mid = ${hi}, not mid - 1.`, {
          views: [numsRow(mid, { [mid]: "done" }), okRow(null)],
          vars: { target, lo, hi, mid },
        });
      }
    }
    const inside = lo < n;
    t.step(
      "done",
      inside
        ? `lo === hi === ${lo}: one candidate is left, so it is the answer. Index ${lo} is the first value >= ${target}${nums[lo] === target ? `, the first copy of ${target}` : ""}.`
        : `lo === hi === ${lo} === nums.length: no value is >= ${target}. The answer "insert at the end" is index ${lo}.`,
      {
        views: [numsRow(null, inside ? { [lo]: "found" } : {}), okRow(null, true), note(`Answer: ${lo}`, "found")],
        vars: { target, lo, hi },
      },
    );
  },
});

export const searchOnAnswer = defineTrace({
  id: "search-on-answer",
  title: "On the answer: the smallest ship capacity that works",
  description: "Binary search over candidate capacities: for each middle capacity a greedy pass counts the days needed, and the range shrinks toward the smallest capacity that ships everything in time.",
  code: `
function shipWithinDays(weights, days) {
  let lo = Math.max(...weights);               //@init
  let hi = weights.reduce((a, b) => a + b, 0);
  while (lo < hi) {                            //@loop
    const mid = Math.floor((lo + hi) / 2);     //@mid
    if (daysNeeded(weights, mid) <= days) {    //@check
      hi = mid;                                //@fits
    } else {
      lo = mid + 1;                            //@short
    }
  }
  return lo;                                   //@done
}

function daysNeeded(weights, cap) {
  let used = 1, load = 0;
  for (const w of weights) {
    if (load + w > cap) { used++; load = 0; }  // start a new day
    load += w;
  }
  return used;
}`,
  presets: [
    { label: "Three days", input: { weights: [4, 2, 3, 1, 2], days: 3 } },
    { label: "One day", input: { weights: [4, 2, 3, 1, 2], days: 1 } },
  ],
  fields: { weights: { min: 1, max: 20, maxItems: 8 }, days: { min: 1, max: 8 } },
  validate: ({ weights }) => {
    const count = weights.reduce((a, b) => a + b, 0) - Math.max(...weights) + 1;
    return count > 16 && `That gives ${count} capacities to search. Keep the total weight minus the heaviest under 16 so the row fits.`;
  },
  run(t, { weights, days }) {
    let lo = Math.max(...weights);
    let hi = weights.reduce((a, b) => a + b, 0);
    let checks = 0;
    const base = lo;
    const caps = Array.from({ length: hi - base + 1 }, (_, i) => base + i);
    const split = (cap: number) => {
      const day: number[] = [];
      let used = 1;
      let load = 0;
      for (const w of weights) {
        if (load + w > cap) {
          used++;
          load = 0;
        }
        load += w;
        day.push(used);
      }
      return { day, used };
    };
    const capRow = (mid: number | null, final = false) => {
      const tones: Record<number, Tone> = {};
      caps.forEach((c, i) => {
        if (c < lo) tones[i] = "bad";
        else if (c >= hi) tones[i] = final && c === lo ? "found" : "done";
      });
      if (mid !== null) tones[mid - base] = "pivot";
      const pointers: Record<string, number> = { lo: lo - base, hi: hi - base };
      if (mid !== null) pointers.mid = mid - base;
      return arr("capacity", caps, { pointers, tones });
    };
    const weightRows = (cap: number | null) => {
      if (cap === null) return [arr("weights", weights)];
      const { day } = split(cap);
      const tones: Record<number, Tone> = {};
      day.forEach((d, i) => (tones[i] = d % 2 ? "window" : "compare"));
      return [arr("weights", weights, { tones }), arr(`day (capacity ${cap})`, day, { id: "day", tones })];
    };
    t.step("init", `A capacity below the heaviest package (${lo}) can never work, and ${hi} (everything at once) always does. So the answer is in [${lo}, ${hi}]: search those values, not array indices.`, {
      views: [capRow(null), ...weightRows(null)],
      vars: { days, lo, hi },
    });
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      t.step("mid", checks === 0 ? `Try the middle capacity, ${mid}. If it works, every bigger capacity works too; if not, every smaller one fails too. Either way one check rules out half the range.` : `The answer is in [${lo}, ${hi}]. Try the middle capacity, ${mid}.`, {
        views: [capRow(mid), ...weightRows(null)],
        vars: { days, lo, hi, mid },
      });
      const { used } = split(mid);
      checks++;
      t.step("check", `Pack greedily: fill each day until the next package would go over ${mid}. That takes ${used} day${used === 1 ? "" : "s"}${used <= days ? `, within the limit of ${days}` : `, more than the ${days} allowed`}.`, {
        views: [capRow(mid), ...weightRows(mid)],
        vars: { days, lo, hi, mid, used },
      });
      if (used <= days) {
        hi = mid;
        t.step("fits", `${mid} works, but a smaller capacity might too. Keep ${mid} as a candidate: hi = ${hi}.`, {
          views: [capRow(null), ...weightRows(mid)],
          vars: { days, lo, hi, mid, used },
        });
      } else {
        lo = mid + 1;
        t.step("short", `${mid} is too small, and so is every capacity below it. lo = ${lo}.`, {
          views: [capRow(null), ...weightRows(mid)],
          vars: { days, lo, hi, mid, used },
        });
      }
    }
    t.step("done", `lo === hi === ${lo}: the smallest capacity that ships everything within ${days} day${days === 1 ? "" : "s"}, found with ${checks} checks out of ${caps.length} candidates.`, {
      views: [capRow(null, true), ...weightRows(lo), note(`Answer: ${lo}`, "found")],
      vars: { days, lo, hi },
    });
  },
});

import { arr, defineTrace, note, span } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** Everything outside [left, right] has been ruled out: show it muted. */
const outside = (n: number, left: number, right: number) => {
  const t: Record<number, Tone> = {};
  for (let i = 0; i < n; i++) if (i < left || i > right) t[i] = "muted";
  return t;
};

export const pairSum = defineTrace({
  id: "pair-sum",
  title: "Opposite ends: find a pair with a target sum",
  description: "Two pointers start at both ends of a sorted array and move inward, discarding one value per step, until the pair is found or they meet.",
  code: `
function pairSum(nums, target) {
  let left = 0, right = nums.length - 1;      //@init
  while (left < right) {                      //@loop
    const sum = nums[left] + nums[right];     //@sum
    if (sum === target) return [left, right]; //@found
    if (sum < target) left++;                 //@inc
    else right--;                             //@dec
  }
  return [-1, -1];                            //@none
}`,
  presets: [
    { label: "Pair exists", input: { nums: [1, 3, 4, 6, 8, 11], target: 10 } },
    { label: "No pair", input: { nums: [2, 4, 5, 9], target: 12 } },
  ],
  run(t, { nums, target }) {
    let left = 0;
    let right = nums.length - 1;
    let checks = 0;
    const view = (tones: Record<number, Tone> = {}) => arr("nums", nums, { pointers: { left, right }, tones: { ...outside(nums.length, left, right), ...tones } });
    t.step("init", `The array is sorted. Put left on the smallest value (index 0) and right on the largest (index ${right}).`, { views: [view()], vars: { target, left, right } });
    while (left < right) {
      const sum = nums[left] + nums[right];
      checks++;
      t.step("sum", `nums[${left}] + nums[${right}] = ${nums[left]} + ${nums[right]} = ${sum}.`, { views: [view({ [left]: "active", [right]: "active" })], vars: { target, left, right, sum } });
      if (sum === target) {
        t.step("found", `${sum} equals the target, so return [${left}, ${right}]. We checked ${checks} pairs instead of all ${(nums.length * (nums.length - 1)) / 2}.`, {
          views: [view({ [left]: "found", [right]: "found" }), note(`Answer: [${left}, ${right}]`, "found")],
          vars: { target, left, right, sum },
        });
        return;
      }
      if (sum < target) {
        t.step("inc", `${sum} is too small. ${nums[left]} plus even the largest remaining value is too small, so ${nums[left]} can't be in any pair: move left right.`, {
          views: [view({ [left]: "bad", [right]: "active" })],
          vars: { target, left, right, sum },
        });
        left++;
      } else {
        t.step("dec", `${sum} is too big. ${nums[right]} plus even the smallest remaining value is too big, so ${nums[right]} can't be in any pair: move right left.`, {
          views: [view({ [left]: "active", [right]: "bad" })],
          vars: { target, left, right, sum },
        });
        right--;
      }
    }
    t.step("none", `left (${left}) has reached right (${right}): every value has been ruled out, so no pair adds up to ${target}.`, {
      views: [view(), note("Answer: [-1, -1]", "bad")],
      vars: { target, left, right },
    });
  },
});

export const removeDuplicates = defineTrace({
  id: "remove-duplicates",
  title: "Same direction: read and write pointers",
  description: "A read pointer scans every element while a write pointer marks the end of the unique prefix; new values are copied forward in place.",
  code: `
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;
  let write = 1;                                   //@init
  for (let read = 1; read < nums.length; read++) { //@loop
    if (nums[read] !== nums[write - 1]) {          //@check
      nums[write] = nums[read];                    //@copy
      write++;                                     //@advance
    }
  }
  return write;                                    //@done
}`,
  presets: [
    { label: "Sorted with repeats", input: { nums: [1, 1, 2, 3, 3, 3, 4] } },
    { label: "All the same", input: { nums: [7, 7, 7, 7] } },
  ],
  run(t, { nums }) {
    let write = 1;
    const view = (read: number | null, tones: Record<number, Tone> = {}) =>
      arr("nums", nums, { pointers: read === null ? { write } : { read, write }, window: [0, write - 1], tones: { ...span(0, write - 1, "done"), ...tones } });
    t.step("init", "nums[0] is always unique, so the unique prefix (the shaded band) starts as just index 0, and write points at the next free slot.", { views: [view(null)], vars: { write } });
    for (let read = 1; read < nums.length; read++) {
      if (nums[read] !== nums[write - 1]) {
        t.step("check", `nums[${read}] = ${nums[read]} differs from the last unique value ${nums[write - 1]}: it's new.`, { views: [view(read, { [read]: "active", [write - 1]: "compare" })], vars: { read, write } });
        nums[write] = nums[read];
        t.step("copy", `Copy ${nums[read]} into the next free slot, index ${write}.`, { views: [view(read, { [read]: "active", [write]: "new" })], vars: { read, write } });
        write++;
        t.step("advance", `Move write to ${write}. The unique prefix is now ${nums.slice(0, write).join(", ")}.`, { views: [view(read)], vars: { read, write } });
      } else {
        t.step("check", `nums[${read}] = ${nums[read]} equals the last unique value: a duplicate. Skip it; write stays at ${write}.`, {
          views: [view(read, { [read]: "bad", [write - 1]: "compare" })],
          vars: { read, write },
        });
      }
    }
    t.step("done", `read has scanned everything. The first ${write} slots hold the unique values; whatever is after them doesn't matter. Return ${write}.`, {
      views: [view(null, { ...span(0, write - 1, "found") }), note(`Return ${write}: [${nums.slice(0, write).join(", ")}]`, "found")],
      vars: { write },
    });
  },
});

export const sortedSquares = defineTrace({
  id: "sorted-squares",
  title: "Two inputs, one output: fill from the back",
  description: "The largest square is at one of the two ends of a sorted array, so two pointers compare the ends and write the larger square into the result from the back.",
  code: `
function sortedSquares(nums) {
  const out = new Array(nums.length);
  let left = 0, right = nums.length - 1;           //@init
  for (let pos = nums.length - 1; pos >= 0; pos--) { //@loop
    const a = nums[left] ** 2, b = nums[right] ** 2; //@compare
    if (a > b) { out[pos] = a; left++; }           //@takeLeft
    else { out[pos] = b; right--; }                //@takeRight
  }
  return out;                                      //@done
}`,
  presets: [{ label: "Negatives and positives", input: { nums: [-4, -1, 0, 3, 10] } }],
  run(t, { nums }) {
    const out: (number | null)[] = nums.map(() => null);
    let left = 0;
    let right = nums.length - 1;
    const views = (pos: number | null, inTones: Record<number, Tone> = {}, outTones: Record<number, Tone> = {}) => [
      arr("nums", nums, { pointers: { left, right }, tones: { ...outside(nums.length, left, right), ...inTones } }),
      arr("out", out.map((v) => (v === null ? "" : v)), { pointers: pos === null ? {} : { pos }, tones: outTones }),
    ];
    t.step("init", "Squares of negatives can be large, so the biggest square is at one of the two ends. Fill the output from the back.", { views: views(nums.length - 1), vars: { left, right } });
    for (let pos = nums.length - 1; pos >= 0; pos--) {
      const a = nums[left] ** 2;
      const b = nums[right] ** 2;
      t.step("compare", `Compare the squares at the ends: ${nums[left]}² = ${a} and ${nums[right]}² = ${b}.`, { views: views(pos, { [left]: "active", [right]: "active" }), vars: { left, right, pos, a, b } });
      if (a > b) {
        out[pos] = a;
        t.step("takeLeft", `${a} is larger: write it at out[${pos}] and move left inward.`, { views: views(pos, { [left]: "found" }, { [pos]: "new" }), vars: { left, right, pos, a, b } });
        left++;
      } else {
        out[pos] = b;
        t.step("takeRight", `${b} is at least as large: write it at out[${pos}] and move right inward.`, { views: views(pos, { [right]: "found" }, { [pos]: "new" }), vars: { left, right, pos, a, b } });
        right--;
      }
    }
    t.step("done", "Every slot is filled, largest first from the back, so out is sorted. One pass, O(n).", { views: [...views(null, {}, span(0, nums.length - 1, "found"))], vars: { left, right } });
  },
});

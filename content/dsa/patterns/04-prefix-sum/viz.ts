import { arr, defineTrace, hashmap, note, span } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** Wraps negative numbers in parentheses inside arithmetic captions: 3 + (-2). */
const paren = (v: number) => (v < 0 ? `(${v})` : `${v}`);

export const prefixBuildQuery = defineTrace({
  id: "prefix-build-query",
  title: "Build running sums once, answer any range in O(1)",
  description: "A prefix array one longer than the input is filled with running totals; each range sum is then the difference of two prefix entries.",
  code: `
function buildPrefix(nums) {
  const prefix = new Array(nums.length + 1).fill(0); //@init
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];             //@build
  }
  return prefix;
}
function rangeSum(prefix, left, right) {
  return prefix[right + 1] - prefix[left];           //@query
}`,
  presets: [
    { label: "Two queries", input: { nums: [3, 1, 4, 1, 5, 9], queries: [[2, 4], [0, 5]] as [number, number][] } },
    { label: "Negatives, from index 0", input: { nums: [-2, 5, -1, 4], queries: [[0, 1], [1, 3]] as [number, number][] } },
  ],
  run(t, { nums, queries }) {
    const prefix: (number | string)[] = new Array(nums.length + 1).fill("");
    prefix[0] = 0;
    t.step("init", `prefix has ${nums.length + 1} slots: prefix[i] will be the sum of the first i values. prefix[0] = 0 is the empty sum, which saves a special case for ranges that start at 0.`, {
      views: [arr("nums", nums), arr("prefix", prefix, { tones: { 0: "new" } })],
      vars: { i: null },
    });
    for (let i = 0; i < nums.length; i++) {
      const prev = prefix[i] as number;
      prefix[i + 1] = prev + nums[i];
      t.step("build", `prefix[${i + 1}] = prefix[${i}] + nums[${i}] = ${prev} + ${paren(nums[i])} = ${prefix[i + 1]}: ${i === 0 ? "just the first value" : `the sum of the first ${i + 1} values`}.`, {
        views: [arr("nums", nums, { pointers: { i }, tones: { ...span(0, i, "done"), [i]: "active" } }), arr("prefix", prefix, { tones: { [i]: "compare", [i + 1]: "new" } })],
        vars: { i, running: prefix[i + 1] },
      });
    }
    for (const [left, right] of queries) {
      const hi = prefix[right + 1] as number;
      const lo = prefix[left] as number;
      const ans = hi - lo;
      t.step("query", `sum(nums[${left}..${right}]) = prefix[${right + 1}] - prefix[${left}] = ${hi} - ${paren(lo)} = ${ans}. prefix[${right + 1}] covers indices 0 to ${right}; ${left === 0 ? "prefix[0] = 0 removes nothing, because the range starts at the beginning." : `subtracting prefix[${left}] removes ${left === 1 ? "index 0" : `indices 0 to ${left - 1}`}.`}`, {
        views: [
          arr("nums", nums, { window: [left, right], tones: span(left, right, "found") }),
          arr("prefix", prefix, { tones: { [right + 1]: "active", [left]: "compare" } }),
          note(`sum(${left}..${right}) = ${ans}`, "found"),
        ],
        vars: { left, right, answer: ans },
      });
    }
  },
});

export const longestSumK = defineTrace({
  id: "prefix-first-index",
  title: "Prefix sum + hash map: longest subarray with sum k",
  description: "A running sum walks the array; a map stores the first index of every prefix sum, and an earlier prefix equal to sum - k marks the start of a subarray that sums to k.",
  code: `
function longestSubarrayWithSum(nums, k) {
  const firstIndex = new Map([[0, -1]]);           //@init
  let sum = 0, best = 0;
  for (let j = 0; j < nums.length; j++) {
    sum += nums[j];                                //@add
    if (firstIndex.has(sum - k))                   //@lookup
      best = Math.max(best, j - firstIndex.get(sum - k)); //@found
    if (!firstIndex.has(sum)) firstIndex.set(sum, j);     //@store
  }
  return best;                                     //@done
}`,
  presets: [
    { label: "Negatives", input: { nums: [2, -1, 3, -2, 1, 4], k: 3 } },
    { label: "Keep the first index", input: { nums: [0, 3, 0, 0], k: 3 } },
  ],
  run(t, { nums, k }) {
    const n = nums.length;
    const firstIndex = new Map<number, number>([[0, -1]]);
    let sum = 0;
    let best = 0;
    let bestRange: [number, number] = [0, -1];
    const done = (j: number) => {
      const tt: Record<number, Tone> = {};
      for (let x = 0; x < j; x++) tt[x] = "done";
      return tt;
    };
    t.step("init", `The map starts with 0 → -1: the empty prefix, "just before index 0", sums to 0. A subarray ending at j sums to ${k} when an earlier prefix sum equals sum - ${k}.`, {
      views: [arr("nums", nums), hashmap("firstIndex", firstIndex, { tones: [[0, "new"]] })],
      vars: { k, sum, best },
    });
    for (let j = 0; j < n; j++) {
      sum += nums[j];
      const need = sum - k;
      t.step("add", `Add nums[${j}] = ${nums[j]}: the running sum is now ${sum}. A subarray ending here sums to ${k} only if some earlier prefix summed to ${sum} - ${paren(k)} = ${need}.`, {
        views: [arr("nums", nums, { pointers: { j }, tones: { ...done(j), [j]: "active" } }), hashmap("firstIndex", firstIndex, { tones: firstIndex.has(need) ? [[need, "compare"]] : [] })],
        vars: { k, sum, need, best },
      });
      if (firstIndex.has(need)) {
        const start = firstIndex.get(need)! + 1;
        const len = j - start + 1;
        const better = len > best;
        if (better) {
          best = len;
          bestRange = [start, j];
        }
        t.step("found", `${need} first appeared at index ${start - 1}, so nums[${start}..${j}] sums to ${sum} - ${paren(need)} = ${k}. Its length is ${len}${better ? ": a new best" : `, not longer than ${best}`}.`, {
          views: [arr("nums", nums, { pointers: { j }, window: [start, j], tones: span(start, j, "found") }), hashmap("firstIndex", firstIndex, { tones: [[need, "found"]] })],
          vars: { k, sum, need, best },
        });
      } else {
        t.step("lookup", `No earlier prefix sums to ${need}, so no subarray ending at index ${j} sums to ${k}.`, {
          views: [arr("nums", nums, { pointers: { j }, tones: { ...done(j), [j]: "active" } }), hashmap("firstIndex", firstIndex)],
          vars: { k, sum, need, best },
        });
      }
      if (!firstIndex.has(sum)) {
        firstIndex.set(sum, j);
        t.step("store", `First time the running sum is ${sum}: remember ${sum} → ${j}.`, {
          views: [arr("nums", nums, { pointers: { j }, tones: { ...done(j), [j]: "new" } }), hashmap("firstIndex", firstIndex, { tones: [[sum, "new"]] })],
          vars: { k, sum, need, best },
        });
      } else {
        t.step("store", `The sum ${sum} was already seen at index ${firstIndex.get(sum)}. Keep that earlier index: a start further left gives a longer subarray.`, {
          views: [arr("nums", nums, { pointers: { j }, tones: { ...done(j), [j]: "active" } }), hashmap("firstIndex", firstIndex, { tones: [[sum, "compare"]] })],
          vars: { k, sum, need, best },
        });
      }
    }
    t.step("done", best ? `One pass, O(n). The longest subarray summing to ${k} is nums[${bestRange[0]}..${bestRange[1]}], length ${best}.` : `One pass, O(n). No subarray sums to ${k}: return 0.`, {
      views: [arr("nums", nums, { window: best ? bestRange : null, tones: best ? span(bestRange[0], bestRange[1], "found") : {} }), hashmap("firstIndex", firstIndex), note(`Answer: ${best}`, best ? "found" : "bad")],
      vars: { k, best },
    });
  },
});

export const differenceArray = defineTrace({
  id: "difference-array",
  title: "Difference array: many range updates, one pass",
  description: "Each range update writes +delta at its start and -delta just after its end; a running sum over the difference array then produces every final value.",
  code: `
function applyRangeAdds(n, updates) {
  const diff = new Array(n + 1).fill(0);           //@init
  for (const [left, right, delta] of updates) {
    diff[left] += delta;                           //@start
    diff[right + 1] -= delta;                      //@end
  }
  const out = new Array(n);
  let running = 0;
  for (let i = 0; i < n; i++) {
    running += diff[i];                            //@sum
    out[i] = running;
  }
  return out;                                      //@done
}`,
  presets: [
    { label: "Three updates", input: { n: 6, updates: [[1, 3, 2], [2, 5, 3], [0, 1, -1]] as [number, number, number][] } },
    { label: "Updates that cancel", input: { n: 4, updates: [[0, 2, 5], [0, 2, -5], [3, 3, 1]] as [number, number, number][] } },
  ],
  run(t, { n, updates }) {
    const diff = new Array(n + 1).fill(0);
    const out: (number | string)[] = new Array(n).fill("");
    t.step("init", `Instead of touching every index of every range, record only where values change. diff has one spare slot at index ${n} so right + 1 never falls off the end.`, {
      views: [arr("diff", diff), arr("out", out)],
      vars: { running: null },
    });
    for (const [left, right, delta] of updates) {
      diff[left] += delta;
      t.step("start", `Update: add ${delta} to indices ${left}..${right}. The change starts at ${left}: diff[${left}] += ${paren(delta)}.`, {
        views: [arr("diff", diff, { window: [left, right], tones: { [left]: "new" } }), arr("out", out)],
        vars: { left, right, delta },
      });
      diff[right + 1] -= delta;
      t.step("end", `It stops after ${right}: diff[${right + 1}] -= ${paren(delta)}. Two writes, whatever the range length.`, {
        views: [arr("diff", diff, { window: [left, right], tones: { [left]: "compare", [right + 1]: "new" } }), arr("out", out)],
        vars: { left, right, delta },
      });
    }
    let running = 0;
    for (let i = 0; i < n; i++) {
      running += diff[i];
      out[i] = running;
      t.step("sum", `Running sum of diff[0..${i}] = ${running}: every update whose range has started and not yet ended is counted once. out[${i}] = ${running}.`, {
        views: [arr("diff", diff, { pointers: { i }, tones: { ...span(0, i, "done"), [i]: "active" } }), arr("out", out, { tones: { [i]: "new" } })],
        vars: { i, running },
      });
    }
    t.step("done", `${updates.length} range updates cost O(1) each, and one O(n) pass built the result.`, {
      views: [arr("diff", diff, { tones: span(0, n, "done") }), arr("out", out, { tones: span(0, n - 1, "found") }), note(`Result: [${out.join(", ")}]`, "found")],
      vars: { running },
    });
  },
});

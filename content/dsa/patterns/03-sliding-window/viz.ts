import { arr, defineTrace, hashmap, note, queue, span } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** Inside [left, right] is the window; everything before left has left it for good. */
const windowTones = (n: number, left: number, right: number) => {
  const t: Record<number, Tone> = {};
  for (let i = 0; i < n; i++) if (i < left) t[i] = "muted";
  return { ...t, ...(right >= left ? span(left, right, "window") : {}) };
};

/** Wraps negative numbers in parentheses inside arithmetic captions: 3 + (-2). */
const paren = (v: number) => (v < 0 ? `(${v})` : `${v}`);

export const fixedWindow = defineTrace({
  id: "fixed-window-sum",
  title: "Fixed window: best sum of k consecutive values",
  description: "A window of size k slides one step at a time; its sum is updated by adding the value that enters and subtracting the value that leaves.",
  code: `
function maxWindowSum(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];      //@build
  let best = sum;                                  //@first
  for (let right = k; right < nums.length; right++) {
    sum += nums[right] - nums[right - k];          //@slide
    best = Math.max(best, sum);                    //@best
  }
  return best;                                     //@done
}`,
  presets: [
    { label: "Typical", input: { nums: [2, 1, 5, 1, 3, 2], k: 3 } },
    { label: "Negatives", input: { nums: [-1, 4, -2, 3, -5], k: 2 } },
  ],
  fields: { k: { min: 1, max: 12, help: "Window size, from 1 to the length of nums." } },
  validate: ({ nums, k }) => k > nums.length && `k = ${k} is longer than nums (${nums.length} values).`,
  run(t, { nums, k }) {
    const n = nums.length;
    let sum = 0;
    for (let i = 0; i < k; i++) {
      sum += nums[i];
      t.step("build", i === 0 ? `Build the first window of size ${k} from scratch, the only time we add up k values. Add ${nums[i]}: sum = ${sum}.` : `Add ${nums[i]}: sum = ${sum}.`, {
        views: [arr("nums", nums, { pointers: { i }, window: [0, i], tones: { ...span(0, i, "window"), [i]: "new" } })],
        vars: { k, sum },
      });
    }
    let best = sum;
    let bestAt = 0;
    t.step("first", `The first full window [${nums.slice(0, k).join(", ")}] sums to ${sum}. It's the best so far.`, {
      views: [arr("nums", nums, { pointers: { left: 0, right: k - 1 }, window: [0, k - 1], tones: span(0, k - 1, "window") })],
      vars: { k, sum, best },
    });
    for (let right = k; right < n; right++) {
      const left = right - k + 1;
      const out = nums[right - k];
      sum += nums[right] - out;
      t.step("slide", `Slide right by one: ${nums[right]} enters and ${out} leaves, so sum = ${sum + out - nums[right]} + ${paren(nums[right])} - ${paren(out)} = ${sum}. Two operations instead of re-adding ${k} values.`, {
        views: [arr("nums", nums, { pointers: { left, right }, window: [left, right], tones: { ...windowTones(n, left, right), [right]: "new", [right - k]: "bad" } })],
        vars: { k, sum, best },
      });
      if (sum > best) {
        best = sum;
        bestAt = left;
        t.step("best", `${sum} beats the previous best: best = ${best}.`, {
          views: [arr("nums", nums, { pointers: { left, right }, window: [left, right], tones: { ...windowTones(n, left, right), ...span(left, right, "found") } })],
          vars: { k, sum, best },
        });
      } else {
        t.step("best", `${sum} doesn't beat ${best}, so best stays.`, {
          views: [arr("nums", nums, { pointers: { left, right }, window: [left, right], tones: windowTones(n, left, right) })],
          vars: { k, sum, best },
        });
      }
    }
    t.step("done", `Every window of size ${k} was visited once, each in O(1). The best window is [${nums.slice(bestAt, bestAt + k).join(", ")}] with sum ${best}.`, {
      views: [arr("nums", nums, { window: [bestAt, bestAt + k - 1], tones: span(bestAt, bestAt + k - 1, "found") }), note(`Answer: ${best}`, "found")],
      vars: { k, best },
    });
  },
});

export const longestWindow = defineTrace({
  id: "longest-at-most-k-distinct",
  title: "Variable window: longest substring with at most k distinct characters",
  description: "The right edge adds one character per step; whenever the window holds more than k distinct characters, the left edge advances until it is valid again, and the longest valid window is recorded.",
  code: `
function longestAtMostKDistinct(s, k) {
  const count = new Map();                       //@init
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    count.set(s[right], (count.get(s[right]) ?? 0) + 1);  //@add
    while (count.size > k) {                     //@check
      const out = s[left];
      if (count.get(out) === 1) count.delete(out);
      else count.set(out, count.get(out) - 1);
      left++;                                    //@shrink
    }
    best = Math.max(best, right - left + 1);     //@record
  }
  return best;                                   //@done
}`,
  presets: [
    { label: "k = 2", input: { s: "abcbbca", k: 2 } },
    { label: "k = 1", input: { s: "aabbb", k: 1 } },
  ],
  fields: { s: { chars: "a-z", maxLength: 12, help: "Lowercase letters, up to 12." }, k: { min: 1, max: 6 } },
  run(t, { s, k }) {
    const chars = [...s];
    const n = chars.length;
    const count = new Map<string, number>();
    let left = 0;
    let best = 0;
    let bestRange: [number, number] = [0, -1];
    const view = (right: number, extra: Record<number, Tone> = {}) =>
      arr("s", chars, { pointers: right < 0 ? { left } : { left, right }, window: right < left ? null : [left, right], tones: { ...windowTones(n, left, right), ...extra } });
    t.step("init", `The window s[left..right] may hold at most ${k} distinct character${k === 1 ? "" : "s"}. The map counts the characters inside it; its size is the number of distinct ones.`, {
      views: [view(-1), hashmap("count", count)],
      vars: { k, left, best },
    });
    for (let right = 0; right < n; right++) {
      const ch = chars[right];
      count.set(ch, (count.get(ch) ?? 0) + 1);
      t.step("add", `Extend right to ${right}: '${ch}' enters. The window now has ${count.size} distinct character${count.size === 1 ? "" : "s"}.`, {
        views: [view(right, { [right]: "new" }), hashmap("count", count, { tones: [[ch, "new"]] })],
        vars: { k, left, right, best },
      });
      if (count.size > k) {
        t.step("check", `${count.size} distinct is more than ${k}: the window is invalid. Any window that still starts at ${left} and ends at ${right} or later is invalid too, so left must move.`, {
          views: [view(right, { [left]: "bad" }), hashmap("count", count, { tones: [...count.keys()].map((c) => [c, "bad"] as [string, Tone]) })],
          vars: { k, left, right, best },
        });
      }
      while (count.size > k) {
        const out = chars[left];
        if (count.get(out) === 1) count.delete(out);
        else count.set(out, count.get(out)! - 1);
        left++;
        const fixed = count.size <= k;
        t.step("shrink", `'${out}' leaves${count.has(out) ? ` (${count.get(out)} still inside)` : `, its count drops to 0 and it is deleted`}. ${fixed ? `Down to ${count.size} distinct: valid again.` : `Still ${count.size} distinct: keep shrinking.`}`, {
          views: [view(right, { [left - 1]: "bad" }), hashmap("count", count)],
          vars: { k, left, right, best },
        });
      }
      const len = right - left + 1;
      if (len > best) {
        best = len;
        bestRange = [left, right];
      }
      t.step("record", len === best && bestRange[0] === left && bestRange[1] === right ? `Valid window "${chars.slice(left, right + 1).join("")}" has length ${len}: a new best.` : `Valid window "${chars.slice(left, right + 1).join("")}" has length ${len}; best stays ${best}.`, {
        views: [view(right, bestRange[0] === left && bestRange[1] === right ? span(left, right, "found") : {}), hashmap("count", count)],
        vars: { k, left, right, best },
      });
    }
    t.step("done", `right reached the end. Each index entered once and left at most once, so this was O(n). Longest valid window: "${chars.slice(bestRange[0], bestRange[1] + 1).join("")}".`, {
      views: [arr("s", chars, { window: bestRange, tones: span(bestRange[0], bestRange[1], "found") }), note(`Answer: ${best}`, "found")],
      vars: { k, best },
    });
  },
});

export const windowMaxDeque = defineTrace({
  id: "window-max-deque",
  title: "Monotonic deque: maximum of every window of size k",
  description: "A deque of indices keeps values in decreasing order: indices that slide out leave from the front, smaller values are popped from the back, and the front is each window's maximum.",
  code: `
function windowMax(nums, k) {
  const dq = []; let head = 0; const out = [];             //@init
  for (let i = 0; i < nums.length; i++) {
    if (head < dq.length && dq[head] <= i - k) head++;      //@expire
    while (dq.length > head && nums[dq.at(-1)] <= nums[i]) dq.pop(); //@pop
    dq.push(i);                                             //@push
    if (i >= k - 1) out.push(nums[dq[head]]);               //@emit
  }
  return out;                                               //@done
}`,
  presets: [
    { label: "Mixed", input: { nums: [5, 3, 4, 1, 6, 2, 2], k: 3 } },
    { label: "Decreasing", input: { nums: [9, 7, 5, 3, 1], k: 3 } },
  ],
  fields: { k: { min: 1, max: 12, help: "Window size, from 1 to the length of nums." } },
  validate: ({ nums, k }) => k > nums.length && `k = ${k} is longer than nums (${nums.length} values).`,
  run(t, { nums, k }) {
    const n = nums.length;
    const dq: number[] = [];
    let head = 0;
    const out: number[] = [];
    const live = () => dq.slice(head);
    const views = (i: number, tones: Record<number, Tone> = {}, dqTones: Record<number, Tone> = {}) => {
      const left = Math.max(0, i - k + 1);
      const inDq: Record<number, Tone> = {};
      for (const j of live()) inDq[j] = "compare";
      return [
        arr("nums", nums, { pointers: i < 0 ? {} : { i }, window: i < 0 ? null : [left, i], tones: { ...(i < 0 ? {} : windowTones(n, left, i)), ...inDq, ...tones } }),
        queue("deque (value@index)", live().map((j) => `${nums[j]}@${j}`), { tones: dqTones }),
        arr("out", out, { indices: false }),
      ];
    };
    t.step("init", "The deque holds indices whose values decrease from front to back. Its front is always the current window's maximum.", {
      views: views(-1),
      vars: { k, i: null },
    });
    for (let i = 0; i < n; i++) {
      if (head < dq.length && dq[head] <= i - k) {
        const gone = dq[head];
        head++;
        t.step("expire", `Index ${gone} (value ${nums[gone]}) is no longer inside the window ${i - k + 1}..${i}: drop it from the front.`, {
          views: views(i, { [gone]: "bad" }),
          vars: { k, i },
        });
      }
      const popped: number[] = [];
      while (dq.length > head && nums[dq.at(-1)!] <= nums[i]) popped.push(dq.pop()!);
      if (popped.length) {
        t.step("pop", `${nums[i]} arrives. ${popped.map((j) => nums[j]).join(" and ")} ${popped.length === 1 ? "is" : "are"} no bigger than ${nums[i]} and will leave the window before it, so ${popped.length === 1 ? "it" : "they"} can never be a maximum again: pop from the back.`, {
          views: views(i, { [i]: "active", ...Object.fromEntries(popped.map((j) => [j, "bad" as Tone])) }),
          vars: { k, i },
        });
      }
      dq.push(i);
      t.step("push", `Push index ${i} (value ${nums[i]}) at the back. Values in the deque still decrease from front to back.`, {
        views: views(i, { [i]: "new" }, { [live().length - 1]: "new" }),
        vars: { k, i },
      });
      if (i >= k - 1) {
        out.push(nums[dq[head]]);
        t.step("emit", `The window ${i - k + 1}..${i} is full. Its maximum is the front of the deque: ${nums[dq[head]]}.`, {
          views: views(i, { [dq[head]]: "found" }, { 0: "found" }),
          vars: { k, i },
        });
      }
    }
    t.step("done", `Each index was pushed once and popped at most once, so the whole scan is O(n), not O(n · k). Maxima: [${out.join(", ")}].`, {
      views: [arr("nums", nums), arr("out", out, { indices: false, tones: span(0, out.length - 1, "found") }), note(`Answer: [${out.join(", ")}]`, "found")],
      vars: { k },
    });
  },
});

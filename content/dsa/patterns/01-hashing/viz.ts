import { arr, defineTrace, hashmap, hashset, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

/** Indices before `i` have been processed: show them as done. */
const before = (i: number) => {
  const t: Record<number, Tone> = {};
  for (let k = 0; k < i; k++) t[k] = "done";
  return t;
};

export const seenSet = defineTrace({
  id: "seen-set",
  title: "Seen set: find the first value that repeats",
  description: "A single pass adds each value to a set after checking whether it is already there; the first value found in the set is the first repeat.",
  code: `
function firstRepeat(nums) {
  const seen = new Set();          //@init
  for (const x of nums) {          //@loop
    if (seen.has(x)) return x;     //@check
    seen.add(x);                   //@add
  }
  return null;                     //@none
}`,
  presets: [
    { label: "Has a repeat", input: { nums: [4, 7, 2, 9, 7, 1] } },
    { label: "All distinct", input: { nums: [5, 3, 8, 1] } },
  ],
  run(t, { nums }) {
    const seen = new Set<number>();
    t.step("init", "The set starts empty. It will hold every value already passed, so asking whether x appeared earlier is one O(1) lookup instead of a scan.", {
      views: [arr("nums", nums), hashset("seen", seen)],
      vars: { x: null },
    });
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      if (seen.has(x)) {
        const first = nums.indexOf(x);
        t.step("check", `Is ${x} in seen? Yes: it was added at index ${first}. So ${x} is the first value to appear twice, found without ever scanning backwards.`, {
          views: [arr("nums", nums, { pointers: { i }, tones: { ...before(i), [first]: "found", [i]: "found" } }), hashset("seen", seen, { tones: [[x, "found"]] }), note(`Answer: ${x}`, "found")],
          vars: { i, x },
        });
        return;
      }
      t.step("check", `Is ${x} in seen? No, so this is the first time we meet ${x}.`, {
        views: [arr("nums", nums, { pointers: { i }, tones: { ...before(i), [i]: "active" } }), hashset("seen", seen)],
        vars: { i, x },
      });
      seen.add(x);
      t.step("add", i === 0 ? `Add ${x}. The set now holds the one value passed so far.` : `Add ${x}. The set now holds every value at indices 0 to ${i}.`, {
        views: [arr("nums", nums, { pointers: { i }, tones: { ...before(i), [i]: "new" } }), hashset("seen", seen, { tones: [[x, "new"]] })],
        vars: { i, x },
      });
    }
    t.step("none", `The loop finished without a hit, so all ${nums.length} values are distinct: return null. That took ${nums.length} lookups, not ${(nums.length * (nums.length - 1)) / 2} comparisons.`, {
      views: [arr("nums", nums, { tones: before(nums.length) }), hashset("seen", seen), note("Answer: null (no repeats)", "bad")],
      vars: { x: null },
    });
  },
});

export const frequencyBudget = defineTrace({
  id: "frequency-budget",
  title: "Frequency map: count the supply, then spend it",
  description: "Letters of the magazine are counted into a map, then each letter of the note spends one copy; a letter whose count is already zero means the note can't be built.",
  code: `
function canConstruct(note, magazine) {
  const count = new Map();                       //@init
  for (const ch of magazine) {
    count.set(ch, (count.get(ch) ?? 0) + 1);     //@count
  }
  for (const ch of note) {
    const left = count.get(ch) ?? 0;             //@lookup
    if (left === 0) return false;                //@fail
    count.set(ch, left - 1);                     //@spend
  }
  return true;                                   //@ok
}`,
  presets: [
    { label: "Enough letters", input: { note: "noon", magazine: "onion" } },
    { label: "Runs out", input: { note: "tooth", magazine: "photo" } },
  ],
  run(t, { note: text, magazine }) {
    const mag = [...magazine];
    const nt = [...text];
    const count = new Map<string, number>();
    t.step("init", "Each magazine letter can be used once. First count how many copies of each letter the magazine supplies.", {
      views: [arr("magazine", mag), arr("note", nt), hashmap("count", count)],
      vars: { ch: null },
    });
    mag.forEach((ch, i) => {
      count.set(ch, (count.get(ch) ?? 0) + 1);
      t.step("count", `Magazine letter '${ch}': its count becomes ${count.get(ch)}.`, {
        views: [arr("magazine", mag, { pointers: { i }, tones: { ...before(i), [i]: "active" } }), arr("note", nt), hashmap("count", count, { tones: [[ch, "new"]] })],
        vars: { ch, i },
      });
    });
    const magDone = () => arr("magazine", mag, { tones: before(mag.length) });
    for (let j = 0; j < nt.length; j++) {
      const ch = nt[j];
      const left = count.get(ch) ?? 0;
      t.step("lookup", left > 0 ? `The note needs '${ch}'. The map says ${left} cop${left === 1 ? "y is" : "ies are"} still available: one O(1) lookup, no searching through the magazine.` : `The note needs '${ch}', but its count is 0: every copy has already been spent.`, {
        views: [magDone(), arr("note", nt, { pointers: { j }, tones: { ...before(j), [j]: "active" } }), hashmap("count", count, { tones: [[ch, left > 0 ? "compare" : "bad"]] })],
        vars: { ch, j, left },
      });
      if (left === 0) {
        t.step("fail", `Return false: the magazine has too few '${ch}'s for this note.`, {
          views: [magDone(), arr("note", nt, { pointers: { j }, tones: { ...before(j), [j]: "bad" } }), hashmap("count", count, { tones: [[ch, "bad"]] }), note("Answer: false", "bad")],
          vars: { ch, j, left },
        });
        return;
      }
      count.set(ch, left - 1);
      t.step("spend", `Spend one '${ch}': ${left - 1} left.`, {
        views: [magDone(), arr("note", nt, { pointers: { j }, tones: { ...before(j), [j]: "found" } }), hashmap("count", count, { tones: [[ch, "new"]] })],
        vars: { ch, j, left: left - 1 },
      });
    }
    t.step("ok", "Every letter of the note was paid for, so return true. Two linear passes: O(m + n) time.", {
      views: [magDone(), arr("note", nt, { tones: before(nt.length) }), hashmap("count", count), note("Answer: true", "found")],
      vars: { ch: null },
    });
  },
});

export const pairCount = defineTrace({
  id: "pair-count-map",
  title: "Complement lookup: count pairs with a target sum",
  description: "Each value looks up how many earlier values equal its complement, adds that many pairs, and only then records itself in the map.",
  code: `
function countPairs(nums, target) {
  const seen = new Map(); // value → times seen so far //@init
  let pairs = 0;
  for (const x of nums) {
    pairs += seen.get(target - x) ?? 0;          //@lookup
    seen.set(x, (seen.get(x) ?? 0) + 1);         //@store
  }
  return pairs;                                  //@done
}`,
  presets: [
    { label: "Duplicates", input: { nums: [1, 5, 3, 3, 3, 7], target: 6 } },
    { label: "No self-pairs", input: { nums: [3, 4, 2], target: 6 } },
  ],
  run(t, { nums, target }) {
    const seen = new Map<number, number>();
    let pairs = 0;
    t.step("init", `For each x, its partner must be target - x. The map remembers how many times each value has appeared before the current index.`, {
      views: [arr("nums", nums), hashmap("seen", seen)],
      vars: { target, pairs },
    });
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      const need = target - x;
      const c = seen.get(need) ?? 0;
      pairs += c;
      const partners: Record<number, Tone> = {};
      for (let k = 0; k < i; k++) if (nums[k] === need) partners[k] = "found";
      let caption: string;
      if (c > 0) caption = `${x} needs ${need}. The map has seen ${need} ${c === 1 ? "once" : c === 2 ? "twice" : `${c} times`}, so ${x} completes ${c} new pair${c === 1 ? "" : "s"}: pairs = ${pairs}.`;
      else if (need === x) caption = `${x} needs another ${x}. The current ${x} is not in the map yet, so it can't pair with itself: no new pairs.`;
      else caption = `${x} needs ${need}, which hasn't appeared yet: no new pairs. If ${need} shows up later, it will find ${x} then.`;
      t.step("lookup", caption, {
        views: [arr("nums", nums, { pointers: { i }, tones: { ...before(i), ...partners, [i]: "active" } }), hashmap("seen", seen, { tones: c > 0 ? [[need, "found"]] : [] })],
        vars: { target, x, need, pairs },
      });
      seen.set(x, (seen.get(x) ?? 0) + 1);
      t.step("store", `Only now record ${x}: count ${seen.get(x)}. Later values can pair with it.`, {
        views: [arr("nums", nums, { pointers: { i }, tones: { ...before(i), [i]: "new" } }), hashmap("seen", seen, { tones: [[x, "new"]] })],
        vars: { target, x, need, pairs },
      });
    }
    t.step("done", `Every pair was counted exactly once, when its second element was reached. Return ${pairs}.`, {
      views: [arr("nums", nums, { tones: before(nums.length) }), hashmap("seen", seen), note(`Answer: ${pairs} pair${pairs === 1 ? "" : "s"}`, "found")],
      vars: { target, pairs },
    });
  },
});

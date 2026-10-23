import { arr, defineTrace, hashmap, note, queue } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

export const lruCache = defineTrace({
  id: "lru-map-order",
  title: "LRU cache: a map that also remembers the order of use",
  description: "Each request either finds its key in the cache and moves it to the most recent end, or evicts the least recent key when the cache is full and inserts the new one.",
  code: `
function access(cache, capacity, key) {       // cache: a Map, oldest key first
  if (cache.has(key)) {                       //@check
    const value = cache.get(key);
    cache.delete(key);                        //@touch
    cache.set(key, value);                    //@retouch
    return "hit";
  }
  if (cache.size === capacity) {              //@full
    const oldest = cache.keys().next().value;
    cache.delete(oldest);                     //@evict
  }
  cache.set(key, key * 10);                   //@insert
  return "miss";
}`,
  presets: [
    { label: "Short run", input: { capacity: 2, keys: [1, 2, 1, 3] } },
    { label: "Capacity 2", input: { capacity: 2, keys: [1, 2, 1, 3, 2, 4] } },
    { label: "Capacity 3", input: { capacity: 3, keys: [5, 6, 7, 5, 8, 6] } },
  ],
  fields: { capacity: { min: 1, max: 4 }, keys: { maxItems: 8, min: 0, max: 99, help: "Keys requested, in order (up to 8)." } },
  run(t, { capacity, keys }) {
    const cache = new Map<number, number>();
    let hits = 0;
    let misses = 0;
    const views = (tones: [number, Tone][] = [], head?: string, tone?: Tone) => [
      queue("recency order (least recent first)", [...cache.keys()], { tones: Object.fromEntries(tones.map(([k, v]) => [[...cache.keys()].indexOf(k), v]).filter(([i]) => (i as number) >= 0)) }),
      hashmap("cache (key to value)", cache, { tones }),
      ...(head ? [note(head, tone)] : []),
    ];
    t.step("check", `The cache is empty and holds at most ${capacity} keys. It keeps its keys in order of use: the oldest sits at the front.`, { views: views(), vars: { capacity, hits, misses } });
    for (const key of keys) {
      if (cache.has(key)) {
        hits++;
        t.step("check", `Request ${key}: it is in the cache, so this is a hit.`, { views: views([[key, "found"]]), vars: { key, hits, misses } });
        const value = cache.get(key)!;
        cache.delete(key);
        t.step("touch", `Take ${key} out of the order...`, { views: views([], undefined), vars: { key, hits, misses } });
        cache.set(key, value);
        t.step("retouch", `...and put it back at the end. ${key} is now the most recently used, so it is the last to be evicted.`, { views: views([[key, "new"]]), vars: { key, hits, misses } });
        continue;
      }
      misses++;
      t.step("check", `Request ${key}: not in the cache, so this is a miss and we must add it.`, { views: views([], `Miss on ${key}`, "bad"), vars: { key, hits, misses } });
      if (cache.size === capacity) {
        const oldest = cache.keys().next().value as number;
        t.step("full", `The cache already holds ${capacity} keys. The front of the order, ${oldest}, was used longest ago.`, { views: views([[oldest, "bad"]]), vars: { key, size: cache.size, oldest, hits, misses } });
        cache.delete(oldest);
        t.step("evict", `Evict ${oldest}: removing the front key is one step, no search needed.`, { views: views(), vars: { key, evicted: oldest, hits, misses } });
      }
      cache.set(key, key * 10);
      t.step("insert", `Insert ${key} at the end: the newest key is the most recently used.`, { views: views([[key, "new"]]), vars: { key, size: cache.size, hits, misses } });
    }
    t.step("insert", `Done: ${hits} hits and ${misses} misses. Every request cost a constant number of map operations.`, { views: [...views(), note(`${hits} hits, ${misses} misses`, "found")], vars: { hits, misses } });
  },
});

export const swapAndPop = defineTrace({
  id: "swap-and-pop",
  title: "O(1) removal from an array: swap the last element into the hole",
  description: "A map from value to array index finds the slot to remove, the last element is copied into that slot, and the array shrinks by one, so removal and random pick are both constant time.",
  code: `
function remove(val) {
  if (!index.has(val)) return false;          //@check
  const i = index.get(val);                   //@find
  const last = items[items.length - 1];
  items[i] = last;                            //@move
  index.set(last, i);                         //@reindex
  items.pop();                                //@pop
  index.delete(val);                          //@forget
  return true;
}`,
  presets: [
    { label: "Remove from the middle", input: { values: [4, 7, 9, 2, 6], removals: [7, 6] } },
    { label: "Remove the last and a missing value", input: { values: [3, 8, 5], removals: [5, 1, 3] } },
  ],
  fields: { values: { maxItems: 8, min: 0, max: 99, help: "Distinct whole numbers already in the set (up to 8)." }, removals: { maxItems: 4, min: 0, max: 99, help: "Values to remove, one after another (up to 4)." } },
  validate: ({ values }) => new Set(values).size !== values.length && "The values in the set must all be different.",
  run(t, { values, removals }) {
    const items = [...values];
    const index = new Map<number, number>(items.map((v, i) => [v, i]));
    const views = (tones: Record<number, Tone> = {}, mapTones: [number, Tone][] = []) => [
      arr("items", items, { tones }),
      hashmap("index (value to position)", index, { tones: mapTones }),
    ];
    t.step("check", `The set stores its values in an array, plus a map that says where each value sits. Picking a random member is items[random index].`, { views: views(), vars: { size: items.length } });
    for (const val of removals) {
      if (!index.has(val)) {
        t.step("check", `remove(${val}): the map has no ${val}, so there is nothing to do. Return false, without touching the array.`, { views: [...views(), note("false", "bad")], vars: { val } });
        continue;
      }
      const i = index.get(val)!;
      t.step("find", `remove(${val}): the map says ${val} sits at position ${i}. No scan of the array.`, { views: views({ [i]: "bad" }, [[val, "active"]]), vars: { val, i } });
      const lastIdx = items.length - 1;
      const last = items[lastIdx];
      items[i] = last;
      t.step("move", i === lastIdx ? `${val} is already the last element, so "moving" it onto itself changes nothing.` : `Copy the last element, ${last}, over the hole at position ${i}. The order of a set does not matter.`, {
        views: views({ [i]: "new", [lastIdx]: "compare" }, [[val, "bad"]]),
        vars: { val, i, last },
      });
      index.set(last, i);
      t.step("reindex", `${last} now lives at position ${i}, so the map must say so. Forgetting this step breaks the next removal.`, { views: views({ [i]: "new" }, [[last, "new"]]), vars: { val, i, last } });
      items.pop();
      t.step("pop", `Drop the last slot with pop(): O(1), nothing shifts.`, { views: views(items.length ? { [Math.min(i, items.length - 1)]: "done" } : {}, [[last, "done"]]), vars: { size: items.length } });
      index.delete(val);
      t.step("forget", `Delete ${val} from the map. Done: the array has no holes, so a random index always lands on a member.`, { views: views(), vars: { size: items.length } });
    }
    t.step("forget", `Every removal took a constant number of steps. The set now holds ${items.length} value${items.length === 1 ? "" : "s"}.`, { views: [...views(), note(`items: [${items.join(", ")}]`, "found")], vars: { size: items.length } });
  },
});

export const historyLookup = defineTrace({
  id: "history-binary-search",
  title: "Time-based store: binary search a key's history",
  description: "Each key keeps its writes in time order, so the value at time t is found by binary searching for the last write at or before t.",
  code: `
function get(history, t) {                    // history: sorted by time
  let lo = 0, hi = history.length;            //@init
  while (lo < hi) {                           //@loop
    const mid = (lo + hi) >> 1;
    if (history[mid].time <= t) lo = mid + 1; //@right
    else hi = mid;                            //@left
  }
  return lo === 0 ? "" : history[lo - 1].value; //@done
}`,
  presets: [
    { label: "Between two writes", input: { times: [10, 20, 30, 40, 50], query: 35 } },
    { label: "Before the first write", input: { times: [10, 20, 30], query: 5 } },
  ],
  fields: { times: { minItems: 1, maxItems: 9, min: 1, max: 99, help: "Write times of one key, increasing (up to 9)." }, query: { min: 0, max: 120, help: "The time to ask about." } },
  validate: ({ times }) => times.some((x, i) => i > 0 && times[i - 1] >= x) && "Times for one key must strictly increase.",
  run(t, { times, query }) {
    const values = times.map((_, i) => `v${i + 1}`);
    let lo = 0;
    let hi = times.length;
    const view = (tones: Record<number, Tone> = {}) => [
      arr("write times", times, { pointers: { lo, hi }, tones: { ...Object.fromEntries(times.map((_, i) => [i, i < lo ? ("done" as Tone) : i >= hi ? ("muted" as Tone) : ("window" as Tone)])), ...tones } }),
      arr("values", values, { tones }),
    ];
    t.step("init", `We want the value at time ${query}: the newest write at or before it. The history is sorted, so search it. lo = 0, hi = ${times.length}.`, { views: view(), vars: { query, lo, hi } });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= query) {
        t.step("right", `Write at time ${times[mid]} is at or before ${query}, so it qualifies, and so does everything left of it. Look for something newer: lo = ${mid + 1}.`, { views: view({ [mid]: "found" }), vars: { query, lo, hi, mid } });
        lo = mid + 1;
      } else {
        t.step("left", `Write at time ${times[mid]} is after ${query}, so it and everything right of it is too new. hi = ${mid}.`, { views: view({ [mid]: "bad" }), vars: { query, lo, hi, mid } });
        hi = mid;
      }
    }
    if (lo === 0) {
      t.step("done", `lo ended at 0: every write is after time ${query}, so the key held nothing yet. Return an empty string.`, { views: [...view(), note('Answer: ""', "bad")], vars: { query, lo, hi } });
    } else {
      t.step("done", `lo is the first write that is too new, so the answer is the one just before it: index ${lo - 1}, time ${times[lo - 1]}.`, { views: [...view({ [lo - 1]: "found" }), note(`Answer: ${values[lo - 1]}`, "found")], vars: { query, lo, hi } });
    }
  },
});

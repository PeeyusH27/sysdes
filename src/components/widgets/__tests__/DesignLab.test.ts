import { describe, expect, test } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { KEYS, SAMPLES, bruteCache, emptyLfu, lfuAccess, lfuOrder, lruAccess, simulate } from "../DesignLab";

const stream = (seed: number, n: number, keys: number = KEYS.length) => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => KEYS[Math.floor(r() * keys)] as string);
};

describe("LRU and LFU caches", () => {
  test("LRU evicts the key used longest ago, and a hit renews a key", () => {
    let order: string[] = [];
    for (const k of ["A", "B", "C"]) order = lruAccess(order, k).order;
    expect(order).toEqual(["A", "B", "C"]);
    order = lruAccess(order, "A").order; // renew A
    expect(order).toEqual(["B", "C", "A"]);
    const d = lruAccess(order, "D");
    expect(d.out).toEqual({ hit: false, evicted: "B" });
    expect(d.order).toEqual(["C", "A", "D"]);
  });

  test("LFU evicts the fewest uses, the oldest among ties, and a new key resets minCount", () => {
    let s = emptyLfu();
    for (const k of ["A", "A", "B", "C"]) s = lfuAccess(s, k).state;
    expect(lfuOrder(s)).toEqual(["B", "C", "A"]);
    const d = lfuAccess(s, "D");
    expect(d.out).toEqual({ hit: false, evicted: "B" });
    expect(d.state.minCount).toBe(1);
    expect(lfuOrder(d.state)).toEqual(["C", "D", "A"]);
  });

  test("both agree with a brute force that scans for the loser, on fixed and random streams", () => {
    const streams = [[], ["A"], [...SAMPLES.scan.requests], [...SAMPLES.cold.requests], "ABCDABCD".split("")];
    for (let seed = 1; seed <= 150; seed++) streams.push(stream(seed, 5 + (seed % 20), 3 + (seed % 3)));
    for (const requests of streams) {
      const steps = simulate(requests);
      for (const policy of ["lru", "lfu"] as const) {
        const want = bruteCache(requests, policy);
        steps.forEach((st, i) => {
          const part = policy === "lru" ? st.lru : st.lfu;
          expect(part.out, `${policy} ${requests.join("")} #${i}`).toEqual(want.outcomes[i]);
          const held = policy === "lru" ? st.lru.order : lfuOrder(st.lfu.state);
          expect([...held].sort(), `${policy} ${requests.join("")} #${i}`).toEqual(want.contents[i]);
        });
      }
    }
  });

  test("a cache never holds more than its capacity or a key twice", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const st of simulate(stream(seed, 25))) {
        expect(st.lru.order.length).toBeLessThanOrEqual(3);
        expect(new Set(st.lru.order).size).toBe(st.lru.order.length);
        const keys = lfuOrder(st.lfu.state);
        expect(keys.length).toBeLessThanOrEqual(3);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  test("the samples show each policy's weakness", () => {
    const scan = simulate([...SAMPLES.scan.requests]).at(-1)!;
    expect(scan.lfu.hits).toBeGreaterThan(scan.lru.hits);
    const cold = simulate([...SAMPLES.cold.requests]).at(-1)!;
    expect(cold.lru.hits).toBeGreaterThan(cold.lfu.hits);
  });
});

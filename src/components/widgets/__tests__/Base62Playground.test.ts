import { describe, expect, test } from "vitest";
import { base62Steps, crash, fromBase62, initAlloc, M, nextId, nextIdRandom, P, P_INV, parseId, scramble, shortCode, toBase62, unscramble } from "../Base62Playground";

describe("base62", () => {
  test("encode / decode", () => {
    expect(toBase62(0n)).toBe("0");
    expect(toBase62(125n)).toBe("21");
    expect(fromBase62("21")).toBe(125n);
    expect(toBase62(M - 1n)).toBe("ZZZZZZZ");
    const big = 123_456_789_012_345_678_901_234_567_890n; // beyond 2^53: BigInt keeps it exact
    expect(fromBase62(toBase62(big))).toBe(big);
  });

  test("the division ladder reads bottom-up as the code", () => {
    const steps = base62Steps(125n);
    expect(steps.map((s) => s.rem)).toEqual([1, 2]);
    expect(steps.map((s) => s.char).reverse().join("")).toBe("21");
  });

  test("scramble: the codes from the lesson", () => {
    expect(M).toBe(3_521_614_606_208n);
    expect((P * P_INV) % M).toBe(1n);
    expect(shortCode(1n)).toBe("CjIO2GV");
    expect(shortCode(2n)).toBe("eDrC5nQ");
    expect(shortCode(3n)).toBe("QXaq84L");
  });

  test("scramble is a bijection: unscramble undoes it, codes are always 7 chars", () => {
    for (const id of [0n, 1n, 2n, 61n, 62n, 1_000_000n, M - 1n]) {
      expect(unscramble(scramble(id))).toBe(id);
      expect(shortCode(id)).toHaveLength(7);
    }
    const codes = new Set(Array.from({ length: 2_000 }, (_, i) => shortCode(BigInt(i))));
    expect(codes.size).toBe(2_000);
  });

  test("parseId accepts digits (with separators) only", () => {
    expect(parseId("1,000")).toBe(1000n);
    expect(parseId(" 42 ")).toBe(42n);
    expect(parseId("12a")).toBeNull();
    expect(parseId("")).toBeNull();
    expect(parseId("-5")).toBeNull();
  });
});

describe("range allocator", () => {
  test("first id on a server triggers one INCRBY and returns the start of its block", () => {
    let s = initAlloc(3, 1000);
    s = nextId(s, 1);
    expect(s.counter).toBe(1000);
    expect(s.callCount).toBe(1);
    expect(s.servers[1]).toMatchObject({ start: 0, end: 1000, next: 1 });
    s = nextId(s, 0);
    expect(s.servers[0]).toMatchObject({ start: 1000, end: 2000, next: 1001 });
    expect(s.callCount).toBe(2);
  });

  test("a block of 1,000 serves 1,000 ids with a single Redis call; all ids are unique", () => {
    let s = initAlloc(2, 1000);
    const ids: number[] = [];
    for (let i = 0; i < 2_500; i++) {
      s = nextId(s, 0);
      ids.push(s.servers[0].last[0].id);
    }
    expect(s.callCount).toBe(3);
    expect(new Set(ids).size).toBe(2_500);
  });

  test("random traffic across servers never repeats an id", () => {
    let s = initAlloc(4, 10);
    const ids: number[] = [];
    for (let i = 0; i < 500; i++) {
      const before = s.servers.map((x) => x.issued);
      s = nextIdRandom(s);
      const k = s.servers.findIndex((x, j) => x.issued !== before[j]);
      ids.push(s.servers[k].last[0].id);
    }
    expect(s.links).toBe(500);
    expect(new Set(ids).size).toBe(500);
    expect(s.servers.every((x) => x.issued > 50)).toBe(true); // the seeded picker spreads the load
  });

  test("a crash skips the rest of the block (wasted, never reused)", () => {
    let s = nextId(nextId(initAlloc(2, 100), 0), 0); // server A holds [0, 100), next = 2
    s = crash(s, 0);
    expect(s.wasted).toBe(98);
    s = nextId(s, 0);
    expect(s.servers[0].start).toBe(100); // fresh block, ids 2..99 are gone for good
  });
});

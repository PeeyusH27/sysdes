import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { BITS, DEFAULT_LIST, MASK, apply, bit, bruteChecks, cancelled, explainBit, parseList, resultBit, second, shiftSource, summary, survivors, tickFlip, tickXor, toBits, xorUpTo, type Op } from "../BitLab";

const OPS: Op[] = ["and", "or", "xor", "shl", "shr", "drop"];

describe("bit flipper", () => {
  it("works column by column to the same answer as the whole-number operator, for all 8-bit inputs of a sample", () => {
    const r = mulberry32(5);
    for (let t = 0; t < 400; t++) {
      const a = Math.floor(r() * 256);
      const b = Math.floor(r() * 256);
      for (const op of OPS) {
        let fromColumns = 0;
        for (let i = 0; i < BITS; i++) fromColumns |= resultBit(op, a, b, i) << i;
        expect(fromColumns, `${op} ${a} ${b}`).toBe(apply(op, a, b));
        expect(apply(op, a, b)).toBeGreaterThanOrEqual(0);
        expect(apply(op, a, b)).toBeLessThanOrEqual(MASK);
      }
    }
  });

  it("matches the JavaScript operators and the arithmetic they stand for", () => {
    expect(apply("xor", 0b00100101, 0b01101100)).toBe(0b01001001);
    expect(apply("shl", 37, 0)).toBe(74);
    expect(apply("shl", 200, 0)).toBe(2 * 200 - 256);
    expect(apply("shr", 37, 0)).toBe(18);
    expect(apply("drop", 40, 0)).toBe(32);
    expect(apply("drop", 0, 0)).toBe(0);
    for (let n = 1; n < 256; n++) {
      expect(apply("drop", n, 0) === 0).toBe((n & (n - 1)) === 0); // power of two test
      expect(apply("shr", n, 0)).toBe(Math.floor(n / 2));
    }
    expect(second("drop", 0, 9)).toBe(255);
    expect(second("shl", 3, 9)).toBeNull();
  });

  it("explains each column and the result", () => {
    expect(explainBit("xor", 0b100, 0b110, 1)).toBe("Bit 1 (2): 0 XOR 1 = 1.");
    expect(explainBit("shl", 1, 0, 0)).toBe("Bit 0 (1): nothing to copy, so a 0 slides in.");
    expect(explainBit("shr", 0b10, 0, 0)).toBe("Bit 0 (1): copies A's bit 1, a 1.");
    expect(shiftSource("shl", 3)).toBe(2);
    expect(shiftSource("shr", 7)).toBeNull();
    expect(summary("drop", 32, 0)).toContain("so 32 is a power of two");
    expect(summary("xor", 5, 5)).toBe("A ^ B = 00000000 = 0. Bits that differ survive; equal bits cancel.");
    expect(toBits(5)).toBe("00000101");
    expect(bit(5, 2)).toBe(1);
  });

  it("reveals one column per tick and then stops", () => {
    let s = { a: 1, b: 2, op: "or" as Op, col: 0, acc: 0 };
    s = tickFlip(s, 200);
    expect(s.col).toBe(0);
    s = tickFlip(s, 100);
    expect(s.col).toBe(1);
    const full = { ...s, col: BITS };
    expect(tickFlip(full, 1000)).toBe(full);
  });
});

describe("single number", () => {
  it("XORs the default list down to the value without a twin", () => {
    expect(xorUpTo(DEFAULT_LIST, DEFAULT_LIST.length)).toBe(6);
    expect(survivors(DEFAULT_LIST)).toEqual([6]);
    expect(cancelled(DEFAULT_LIST, DEFAULT_LIST.length)).toEqual(new Set([0, 1, 2, 3, 4, 6]));
    expect(cancelled(DEFAULT_LIST, 3).size).toBe(0);
  });

  it("agrees with counting on random lists, and every accumulator bit is the parity of its column", () => {
    const r = mulberry32(11);
    for (let t = 0; t < 300; t++) {
      const list = Array.from({ length: 1 + Math.floor(r() * 8) }, () => Math.floor(r() * 16));
      for (let k = 0; k <= list.length; k++) {
        const acc = xorUpTo(list, k);
        for (let c = 0; c < 4; c++) expect(bit(acc, c)).toBe(list.slice(0, k).filter((v) => bit(v, c)).length % 2);
      }
      expect(xorUpTo(list, list.length)).toBe(survivors(list).reduce((x, v) => x ^ v, 0));
      expect(cancelled(list, list.length).size % 2).toBe(0);
    }
  });

  it("counts nested-loop checks exactly", () => {
    expect(bruteChecks(DEFAULT_LIST)).toBe(22);
    expect(bruteChecks([7])).toBe(0);
    expect(bruteChecks([4, 1, 1])).toBe(2);
    expect(bruteChecks([])).toBe(0);
  });

  it("parses the list and ticks one XOR per second", () => {
    expect(parseList("3, 5 3")).toEqual([3, 5, 3]);
    expect(parseList("16")).toBeNull();
    expect(parseList("")).toBeNull();
    expect(parseList("1 2 3 4 5 6 7 8 9")).toBeNull();
    let s = { list: [1, 1, 2], k: 0, acc: 0 };
    s = tickXor(s, 999);
    expect(s.k).toBe(0);
    s = tickXor(s, 1);
    expect(s.k).toBe(1);
    const done = { ...s, k: 3 };
    expect(tickXor(done, 5000)).toBe(done);
  });
});

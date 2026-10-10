import { test, expect } from "vitest";
import { duration } from "@/lib/format";
import { blockAvailability, composite, downtimeMinutes, formatAvailability, parallel } from "../AvailabilityCalc";

test("serial availabilities multiply", () => {
  expect(composite([{ kind: "serial", a: 0.999 }, { kind: "serial", a: 0.999 }])).toBeCloseTo(0.998001, 9);
  expect(composite([])).toBe(1);
});

test("a redundant pair is down only when both are down", () => {
  expect(parallel([0.99, 0.99])).toBeCloseTo(0.9999, 12);
  expect(blockAvailability({ kind: "pair", a: 0.999 })).toBeCloseTo(0.999999, 12);
  expect(parallel([0.9, 0.9, 0.9])).toBeCloseTo(0.999, 12);
});

test("the default path: LB 99.99 × app pair 99.9 × DB 99.95 × payments 99.9", () => {
  const a = composite([
    { kind: "serial", a: 0.9999 },
    { kind: "pair", a: 0.999 },
    { kind: "serial", a: 0.9995 },
    { kind: "serial", a: 0.999 },
  ]);
  expect(a).toBeCloseTo(0.9999 * 0.999999 * 0.9995 * 0.999, 12);
  expect(formatAvailability(a)).toBe("99.84%");
});

test("downtime per year and month for the standard nines", () => {
  expect(downtimeMinutes(0.99)).toBeCloseTo(5256);
  expect(duration(downtimeMinutes(0.99))).toBe("3.65 days");
  expect(duration(downtimeMinutes(0.999))).toBe("8.76 h");
  expect(duration(downtimeMinutes(0.9999))).toBe("52.6 min");
  expect(duration(downtimeMinutes(0.99999))).toBe("5.26 min");
  expect(downtimeMinutes(0.999, "month")).toBeCloseTo(43.8);
});

test("formatAvailability shows the nines without trailing zeros", () => {
  expect(formatAvailability(0.99)).toBe("99%");
  expect(formatAvailability(0.999)).toBe("99.9%");
  expect(formatAvailability(0.9995)).toBe("99.95%");
  expect(formatAvailability(0.9999)).toBe("99.99%");
  expect(formatAvailability(0.999999)).toBe("99.9999%");
  expect(formatAvailability(1)).toBe("100%");
});

import { test, expect } from "vitest";
import { EXEC_MS, holderAt, seatRace } from "../SeatRace";

test("conditional UPDATE: the first to arrive wins, the other matches 0 rows", () => {
  const o = seatRace("conditional", { Alice: 40, Bob: 60 });
  expect(o.winner).toBe("Alice");
  expect(o.doubleBooked).toBe(false);
  expect(o.told.Alice).toEqual({ at: 40 + EXEC_MS + 40, booked: true });
  expect(o.told.Bob.booked).toBe(false);
  expect(o.log.map((l) => [l.who, l.result.split(":")[0]])).toEqual([
    ["Alice", "rowCount 1"],
    ["Bob", "rowCount 0"],
  ]);
});

test("network delay decides who wins", () => {
  expect(seatRace("conditional", { Alice: 120, Bob: 30 }).winner).toBe("Bob");
});

test("near-simultaneous arrivals: the second waits for the row lock, then matches 0 rows", () => {
  const o = seatRace("conditional", { Alice: 50, Bob: 53 });
  expect(o.winner).toBe("Alice");
  const bob = o.log.filter((l) => l.who === "Bob");
  expect(bob[0].tone).toBe("wait");
  expect(bob[1]).toMatchObject({ at: 50 + EXEC_MS, tone: "bad" });
});

test("exactly one winner for every pair of delays", () => {
  for (let a = 10; a <= 200; a += 10)
    for (let b = 10; b <= 200; b += 10) {
      const o = seatRace("conditional", { Alice: a, Bob: b });
      expect(o.doubleBooked).toBe(false);
      expect(o.winner).not.toBeNull();
      expect(o.writes).toHaveLength(1);
    }
});

test("SELECT then UPDATE double-books when the delays are close", () => {
  const o = seatRace("naive", { Alice: 40, Bob: 60 });
  expect(o.doubleBooked).toBe(true);
  expect(o.told.Alice.booked && o.told.Bob.booked).toBe(true);
  // the later write overwrites the earlier one
  expect(holderAt(o, o.end)).toBe("Bob");
  expect(holderAt(o, 0)).toBeNull();
});

test("SELECT then UPDATE only works when one client is far slower", () => {
  // Alice's UPDATE commits at 3 × 20 + 8 = 68 ms, before Bob's SELECT at 100 ms
  const o = seatRace("naive", { Alice: 20, Bob: 100 });
  expect(o.doubleBooked).toBe(false);
  expect(o.winner).toBe("Alice");
  expect(o.log.find((l) => l.who === "Bob")?.result).toBe("'held'");
});

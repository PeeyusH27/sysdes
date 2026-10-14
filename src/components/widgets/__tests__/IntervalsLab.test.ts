import { describe, expect, test } from "vitest";
import { SLOTS, assignRooms, clock, countAt, mergeBusy, pairChecks, randomMeetings, roomsNeeded, sweepEvents, type Meeting } from "../IntervalsLab";

const mk = (pairs: [number, number][]): Meeting[] => pairs.map(([start, end], i) => ({ id: "ABCDEF"[i], start, end }));
const DAY = mk([
  [2, 5],
  [3, 6],
  [4, 8],
  [10, 12],
  [12, 15],
  [16, 18],
]);
const samples = () => {
  const out: Meeting[][] = [[], mk([[0, 1]]), DAY, mk([[1, 3], [3, 5]]), mk([[1, 9], [2, 3], [4, 5]]), mk([[2, 4], [2, 4], [2, 4]])];
  for (let s = 1; s <= 300; s++) out.push(randomMeetings(s, 1 + (s % 6)));
  return out;
};
const busySlot = (ms: Meeting[], t: number) => ms.some((x) => x.start <= t && t < x.end);

describe("rooms needed (sweep line)", () => {
  test("the default day needs 3 rooms (9:00, 9:30 and 10:00 all overlap at 10:00–10:30)", () => {
    expect(roomsNeeded(DAY)).toBe(3);
    expect(countAt(DAY, 4)).toBe(3);
  });
  test("equals the brute-force maximum over every half-hour slot", () => {
    for (const ms of samples()) {
      const brute = Math.max(0, ...Array.from({ length: SLOTS }, (_, t) => countAt(ms, t)));
      expect(roomsNeeded(ms)).toBe(brute);
    }
  });
  test("back-to-back meetings share a room: ends sort before starts at the same time", () => {
    const ms = mk([
      [1, 3],
      [3, 5],
    ]);
    expect(roomsNeeded(ms)).toBe(1);
    const ev = sweepEvents(ms);
    expect(ev.map((e) => [e.t, e.delta])).toEqual([
      [1, 1],
      [3, -1],
      [3, 1],
      [5, -1],
    ]);
  });
  test("2n events, and the running count never goes negative", () => {
    for (const ms of samples()) {
      const ev = sweepEvents(ms);
      expect(ev).toHaveLength(2 * ms.length);
      let run = 0;
      for (const e of ev) {
        run += e.delta;
        expect(run).toBeGreaterThanOrEqual(0);
      }
      expect(run).toBe(0);
    }
  });
});

describe("room assignment (start order, lowest free room)", () => {
  test("no two meetings in one room overlap, and it uses exactly roomsNeeded rooms", () => {
    for (const ms of samples()) {
      const room = assignRooms(ms);
      for (const a of ms)
        for (const b of ms) if (a !== b && room[a.id] === room[b.id]) expect(a.start < b.end && b.start < a.end, `${a.id} and ${b.id}`).toBe(false);
      expect(new Set(Object.values(room)).size).toBe(roomsNeeded(ms));
    }
  });
});

describe("merging busy time", () => {
  test("the default day merges into three blocks; back-to-back D and E join", () => {
    expect(mergeBusy(DAY)).toEqual([
      [2, 8],
      [10, 15],
      [16, 18],
    ]);
  });
  test("blocks are sorted, disjoint, don't touch, and cover exactly the busy slots", () => {
    for (const ms of samples()) {
      const blocks = mergeBusy(ms);
      for (let i = 1; i < blocks.length; i++) expect(blocks[i][0]).toBeGreaterThan(blocks[i - 1][1]);
      for (let t = 0; t < SLOTS; t++) expect(blocks.some(([a, b]) => a <= t && t < b)).toBe(busySlot(ms, t));
    }
  });
  test("a meeting nested inside another doesn't shrink the block", () => {
    expect(mergeBusy(mk([[1, 9], [2, 3]]))).toEqual([[1, 9]]);
  });
  test("empty and single inputs", () => {
    expect(mergeBusy([])).toEqual([]);
    expect(roomsNeeded([])).toBe(0);
    expect(mergeBusy(mk([[4, 6]]))).toEqual([[4, 6]]);
  });
});

test("helpers", () => {
  expect(pairChecks(6)).toBe(15);
  expect(clock(0)).toBe("8:00");
  expect(clock(5)).toBe("10:30");
  expect(clock(SLOTS)).toBe("18:00");
  for (const x of randomMeetings(5)) expect(x.start >= 0 && x.end <= SLOTS && x.end > x.start).toBe(true);
});

import { describe, expect, test } from "vitest";
import { average, clock, parseHistory, phaseAt, phaseStart, PHASES, RUBRIC, TOTAL_MS } from "../InterviewTimer";

const MIN = 60_000;

describe("interview schedule", () => {
  test("5 + 5 + 15 + 15 + 5 = 45 minutes", () => {
    expect(PHASES.map((p) => p.minutes)).toEqual([5, 5, 15, 15, 5]);
    expect(TOTAL_MS).toBe(45 * MIN);
    expect(PHASES.every((p) => p.checklist.length >= 3 && p.prompt.length > 20)).toBe(true);
  });

  test("phaseAt finds the phase at each boundary", () => {
    expect(phaseAt(0)).toMatchObject({ index: 0, phaseLeft: 5 * MIN, totalLeft: 45 * MIN, done: false });
    expect(phaseAt(5 * MIN - 1).index).toBe(0);
    expect(phaseAt(5 * MIN).index).toBe(1);
    expect(phaseAt(10 * MIN).index).toBe(2);
    expect(phaseAt(25 * MIN).index).toBe(3);
    expect(phaseAt(40 * MIN)).toMatchObject({ index: 4, phaseLeft: 5 * MIN });
    expect(phaseAt(45 * MIN).done).toBe(true);
    expect(phaseAt(47 * MIN).totalLeft).toBe(-2 * MIN);
  });

  test("phaseStart", () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => phaseStart(i) / MIN)).toEqual([0, 5, 10, 25, 40, 45]);
  });

  test("clock formats remaining and overtime", () => {
    expect(clock(45 * MIN)).toBe("45:00");
    expect(clock(61_500)).toBe("01:01");
    expect(clock(-90_000)).toBe("+01:30");
  });
});

describe("rubric history", () => {
  test("8 dimensions", () => expect(RUBRIC).toHaveLength(8));

  test("parseHistory tolerates garbage and drops malformed attempts", () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory("not json")).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    const ok = { at: 1, question: "Chat", scores: [1, 2, 3, 4, 4, 3, 2, 1], minutes: 44 };
    const bad = [{ at: 2, question: "x", scores: [5, 1, 1, 1, 1, 1, 1, 1] }, { at: 3, question: "y", scores: [1, 2] }, null, "str"];
    expect(parseHistory(JSON.stringify([ok, ...bad]))).toEqual([ok]);
  });

  test("average", () => {
    expect(average([1, 2, 3, 4, 4, 3, 2, 1])).toBe(2.5);
    expect(average([])).toBe(0);
  });
});

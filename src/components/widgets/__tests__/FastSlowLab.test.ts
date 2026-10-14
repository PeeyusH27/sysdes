import { describe, expect, test } from "vitest";
import { finish, fullStep, nextOf, sizeOf, startRun, tick, type Track } from "../FastSlowLab";

const tracks = () => {
  const out: Track[] = [];
  for (let tail = 0; tail <= 8; tail++) for (let loop = 0; loop <= 12; loop++) out.push({ tail, loop });
  return out;
};
/** Brute force: walk from the head with a visited set. */
function visitedSet(t: Track) {
  const seen = new Set<number>();
  let i: number | null = sizeOf(t) ? 0 : null;
  while (i !== null && !seen.has(i)) {
    seen.add(i);
    i = nextOf(t, i);
  }
  return { cycle: i !== null, entry: i };
}

describe("the track", () => {
  test("tail nodes lead into the loop; the last loop node points back at the entry", () => {
    const t = { tail: 3, loop: 4 };
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => nextOf(t, i))).toEqual([1, 2, 3, 4, 5, 6, 3]);
    expect(nextOf({ tail: 3, loop: 0 }, 2)).toBeNull();
    expect(nextOf({ tail: 0, loop: 1 }, 0)).toBe(0);
  });
});

describe("Floyd with speed 2", () => {
  test("finds the entry exactly where a visited set does, for every shape", () => {
    for (const t of tracks()) {
      const r = finish(startRun(t, 2));
      const ref = visitedSet(t);
      if (!sizeOf(t)) expect(r.outcome).toBe("empty");
      else if (!ref.cycle) expect(r.outcome).toBe("middle");
      else {
        expect(r.outcome, JSON.stringify(t)).toBe("entry");
        expect(r.slow).toBe(ref.entry);
        expect(r.fast).toBe(ref.entry);
        expect(r.steps2).toBe(t.tail); // phase 2 takes F steps
      }
    }
  });
  test("phase 1: slow is caught within F + C steps, and slow's distance is a whole number of laps", () => {
    for (const t of tracks().filter((x) => x.loop > 0)) {
      const r = finish(startRun(t, 2));
      expect(r.steps).toBeLessThanOrEqual(t.tail + t.loop);
      expect(r.steps % t.loop).toBe(0);
      expect(r.meet! >= t.tail).toBe(true); // they meet inside the loop
    }
  });
  test("without a loop, slow stops on the middle (the second middle for even lengths)", () => {
    for (let n = 1; n <= 8; n++) {
      const r = finish(startRun({ tail: n, loop: 0 }, 2));
      expect(r.slow).toBe(Math.floor(n / 2));
    }
  });
  test("the gap shrinks by exactly one per step once both runners are in the loop", () => {
    let r = startRun({ tail: 2, loop: 7 }, 2);
    let prev: number | null = null;
    while (r.phase === "chase") {
      r = fullStep(r);
      if (r.phase !== "chase" || r.slow! < 2) continue;
      const gap = (r.slow! - r.fast! + 7) % 7;
      if (prev !== null) expect(gap).toBe(prev - 1);
      prev = gap;
    }
  });
  test("fast hops once per tick; slow moves on every second tick", () => {
    let r = startRun({ tail: 4, loop: 3 }, 2);
    r = tick(r);
    expect([r.slow, r.fast, r.steps]).toEqual([0, 1, 0]);
    r = tick(r);
    expect([r.slow, r.fast, r.steps]).toEqual([1, 2, 1]);
  });
});

describe("speed 3", () => {
  test("still always catches slow, starting together", () => {
    for (const t of tracks().filter((x) => x.loop > 0)) expect(finish(startRun(t, 3)).meet, JSON.stringify(t)).not.toBeNull();
  });
  test("but the second walk can miss the entry: F = 1, C = 4", () => {
    const r = finish(startRun({ tail: 1, loop: 4 }, 3));
    expect(r.outcome).toBe("missed");
    expect(r.steps).toBe(2); // fast's extra 4 steps are one lap; slow's 2 are half a lap
  });
  test("when it reports the entry, it's right", () => {
    for (const t of tracks().filter((x) => x.loop > 0)) {
      const r = finish(startRun(t, 3));
      if (r.outcome === "entry") expect(r.slow).toBe(t.tail);
      else expect(r.outcome).toBe("missed");
    }
  });
});

test("an empty list is done at once", () => {
  const r = startRun({ tail: 0, loop: 0 });
  expect(r.phase).toBe("done");
  expect(tick(r)).toBe(r);
});

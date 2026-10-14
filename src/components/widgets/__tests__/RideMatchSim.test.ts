import { describe, expect, test } from "vitest";
import {
  CH,
  CW,
  N_DRIVERS,
  NX,
  NY,
  OFFER_MS,
  buildIndex,
  cas,
  cellOf,
  initSim,
  onRoad,
  requestRide,
  ringCells,
  roadDistance,
  roadPath,
  scanRing,
  snapToRoad,
  stepSim,
  twoRiders,
  type Cfg,
  type Pt,
  type Sim,
} from "../RideMatchSim";

const CELLS: Cfg = { declineRate: 0, ratePerMin: 0, mode: "cells" };
const run = (s: Sim, cfg: Cfg, ticks: number, each?: (s: Sim) => void) => {
  for (let i = 0; i < ticks; i++) {
    s = stepSim(s, 50, cfg);
    each?.(s);
  }
  return s;
};
/** Stop location updates, so the index (and every distance the matcher sees) stays fixed. */
const frozen = (s: Sim): Sim => ({ ...s, drivers: s.drivers.map((d) => ({ ...d, pingAt: 1e12 })) });
const pathLength = (a: Pt, path: Pt[]) => path.reduce((acc, p, i) => acc + Math.abs(p.x - (i ? path[i - 1] : a).x) + Math.abs(p.y - (i ? path[i - 1] : a).y), 0);

/** Every busy driver belongs to exactly one live ride, and no ride holds two drivers. */
function checkInvariants(s: Sim) {
  const holders = new Map<string, string[]>();
  for (const r of s.rides) {
    if (r.phase === "done") continue;
    const ids = [r.offer?.driver, r.driver].filter(Boolean) as string[];
    expect(ids.length, `${r.id} holds two drivers`).toBeLessThanOrEqual(1);
    for (const id of ids) holders.set(id, [...(holders.get(id) ?? []), r.id]);
  }
  for (const d of s.drivers) {
    expect(onRoad(d.pos), `${d.id} left the road at ${JSON.stringify(d.pos)}`).toBe(true);
    const h = holders.get(d.id) ?? [];
    expect(h.length, `${d.id} is held by ${h.join(", ")}`).toBeLessThanOrEqual(1);
    if (d.state === "available") expect(d.rideId).toBeNull();
    else expect(h).toEqual([d.rideId]);
  }
}

describe("streets", () => {
  test("road distance follows the grid, not a straight line", () => {
    expect(roadDistance({ x: 1, y: 1 }, { x: 4, y: 3 })).toBe(5);
    expect(roadDistance({ x: 1.5, y: 2 }, { x: 4.5, y: 2 })).toBe(3); // same street: straight along it
    // parallel streets, mid-block: drive to the nearer corner first
    expect(roadDistance({ x: 2.5, y: 1 }, { x: 2.3, y: 3 })).toBeCloseTo(2.8, 9);
    expect(roadDistance({ x: 2.5, y: 1 }, { x: 2, y: 1.5 })).toBeCloseTo(1, 9);
  });

  test("every path leg runs along one street, and the path is as long as the distance", () => {
    const pts: Pt[] = [
      { x: 0, y: 0 },
      { x: 2.5, y: 1 },
      { x: 2.3, y: 3 },
      { x: 7, y: 4.25 },
      { x: 3, y: 3.5 },
      { x: 6.6, y: 0 },
    ];
    for (const a of pts)
      for (const b of pts) {
        const path = roadPath(a, b);
        let prev = a;
        for (const p of path) {
          expect(onRoad(p)).toBe(true);
          expect(prev.x === p.x || prev.y === p.y).toBe(true);
          prev = p;
        }
        if (path.length) expect(path.at(-1)).toEqual(b);
        expect(pathLength(a, path)).toBeCloseTo(roadDistance(a, b), 9);
      }
  });

  test("a tap anywhere snaps to a street inside the map", () => {
    for (const p of [
      { x: -3, y: 9 },
      { x: 2.4, y: 2.45 },
      { x: 6.9, y: 0.2 },
      { x: 3.5, y: 3.5 },
    ])
      expect(onRoad(snapToRoad(p))).toBe(true);
    expect(snapToRoad({ x: 2.4, y: 2.1 })).toEqual({ x: 2.4, y: 2 });
  });
});

describe("cell index", () => {
  test("rings hold 1, 8, 16 cells in the middle and fewer at the edge", () => {
    expect([0, 1, 2].map((k) => ringCells(3, 3, k).length)).toEqual([1, 8, 16]);
    expect(ringCells(0, 0, 1)).toHaveLength(3);
    const all = Array.from({ length: Math.max(CW, CH) }, (_, k) => ringCells(0, 0, k).length).reduce((a, b) => a + b);
    expect(all).toBe(CW * CH); // the rings around a corner eventually cover the whole map exactly once
  });

  test("moving cars leave their old cell: the index always matches their last reports", () => {
    let s = initSim(3);
    s = run(s, { ...CELLS, ratePerMin: 20, declineRate: 0.3 }, 600);
    const fresh = buildIndex(s.drivers);
    const norm = (idx: Record<string, string[]>) => Object.fromEntries(Object.entries(idx).filter(([, v]) => v.length).map(([k, v]) => [k, [...v].sort()]));
    expect(norm(s.index)).toEqual(norm(fresh));
    expect(Object.values(s.index).flat().sort()).toEqual(s.drivers.map((d) => d.id).sort()); // each car exactly once
  });

  test("a ring scan returns exactly the drivers whose cell is k steps away", () => {
    const s = run(initSim(5), CELLS, 300);
    for (const [cx, cy] of [
      [0, 0],
      [3, 2],
      [7, 5],
    ])
      for (let k = 0; k < 4; k++) {
        const expected = s.drivers
          .filter((d) => {
            const [x, y] = cellOf(d.reported);
            return Math.max(Math.abs(x - cx), Math.abs(y - cy)) === k;
          })
          .map((d) => d.id)
          .sort();
        expect(scanRing(s.index, cx, cy, k).sort()).toEqual(expected);
      }
  });
});

describe("matching", () => {
  test("the nearest free car (by its last report, along the streets) gets the first offer", () => {
    for (const pickup of [
      { x: 3.2, y: 2 },
      { x: 0, y: 0.5 },
      { x: 6.5, y: 5 },
      { x: 4, y: 1.25 },
    ]) {
      let s = requestRide(frozen(initSim(7)), pickup);
      const ride = () => s.rides[0];
      for (let i = 0; i < 400 && ride().phase === "searching"; i++) s = stepSim(s, 50, CELLS);
      expect(ride().phase).toBe("offering");
      const dist = (id: string) => roadDistance(s.drivers.find((d) => d.id === id)!.reported, ride().pickup);
      const best = Math.min(...s.drivers.map((d) => dist(d.id)));
      expect(dist(ride().offer!.driver)).toBeCloseTo(best, 9);
      expect(ride().examined).toBeLessThan(N_DRIVERS + 1);
    }
  });

  test("a decline or timeout frees the driver and the offer moves to the next-nearest car", () => {
    let s = requestRide(frozen(initSim(7)), { x: 3.2, y: 2 });
    const offered: string[] = [];
    const cfg = { ...CELLS, declineRate: 1 };
    for (let i = 0; i < 2400 && offered.length < 5; i++) {
      const before = s.rides[0].offer?.driver;
      s = stepSim(s, 50, cfg);
      const now = s.rides[0].offer?.driver;
      if (now && now !== before) offered.push(now);
      if (before && !now) expect(s.drivers.find((d) => d.id === before)!.state).toBe("available");
      checkInvariants(s);
    }
    expect(new Set(offered).size).toBe(offered.length); // never the same car twice for one ride
    const dist = (id: string) => roadDistance(s.drivers.find((d) => d.id === id)!.reported, s.rides[0].pickup);
    for (let i = 1; i < offered.length; i++) expect(dist(offered[i])).toBeGreaterThanOrEqual(dist(offered[i - 1]) - 1e-9);
    expect(s.rides[0].tried.every((x) => x.result === "declined" || x.result === "timed out")).toBe(true);
  });

  test("an unanswered offer expires after the countdown", () => {
    let s = requestRide(frozen(initSim(7)), { x: 3.2, y: 2 });
    for (let i = 0; i < 400 && s.rides[0].phase === "searching"; i++) s = stepSim(s, 50, CELLS);
    const o = s.rides[0].offer!;
    s = { ...s, rides: [{ ...s.rides[0], offer: { ...o, answer: "timeout", answerAt: o.at + OFFER_MS } }] };
    s = run(s, CELLS, OFFER_MS / 50 - 1);
    expect(s.rides[0].phase).toBe("offering");
    s = run(s, CELLS, 1);
    expect(s.rides[0].tried).toEqual([{ id: o.driver, result: "timed out" }]);
  });

  test("two riders, one driver: compare-and-set gives the car to exactly one of them", () => {
    let s = twoRiders(initSim(11));
    const [a, b] = s.rides.map((r) => r.id);
    let target = "";
    for (let i = 0; i < 200 && !s.cas; i++) {
      s = stepSim(s, 50, CELLS);
      checkInvariants(s);
    }
    expect(s.cas).not.toBeNull();
    target = s.cas!.driver;
    expect(s.cas).toMatchObject({ winner: a, loser: b });
    const ra = s.rides.find((r) => r.id === a)!;
    const rb = s.rides.find((r) => r.id === b)!;
    expect(ra.offer?.driver).toBe(target);
    expect(rb.offer?.driver).not.toBe(target);
    expect(rb.tried).toEqual([{ id: target, result: "taken" }]);
    expect(s.drivers.find((d) => d.id === target)).toMatchObject({ state: "offered", rideId: a });
    // play on: both riders end up matched, with different cars
    for (let i = 0; i < 600 && s.rides.some((r) => !r.driver); i++) {
      s = stepSim(s, 50, CELLS);
      checkInvariants(s);
    }
    const drivers = s.rides.map((r) => r.driver);
    expect(drivers[0]).toBe(target);
    expect(drivers[1]).not.toBeNull();
    expect(drivers[1]).not.toBe(target);
  });

  test("busy city with declines and repeated duels: never one driver in two rides, never off the road", { timeout: 20_000 }, () => {
    for (const mode of ["cells", "scan"] as const) {
      let s = initSim(9);
      const cfg: Cfg = { declineRate: 0.5, ratePerMin: 30, mode };
      for (let i = 0; i < 4000; i++) {
        if (i % 500 === 0) s = twoRiders(s);
        s = stepSim(s, 50, cfg);
        checkInvariants(s);
        for (const d of s.drivers) {
          expect(d.pos.x).toBeGreaterThanOrEqual(0);
          expect(d.pos.x).toBeLessThanOrEqual(NX);
          expect(d.pos.y).toBeGreaterThanOrEqual(0);
          expect(d.pos.y).toBeLessThanOrEqual(NY);
        }
      }
      expect(s.stats.matched).toBeGreaterThan(20);
      if (mode === "scan") expect(s.stats.examined / s.stats.matched).toBeGreaterThanOrEqual(N_DRIVERS);
      else expect(s.stats.examined / s.stats.matched).toBeLessThan(N_DRIVERS);
    }
  });

  test("with every car busy, a ride waits and retries instead of searching every tick", () => {
    for (const mode of ["cells", "scan"] as const) {
      let s = frozen(initSim(3)); // no location updates, so no car changes cell mid-search
      s = requestRide({ ...s, drivers: s.drivers.map((d) => ({ ...d, state: "onTrip" as const, rideId: "X" })) }, { x: 2, y: 2 });
      const cfg = { ...CELLS, mode };
      for (let i = 0; i < 200 && s.rides[0].phase !== "waiting"; i++) s = stepSim(s, 50, cfg);
      expect(s.rides[0].phase).toBe("waiting");
      expect(s.rides[0].examined).toBe(N_DRIVERS); // the whole map was read once…
      s = run(s, cfg, 20);
      expect(s.rides[0].phase).toBe("waiting");
      expect(s.rides[0].examined).toBe(N_DRIVERS); // …and not again every tick while it waits
    }
  });

  test("cas refuses a driver who is no longer in the expected state", () => {
    const { drivers } = initSim(1);
    const once = cas(drivers, "D1", { state: "available" }, { state: "offered", rideId: "R1" })!;
    expect(once.find((d) => d.id === "D1")).toMatchObject({ state: "offered", rideId: "R1" });
    expect(cas(once, "D1", { state: "available" }, { state: "offered", rideId: "R2" })).toBeNull();
    expect(cas(once, "D1", { state: "offered", rideId: "R2" }, { state: "onTrip", rideId: "R2" })).toBeNull();
  });
});

test("deterministic: the same seed replays the same city", () => {
  const cfg: Cfg = { declineRate: 0.3, ratePerMin: 12, mode: "cells" };
  const a = run(twoRiders(initSim(4)), cfg, 1500);
  const b = run(twoRiders(initSim(4)), cfg, 1500);
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  const c = run(twoRiders(initSim(5)), cfg, 1500);
  expect(JSON.stringify(c.drivers)).not.toBe(JSON.stringify(a.drivers));
});

import { describe, expect, test } from "vitest";
import {
  CAP,
  FLOORS,
  addPassenger,
  carState,
  initSim,
  pressCar,
  pressHall,
  routeDistance,
  setOutOfService,
  stepSim,
  tripFor,
  waitStats,
  type Sim,
  type SimEvent,
  type Strategy,
  type Traffic,
} from "../ElevatorSim";

const STRATEGIES: Strategy[] = ["fcfs", "nearest", "collective"];

/** Step in 100 ms ticks, calling `each` after every tick. */
function run(s: Sim, ms: number, each?: (s: Sim) => void) {
  for (let t = 0; t < ms; t += 100) {
    s = stepSim(s, 100);
    each?.(s);
  }
  return s;
}

/** Floors where car `car` opened its doors, in order, until `count` stops or the time runs out. */
function stopsOf(s: Sim, car: number, count: number, ms = 120_000) {
  const stops: { floor: number; svc: string | null }[] = [];
  for (let t = 0; t < ms && stops.length < count; t += 100) {
    s = stepSim(s, 100);
    for (const e of s.events) if (e.type === "open" && e.car === car) stops.push({ floor: e.floor, svc: e.svc });
  }
  return { s, stops };
}

/** Rush or random traffic for five minutes, then no new arrivals until everyone is delivered. */
function rushThenDrain(strategy: Strategy, traffic: Traffic, rate: number) {
  let s = run(initSim({ seed: 7, strategy, traffic, rate }), 300_000);
  s = { ...s, traffic: "manual" };
  let drainedAfter = Infinity;
  for (let t = 0; t < 300_000; t += 100) {
    s = stepSim(s, 100);
    if (!s.people.length) {
      drainedAfter = t;
      break;
    }
  }
  return { s, drainedAfter };
}

describe("safety invariants", () => {
  for (const strategy of STRATEGIES)
    test(`${strategy}: cars stay between G and the top floor, and never move with doors open`, () => {
      let s = initSim({ seed: 3, strategy, traffic: "random", rate: 25 });
      let checked = 0;
      const check = (x: Sim) => {
        for (const c of x.cars) {
          expect(c.pos).toBeGreaterThanOrEqual(0);
          expect(c.pos).toBeLessThanOrEqual(FLOORS - 1);
          expect(c.door).toBeGreaterThanOrEqual(0);
          expect(c.door).toBeLessThanOrEqual(1);
          expect(c.riders.length).toBeLessThanOrEqual(CAP);
          if (c.phase !== "closed") {
            // doors only open when the car is stopped exactly at a floor
            expect(Number.isInteger(c.pos)).toBe(true);
            expect(c.moving).toBe(0);
          }
          if (c.moving !== 0) expect([c.phase, c.door]).toEqual(["closed", 0]);
          checked++;
        }
      };
      s = run(s, 120_000, check);
      s = setOutOfService(s, 1, true); // fail a car mid-run
      s = run(s, 60_000, check);
      s = setOutOfService(s, 1, false);
      run(s, 60_000, check);
      expect(checked).toBe(3 * 2400);
    });

  test("buttons that don't exist are rejected", () => {
    const s = initSim({ traffic: "manual" });
    expect(() => pressCar(s, 0, FLOORS)).toThrow(RangeError);
    expect(() => pressCar(s, 0, -1)).toThrow(RangeError);
    expect(() => pressHall(s, FLOORS - 1, "up")).toThrow(RangeError);
    expect(() => pressHall(s, 0, "down")).toThrow(RangeError);
    expect(() => addPassenger(s, 2, 2)).toThrow(RangeError);
  });
});

describe("stop ordering", () => {
  test("LOOK serves car calls in travel order and reverses only when nothing is ahead", () => {
    let s = initSim({ strategy: "collective", traffic: "manual" }); // car A waits at G
    for (const f of [5, 2, 7]) s = pressCar(s, 0, f);
    const first = stopsOf(s, 0, 1);
    expect(first.stops.map((x) => x.floor)).toEqual([2]);
    // at floor 2, going up: 1 is behind the car, 6 is ahead
    s = pressCar(pressCar(first.s, 0, 1), 0, 6);
    expect(stopsOf(s, 0, 4).stops.map((x) => x.floor)).toEqual([5, 6, 7, 1]);
  });

  test("FCFS serves the same presses in arrival order, so the car zig-zags", () => {
    let s = initSim({ strategy: "fcfs", traffic: "manual" });
    for (const f of [5, 2, 7]) s = pressCar(s, 0, f);
    const { s: end, stops } = stopsOf(s, 0, 3);
    expect(stops.map((x) => x.floor)).toEqual([5, 2, 7]);
    expect(end.cars[0].travelled).toBeCloseTo(5 + 3 + 5, 6); // LOOK would travel 7
  });

  test("a hall call in the other direction waits for the return sweep", () => {
    let s = initSim({ strategy: "nearest", traffic: "manual" });
    s = setOutOfService(setOutOfService(s, 1, true), 2, true); // car A gets every call
    s = pressHall(pressHall(pressCar(s, 0, 6), 3, "up"), 4, "down");
    expect(s.calls.map((h) => h.car)).toEqual([0, 0]);
    const { stops } = stopsOf(s, 0, 3);
    // 3▲ on the way up, the car call at 6, then 4▼ on the way down (it passed 4 going up without stopping)
    expect(stops).toEqual([
      { floor: 3, svc: "up" },
      { floor: 6, svc: "down" },
      { floor: 4, svc: "down" },
    ]);
  });

  test("route distance is direction-aware", () => {
    const car = { pos: 2, dir: 1 as const };
    const targets = [{ floor: 5 }];
    expect(routeDistance(car, targets, 4, "up")).toBe(2); // ahead, same direction
    expect(routeDistance(car, targets, 4, "down")).toBe(3 + 1); // up to 5, back down to 4
    expect(routeDistance(car, targets, 1, "up")).toBe(3 + 4 + 0); // up to 5, down to 1, then it's going up
    expect(routeDistance({ pos: 6, dir: 0 }, [], 1, "up")).toBe(5); // idle: plain distance
  });
});

describe("hall calls", () => {
  test("pressing ▲ twice is still one call", () => {
    let s = initSim({ strategy: "nearest", traffic: "manual" });
    s = pressHall(s, 4, "up");
    s = pressHall(s, 4, "up");
    expect(s.calls).toHaveLength(1);
    expect(s.events.filter((e) => e.type === "call")).toHaveLength(0); // the second press emitted nothing
    s = addPassenger(addPassenger(s, 4, 6), 4, 7); // two people, same button
    expect(s.calls).toHaveLength(1);
  });

  for (const strategy of STRATEGIES)
    test(`${strategy}: each hall call has at most one car at a time and is cleared exactly once`, () => {
      const owner = new Map<number, number>(); // call id -> car, -1 = unassigned
      const cleared = new Set<number>();
      const seen = (events: SimEvent[]) => {
        for (const e of events) {
          if (e.type === "call") owner.set(e.call, -1);
          if (e.type === "assign") {
            expect(owner.get(e.call), `call ${e.call} assigned twice`).toBe(-1);
            owner.set(e.call, e.car);
          }
          if (e.type === "release") {
            expect(owner.get(e.call)).toBe(e.car);
            owner.set(e.call, -1);
          }
          if (e.type === "clear") {
            expect(cleared.has(e.call), `call ${e.call} cleared twice`).toBe(false);
            expect(e.assigned).toBe(owner.get(e.call));
            if (strategy === "fcfs") expect(e.car).toBe(e.assigned); // FCFS only stops for its own calls
            cleared.add(e.call);
          }
        }
      };
      const each = (s: Sim) => {
        seen(s.events);
        expect(new Set(s.calls.map((h) => `${h.floor}${h.dir}`)).size).toBe(s.calls.length);
        for (const h of s.calls) expect(h.car).toBe(owner.get(h.id));
      };
      let s = run(initSim({ seed: 11, strategy, traffic: "random", rate: 20 }), 90_000, each);
      s = setOutOfService(s, 1, true);
      seen(s.events);
      s = run(s, 90_000, each);
      expect(cleared.size).toBeGreaterThan(25);
    });
});

describe("out of service", () => {
  test("its hall calls are reassigned and nothing is ever assigned to it", () => {
    let s = initSim({ strategy: "nearest", traffic: "manual" }); // A at G, B at 3, C at 6
    s = pressHall(s, 4, "down");
    expect(s.calls[0].car).toBe(1); // B is one floor away
    s = setOutOfService(s, 1, true);
    expect(s.events).toContainEqual(expect.objectContaining({ type: "release", car: 1, why: "out of service" }));
    expect(s.calls[0].car).toBe(2); // C, two floors away, beats A at four
    expect(s.last).toMatch(/4▼ → car C/);
    s = pressHall(s, 3, "up"); // right where B is parked
    expect(s.calls.find((h) => h.floor === 3)!.car).not.toBe(1);
    s = run(s, 30_000);
    expect(s.calls).toHaveLength(0);
    expect(carState(s.cars[1])).toBe("OUT_OF_SERVICE");
  });

  for (const strategy of STRATEGIES)
    test(`${strategy}: riders of a failed car get out at the next floor and another car delivers them`, () => {
      let s = addPassenger(initSim({ strategy, traffic: "manual" }), 3, 7); // B is waiting at 3
      while (!(s.cars[1].riders.length && s.cars[1].moving)) s = stepSim(s, 100);
      s = setOutOfService(s, 1, true);
      s = run(s, 60_000);
      expect(carState(s.cars[1])).toBe("OUT_OF_SERVICE");
      expect(Number.isInteger(s.cars[1].pos)).toBe(true);
      expect(s.cars[1].riders).toEqual([]);
      expect(s.stats.delivered).toBe(1);
      expect(s.people).toEqual([]);
    });
});

describe("no starvation", () => {
  for (const strategy of STRATEGIES)
    for (const traffic of ["random", "rush"] as Traffic[])
      test(`${strategy}, ${traffic} traffic: everyone is delivered and nobody waits more than 80 s`, () => {
        const { s, drainedAfter } = rushThenDrain(strategy, traffic, 30); // the busiest the slider allows
        expect(drainedAfter).toBeLessThan(90_000);
        expect(s.stats.delivered).toBe(s.nextId - 1);
        expect(waitStats(s).longest).toBeLessThan(80);
      });
});

describe("replay and comparison", () => {
  test("the same seed replays exactly", () => {
    const a = run(initSim({ seed: 5, strategy: "collective", traffic: "random", rate: 18 }), 60_000);
    const b = run(initSim({ seed: 5, strategy: "collective", traffic: "random", rate: 18 }), 60_000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("every strategy sees the same passengers", () => {
    const trips = (strategy: Strategy) => {
      const seen = new Map<number, string>();
      run(initSim({ seed: 7, strategy, traffic: "rush", rate: 16 }), 120_000, (s) => {
        for (const p of s.people) if (!seen.has(p.id)) seen.set(p.id, `${p.from}>${p.to}@${p.since}`);
      });
      return [...seen.entries()].sort((x, y) => x[0] - y[0]);
    };
    const fcfs = trips("fcfs");
    expect(fcfs.length).toBeGreaterThan(25);
    expect(trips("nearest")).toEqual(fcfs);
    expect(trips("collective")).toEqual(fcfs);
    expect(tripFor(7, "rush", 0)).toEqual(tripFor(7, "rush", 0));
  });

  test("seed 7, random traffic at 16 a minute: FCFS waits longer and travels further", () => {
    const after5 = (strategy: Strategy) => waitStats(run(initSim({ seed: 7, strategy, traffic: "random", rate: 16 }), 300_000));
    const [fcfs, nearest, collective] = STRATEGIES.map(after5);
    for (const other of [nearest, collective]) {
      expect(fcfs.avg).toBeGreaterThan(other.avg * 1.5);
      expect(fcfs.floors).toBeGreaterThan(other.floors);
    }
  });

  test("seed 7, morning rush at 16 a minute: FCFS rides are longer, because each car runs its stops in button order", () => {
    const after5 = (strategy: Strategy) => waitStats(run(initSim({ seed: 7, strategy, traffic: "rush", rate: 16 }), 300_000));
    const [fcfs, nearest, collective] = STRATEGIES.map(after5);
    for (const other of [nearest, collective]) {
      expect(fcfs.ride).toBeGreaterThan(other.ride * 1.2);
      expect(fcfs.floors).toBeGreaterThan(other.floors);
    }
  });
});

import { test, expect } from "vitest";
import {
  ALL_SPOTS,
  FITS,
  PER_FLOOR,
  RACE_SPOT,
  SPOT_TYPES,
  addArrival,
  admit,
  chooseSpot,
  exitLot,
  feeText,
  freeCounts,
  initSim,
  newLot,
  parkingFee,
  parseSpot,
  releaseSpot,
  requestExit,
  stepSim,
  stepToEvent,
  takeSpot,
  twoCarsOneSpot,
  type Cfg,
  type Lot,
  type Sim,
} from "../ParkingLotSim";

const MIN = 60_000;
const HOUR = 3_600_000;
const cfg: Cfg = { selector: "lowestFloor", mode: "atomic", rush: false, rate: 8, stay: 2 };
const takeAll = (lot: Lot, ids: string[]) => ids.reduce(takeSpot, lot);
const ofType = (floor: number, type: string) => ALL_SPOTS.filter((id) => parseSpot(id).floor === floor && parseSpot(id).type === type);

function runUntil(s: Sim, c: Cfg, done: (s: Sim) => boolean, max = 3000) {
  for (let i = 0; i < max && !done(s); i++) s = stepSim(s, c);
  expect(done(s)).toBe(true);
  return s;
}

test("FITS mirrors models.js: smallest spot type first", () => {
  expect(FITS).toEqual({ bike: ["bike", "compact", "large"], car: ["compact", "large"], truck: ["large"] });
});

test("an empty lot: each vehicle gets its own smallest type on floor 0", () => {
  const lot = newLot();
  expect(chooseSpot(lot, "bike", "lowestFloor")).toBe("0-B1");
  expect(chooseSpot(lot, "car", "lowestFloor")).toBe("0-C1");
  expect(chooseSpot(lot, "truck", "lowestFloor")).toBe("0-L1");
});

test("lowest floor first keeps vehicles low; the SQL order keeps them in the smallest type", () => {
  const noBikes0 = takeAll(newLot(), ofType(0, "bike"));
  expect(chooseSpot(noBikes0, "bike", "lowestFloor")).toBe("0-C1"); // floor 0 compact beats floor 1 bike
  expect(chooseSpot(noBikes0, "bike", "smallestType")).toBe("1-B1");
  const noCompact0 = takeAll(newLot(), ofType(0, "compact"));
  expect(chooseSpot(noCompact0, "car", "lowestFloor")).toBe("0-L1"); // a car may use a large spot
  expect(chooseSpot(noCompact0, "car", "smallestType")).toBe("1-C1");
});

test("trucks only take large spots, even with compact spots free", () => {
  const lot = takeAll(newLot(), ALL_SPOTS.filter((id) => parseSpot(id).type === "large"));
  expect(chooseSpot(lot, "truck", "lowestFloor")).toBeNull();
  const { results } = admit(lot, [{ gate: "A", plate: "KA-01", vehicle: "truck" }], "lowestFloor", "atomic", 0);
  expect(results[0]).toEqual({ ok: false, error: "Lot full for truck" });
  expect(chooseSpot(lot, "car", "lowestFloor")).toBe("0-C1");
});

test("a released spot goes to the back of its Set; the SQL selector still picks the lowest id", () => {
  let lot = takeAll(newLot(), ["0-C1", "0-C2"]);
  lot = releaseSpot(lot, "0-C1");
  expect(lot.free[0].compact).toEqual(["0-C3", "0-C4", "0-C5", "0-C6", "0-C1"]);
  expect(releaseSpot(lot, "0-C1").free[0].compact).toHaveLength(5); // Set.add twice is a no-op
  expect(chooseSpot(lot, "car", "lowestFloor")).toBe("0-C3");
  expect(chooseSpot(lot, "car", "smallestType")).toBe("0-C1");
});

test("atomic take(): two gates, one spot, exactly one ticket", () => {
  const lot = takeAll(newLot(), ALL_SPOTS.filter((id) => id !== RACE_SPOT && parseSpot(id).type !== "bike"));
  const reqs = [
    { gate: "A" as const, plate: "KA-07", vehicle: "car" as const },
    { gate: "B" as const, plate: "KA-08", vehicle: "car" as const },
  ];
  const out = admit(lot, reqs, "lowestFloor", "atomic", 0);
  expect(out.results[0]).toMatchObject({ ok: true, ticket: { spot: RACE_SPOT, plate: "KA-07" } });
  expect(out.results[1]).toEqual({ ok: false, error: "Lot full for car" });
  expect(out.lot.tickets).toHaveLength(1);
});

test("check, then take: both gates are told the same spot", () => {
  const lot = takeAll(newLot(), ALL_SPOTS.filter((id) => id !== RACE_SPOT && parseSpot(id).type !== "bike"));
  const reqs = [
    { gate: "A" as const, plate: "KA-07", vehicle: "car" as const },
    { gate: "B" as const, plate: "KA-08", vehicle: "car" as const },
  ];
  const out = admit(lot, reqs, "lowestFloor", "race", 0);
  expect(out.results.map((r) => r.ok && r.ticket.spot)).toEqual([RACE_SPOT, RACE_SPOT]);
  expect(out.lot.tickets.map((t) => t.spot)).toEqual([RACE_SPOT, RACE_SPOT]);
  expect(out.lot.free[0].compact).toEqual([]); // removed once, handed out twice
  // the race doesn't need a nearly full lot: with every spot free both still read 0-C1
  const empty = admit(newLot(), reqs, "lowestFloor", "race", 0);
  expect(empty.results.map((r) => r.ok && r.ticket.spot)).toEqual(["0-C1", "0-C1"]);
});

test("fees follow HourlyPricing + DailyCap from strategies.js", () => {
  expect(parkingFee(61 * MIN, "car")).toBe(40); // 2 started hours × 20
  expect(parkingFee(61 * MIN, "truck")).toBe(80);
  expect(parkingFee(10 * MIN, "car")).toBe(0); // the grace period is inclusive
  expect(parkingFee(10 * MIN + 1, "car")).toBe(20);
  expect(parkingFee(60 * MIN, "car")).toBe(20);
  expect(parkingFee(60 * MIN + 1, "car")).toBe(40);
  expect(parkingFee(23 * HOUR, "car")).toBe(150);
  expect(parkingFee(26 * HOUR, "car")).toBe(190); // 1 day capped + 2 hours
  expect(parkingFee(5 * HOUR, "bike")).toBe(50);
  expect(feeText(61 * MIN, "car")).toBe("2 started h × 20 = 40");
  expect(feeText(5 * MIN, "car")).toBe("inside the 10 min grace period: free");
  expect(feeText(9 * HOUR, "car")).toBe("9 started h × 20 capped at 150 = 150");
  expect(feeText(26 * HOUR, "car")).toBe("1 day × 150 + 2 started h × 20 = 190");
});

test("exit charges by the clock, frees the spot, and a ticket can't exit twice", () => {
  const { lot, results } = admit(newLot(), [{ gate: "A", plate: "KA-03", vehicle: "car" }], "lowestFloor", "atomic", 0);
  const ticket = results[0].ok ? results[0].ticket : null;
  expect(ticket?.spot).toBe("0-C1");
  expect(freeCounts(lot)[0].compact).toBe(5);
  const out = exitLot(lot, ticket!.id, 2 * HOUR);
  expect(out.fee).toBe(40);
  expect(freeCounts(out.lot)[0].compact).toBe(6);
  expect(() => exitLot(out.lot, ticket!.id, 2 * HOUR)).toThrow("Unknown ticket");
});

test("a car drives in, parks, is clicked out, pays the exact fee, and the board follows", () => {
  let s = addArrival(initSim([]), "car", 2);
  s = stepToEvent(s, cfg); // reduced-motion Step: jump to the gate
  expect(s.log[0].text).toBe("Gate A: ticket for KA-01 (car) → 0-C1");
  expect(freeCounts(s.lot)[0].compact).toBe(5); // the observer fires at park(), not when the car stops
  expect(s.flash["0-compact"]).toEqual({ tick: s.tick, dir: -1 });
  s = runUntil(s, cfg, (x) => x.vehicles[0]?.phase === "parked");
  const v = s.vehicles[0];
  expect([v.x, v.y]).toEqual([79, 28 + 2 * 134 + 34]); // standing in bay 0-C1
  s = requestExit(s, v.id);
  expect(freeCounts(s.lot)[0].compact).toBe(5); // still taken while driving to the booth
  s = runUntil(s, cfg, (x) => x.log[0].text.includes("paid"));
  const fee = parkingFee(s.now - v.entry, "car");
  expect(fee).toBeGreaterThan(0);
  expect(s.revenue).toBe(fee);
  expect(s.log[0].text).toContain(`KA-01 paid ${fee}`);
  expect(freeCounts(s.lot)[0].compact).toBe(6);
  expect(s.lot.tickets).toHaveLength(0);
  s = runUntil(s, cfg, (x) => x.vehicles.length === 0);
  expect(stepSim(s, cfg)).toBe(s); // idle: nothing changes
});

test("a full lot turns vehicles away and lights the FULL state", () => {
  let s = initSim(ALL_SPOTS.filter((id) => parseSpot(id).type === "large"));
  s = addArrival(s, "truck", 2);
  s = runUntil(s, cfg, (x) => x.turnedAway === 1);
  expect(s.fullFor).toBe("truck");
  expect(s.log[0].text).toBe("Gate A: KA-10 turned away (Lot full for truck)");
  expect(s.latest).toContain('"Lot full for truck"');
  s = runUntil(s, cfg, (x) => !x.vehicles.some((v) => v.type === "truck" && v.phase === "away"));
});

test("two cars, one spot, atomic: one parks in 0-C3, the other is turned away", () => {
  let s = twoCarsOneSpot(initSim(), 2);
  const [a, b] = s.vehicles.slice(-2);
  expect(freeCounts(s.lot).map((f) => f.compact + f.large)).toEqual([1, 0, 0]);
  s = runUntil(s, cfg, (x) => x.turnedAway === 1);
  expect(s.latest).toContain("Atomic take()");
  expect(s.log[0].text).toBe(`Gate B: ${b.plate} turned away (Lot full for car)`);
  s = runUntil(s, cfg, (x) => x.vehicles.find((v) => v.id === a.id)?.phase === "parked");
  expect(s.vehicles.filter((v) => v.spot === RACE_SPOT && v.inBay).map((v) => v.plate)).toEqual([a.plate]);
  expect(s.lot.tickets.filter((t) => t.spot === RACE_SPOT)).toHaveLength(1);
});

test("two cars, one spot, check-then-take: both are told 0-C3 and the second finds it taken", () => {
  const race: Cfg = { ...cfg, mode: "race" };
  let s = twoCarsOneSpot(initSim(), 2);
  const [a, b] = s.vehicles.slice(-2);
  s = runUntil(s, race, (x) => x.vehicles.some((v) => v.id === b.id && v.spot));
  expect(s.vehicles.filter((v) => v.id === a.id || v.id === b.id).map((v) => v.spot)).toEqual([RACE_SPOT, RACE_SPOT]);
  expect(s.lot.tickets.filter((t) => t.spot === RACE_SPOT)).toHaveLength(2);
  expect(s.latest).toContain(`both told ${RACE_SPOT}`);
  s = runUntil(s, race, (x) => x.conflict !== null);
  expect(s.log[0].text).toContain(`double-assigned ${RACE_SPOT}`);
  expect(s.vehicles.find((v) => v.id === b.id)?.phase).toBe("conflict");
  s = runUntil(s, race, (x) => x.log[0].text.includes("ticket voided"));
  expect(s.lot.tickets.filter((t) => t.spot === RACE_SPOT).map((t) => t.plate)).toEqual([a.plate]);
});

test("rush hour, atomic gates: never two vehicles in one spot, and the boards always match the free sets", () => {
  const busy: Cfg = { ...cfg, rush: true, rate: 20, stay: 4 };
  let s = initSim();
  let maxTaken = 0;
  for (let i = 0; i < 4000; i++) {
    s = stepSim(s, busy);
    const spots = s.lot.tickets.map((t) => t.spot);
    expect(new Set(spots).size).toBe(spots.length);
    const inBay = s.vehicles.filter((v) => v.inBay).map((v) => v.spot);
    expect(new Set(inBay).size).toBe(inBay.length);
    const counts = freeCounts(s.lot);
    for (let f = 0; f < 3; f++)
      for (const t of SPOT_TYPES) {
        const free = s.lot.free[f][t];
        expect(counts[f][t]).toBe(free.length);
        expect(free.filter((id) => spots.includes(id))).toEqual([]); // free and ticketed are disjoint
        expect(free.length + spots.filter((id) => parseSpot(id).floor === f && parseSpot(id).type === t).length).toBe(PER_FLOOR[t]);
      }
    maxTaken = Math.max(maxTaken, spots.length);
  }
  expect(maxTaken).toBe(ALL_SPOTS.length); // the lot filled up…
  expect(s.turnedAway).toBeGreaterThan(0); // …and turned vehicles away
  expect(s.revenue).toBeGreaterThan(0);
});

test("the simulation is deterministic", () => {
  const busy: Cfg = { ...cfg, rush: true, rate: 12 };
  const run = () => {
    let s = initSim();
    for (let i = 0; i < 600; i++) s = stepSim(s, busy);
    return [s.revenue, s.turnedAway, s.lot.tickets.map((t) => t.spot).join()];
  };
  expect(run()).toEqual(run());
});

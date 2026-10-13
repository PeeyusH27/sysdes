"use client";
import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { m } from "motion/react";
import { Bike, Car, Swords, Truck } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ================================================================ the lot
// Mirrors content/questions/parking-lot/snippets: FITS (models.js), a free set per spot type per floor
// (floor.js), LowestFloorFirst, HourlyPricing and DailyCap (strategies.js), park / quote / exit
// (parking-lot.js), and the ORDER BY of allocate.sql as the second selector.

export type VehicleType = "bike" | "car" | "truck";
export type SpotType = "bike" | "compact" | "large";
/** lowestFloor = LowestFloorFirst (strategies.js); smallestType = allocate.sql's ORDER BY type, floor, id. */
export type Selector = "lowestFloor" | "smallestType";
/** atomic = each gate's take() checks and removes in one step; race = every gate checks, then every gate takes. */
export type GateMode = "atomic" | "race";
export type GateId = "A" | "B";

/** Spot types each vehicle may use, smallest first, so big vehicles never take small spots. */
export const FITS: Record<VehicleType, readonly SpotType[]> = { bike: ["bike", "compact", "large"], car: ["compact", "large"], truck: ["large"] };
export const FLOORS = 3;
export const PER_FLOOR: Record<SpotType, number> = { bike: 3, compact: 6, large: 3 };
export const SPOT_TYPES: readonly SpotType[] = ["bike", "compact", "large"];
export const TOTAL_SPOTS = FLOORS * (PER_FLOOR.bike + PER_FLOOR.compact + PER_FLOOR.large);
const LETTER: Record<SpotType, string> = { bike: "B", compact: "C", large: "L" };
const SPOT_NAME: Record<SpotType, string> = { bike: "Bike", compact: "Compact", large: "Large" };
const NAME: Record<VehicleType, string> = { bike: "Bike", car: "Car", truck: "Truck" };

export const spotId = (floor: number, type: SpotType, n: number) => `${floor}-${LETTER[type]}${n}`;
export function parseSpot(id: string): { floor: number; type: SpotType; n: number } {
  const [f, rest] = id.split("-");
  const type: SpotType = rest[0] === "B" ? "bike" : rest[0] === "C" ? "compact" : "large";
  return { floor: Number(f), type, n: Number(rest.slice(1)) };
}
const row = (f: number, t: SpotType) => Array.from({ length: PER_FLOOR[t] }, (_, i) => spotId(f, t, i + 1));
export const ALL_SPOTS: string[] = Array.from({ length: FLOORS }, (_, f) => SPOT_TYPES.flatMap((t) => row(f, t))).flat();

export interface Ticket {
  id: string;
  plate: string;
  vehicle: VehicleType;
  spot: string;
  entry: number;
}
export interface Lot {
  /** Per floor, the free spot ids of each type in insertion order (how a JS Set iterates). */
  free: Record<SpotType, string[]>[];
  /** Open tickets. Exit deletes one, so a ticket can't exit twice. */
  tickets: Ticket[];
  issued: number;
}

export function newLot(): Lot {
  return { free: Array.from({ length: FLOORS }, (_, f) => ({ bike: row(f, "bike"), compact: row(f, "compact"), large: row(f, "large") })), tickets: [], issued: 0 };
}

/** The spot a gate would get, without taking it. */
export function chooseSpot(lot: Lot, vehicle: VehicleType, selector: Selector): string | null {
  if (selector === "lowestFloor") {
    // LowestFloorFirst: floors in order; on each floor take() walks FITS smallest first, first spot in the Set
    for (const floor of lot.free) for (const t of FITS[vehicle]) if (floor[t].length) return floor[t][0];
    return null;
  }
  // allocate.sql: ORDER BY array_position($3, type), floor, id
  for (const t of FITS[vehicle]) for (const floor of lot.free) if (floor[t].length) return [...floor[t]].sort()[0];
  return null;
}

function mapFloor(lot: Lot, id: string, fn: (ids: string[]) => string[]): Lot {
  const { floor, type } = parseSpot(id);
  return { ...lot, free: lot.free.map((fl, i) => (i === floor ? { ...fl, [type]: fn(fl[type]) } : fl)) };
}
export const takeSpot = (lot: Lot, id: string) => mapFloor(lot, id, (ids) => ids.filter((x) => x !== id));
/** Set.add semantics: a released spot goes to the end; adding it twice is a no-op. */
export const releaseSpot = (lot: Lot, id: string) => mapFloor(lot, id, (ids) => (ids.includes(id) ? ids : [...ids, id]));

function issue(lot: Lot, plate: string, vehicle: VehicleType, spot: string, entry: number) {
  const ticket: Ticket = { id: `T${lot.issued + 1}`, plate, vehicle, spot, entry };
  return { lot: { ...takeSpot(lot, spot), tickets: [...lot.tickets, ticket], issued: lot.issued + 1 }, ticket };
}

export interface GateRequest {
  gate: GateId;
  plate: string;
  vehicle: VehicleType;
}
export type GateResult = { ok: true; ticket: Ticket } | { ok: false; error: string };

/**
 * Requests that reach the gates in the same instant, in order. "atomic": each gate's take() runs to completion
 * before the next one starts (one Node process). "race": every gate reads the free set first, then each removes
 * the spot it saw, so two gates can be handed the same spot.
 */
export function admit(lot: Lot, reqs: GateRequest[], selector: Selector, mode: GateMode, now: number): { lot: Lot; results: GateResult[] } {
  const seen = lot;
  let cur = lot;
  const results = reqs.map((r): GateResult => {
    const spot = chooseSpot(mode === "race" ? seen : cur, r.vehicle, selector);
    if (!spot) return { ok: false, error: `Lot full for ${r.vehicle}` };
    const out = issue(cur, r.plate, r.vehicle, spot, now);
    cur = out.lot;
    return { ok: true, ticket: out.ticket };
  });
  return { lot: cur, results };
}

/** exit(): charge the fee for the time since entry, free the spot, delete the ticket. */
export function exitLot(lot: Lot, ticketId: string, now: number): { lot: Lot; fee: number } {
  const t = lot.tickets.find((x) => x.id === ticketId);
  if (!t) throw new Error("Unknown ticket");
  const fee = parkingFee(now - t.entry, t.vehicle);
  return { lot: releaseSpot({ ...lot, tickets: lot.tickets.filter((x) => x !== t) }, t.spot), fee };
}
export const voidTicket = (lot: Lot, ticketId: string): Lot => ({ ...lot, tickets: lot.tickets.filter((x) => x.id !== ticketId) });
/** What the display boards show: available(type) for every floor. */
export const freeCounts = (lot: Lot) => lot.free.map((fl) => ({ bike: fl.bike.length, compact: fl.compact.length, large: fl.large.length }));

// ---------------------------------------------------------------- pricing (HourlyPricing wrapped in DailyCap)
export const RATES: Record<VehicleType, number> = { bike: 10, car: 20, truck: 40 };
export const GRACE_MIN = 10;
export const DAILY_CAP = 150;
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Free inside the grace period (inclusive), then every started hour counts. */
export const hourlyFee = (ms: number, v: VehicleType) => (ms <= GRACE_MIN * MIN ? 0 : Math.ceil(ms / HOUR) * RATES[v]);
export function parkingFee(ms: number, v: VehicleType) {
  const days = Math.floor(ms / DAY);
  return days * DAILY_CAP + Math.min(hourlyFee(ms - days * DAY, v), DAILY_CAP);
}
/** The booth's explanation of a fee, e.g. "2 started h × 20 = 40". */
export function feeText(ms: number, v: VehicleType) {
  const days = Math.floor(ms / DAY);
  const rest = ms - days * DAY;
  const inner = hourlyFee(rest, v);
  const part = `${Math.ceil(rest / HOUR)} started h × ${RATES[v]}${inner > DAILY_CAP ? ` capped at ${DAILY_CAP}` : ""}`;
  if (!days) return inner === 0 ? `inside the ${GRACE_MIN} min grace period: free` : `${part} = ${Math.min(inner, DAILY_CAP)}`;
  return `${days} day${days > 1 ? "s" : ""} × ${DAILY_CAP} + ${inner === 0 ? "0 (grace)" : part} = ${parkingFee(ms, v)}`;
}
export function fmtDuration(ms: number) {
  const mins = Math.round(ms / MIN);
  const h = Math.floor(mins / 60);
  return h ? `${h} h${mins % 60 ? ` ${mins % 60} min` : ""}` : `${mins} min`;
}
export function fmtClock(ms: number) {
  const day = Math.floor(ms / DAY);
  const mins = Math.floor((ms - day * DAY) / MIN);
  const hhmm = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  return day ? `${hhmm} (day ${day + 1})` : hhmm;
}

// ================================================================ the simulation
/** One 50 ms tick is 30 simulated seconds, so 1 real second ≈ 10 simulated minutes. */
export const SIM_PER_TICK = 30_000;
const W = 344;
const H = 576;
const SPEED = 13; // viewBox units per tick
const UP_X = 43;
const DOWN_X = 17;
const GATE_X = 120;
const EXIT_GATE_X = 190;
const LANE_Y: Record<GateId, number> = { A: 460, B: 496 };
const EXIT_Y = 532;
const SPAWN_X = W + 30;
const HALF: Record<VehicleType, number> = { bike: 9, car: 15, truck: 19 };
const GAP = 6;
const TICKET_TICKS = 8;
const MERGE_TICKS = 5;
const PAY_TICKS = 14;
const AWAY_TICKS = 28;
const CONFLICT_TICKS = 50;
const FLASH_TICKS = 16;
export const RACE_SPOT = "0-C3";
const floorTop = (f: number) => 28 + (FLOORS - 1 - f) * 134;
const aisleY = (f: number) => floorTop(f) + 70;

export function spotGeom(id: string) {
  const { floor, type, n } = parseSpot(id);
  const T = floorTop(floor);
  const top = type === "compact";
  const x = top ? 66 + (n - 1) * 31 : type === "bike" ? 66 + (n - 1) * 21 : 129 + (n - 1) * 40;
  const w = top ? 26 : type === "bike" ? 16 : 34;
  return { floor, type, n, x, w, top, y: top ? T + 14 : T + 86, cx: x + w / 2, cy: top ? T + 34 : T + 106 };
}

type Phase = "approach" | "atGate" | "gate" | "toSpot" | "parked" | "conflict" | "toExit" | "paying" | "leaving" | "away";
interface Wp {
  x: number;
  y: number;
  rev?: boolean; // reversing along this segment
}
export interface Vehicle {
  id: number;
  plate: string;
  type: VehicleType;
  gate: GateId;
  phase: Phase;
  x: number;
  y: number;
  h: number; // heading in degrees, 0 = east
  path: Wp[];
  wait: number;
  spot: string | null;
  ticket: string | null;
  entry: number;
  stay: number; // simulated ms it means to stay
  leaveAt: number | null;
  inBay: boolean; // physically in (or turning into) its bay
  voided: boolean;
  gone?: boolean;
}
export interface LogEntry {
  id: number;
  t: number;
  text: string;
  tone: "ok" | "bad" | "info";
}
export interface Sim {
  tick: number;
  now: number;
  seed: number;
  lot: Lot;
  vehicles: Vehicle[];
  nextPlate: number;
  nextGate: GateId;
  gateOpen: Record<GateId | "X", number>;
  mergeFree: number;
  fullFor: VehicleType | null;
  flash: Record<string, { tick: number; dir: number }>;
  conflict: { spot: string; until: number } | null;
  booth: { plate: string; quote: number; voided: boolean } | null;
  log: LogEntry[];
  latest: string;
  events: number;
  revenue: number;
  turnedAway: number;
}
export interface Cfg {
  selector: Selector;
  mode: GateMode;
  rush: boolean;
  /** Arrivals per simulated hour while rush hour runs. */
  rate: number;
  /** Typical stay in hours. */
  stay: number;
}

const plateOf = (n: number) => `KA-${String(n).padStart(2, "0")}`;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const drawStay = (hours: number, r: number) => Math.round((hours * HOUR * (0.4 + 1.2 * r)) / MIN) * MIN;

function draft(s: Sim): Sim {
  return { ...s, vehicles: s.vehicles.map((v) => ({ ...v })), gateOpen: { ...s.gateOpen }, flash: { ...s.flash } };
}
function note(d: Sim, text: string, tone: LogEntry["tone"], readout?: string) {
  d.events++;
  d.log = [{ id: d.events, t: d.now, text, tone }, ...d.log].slice(0, 6);
  if (readout) d.latest = readout;
}
/** The observer: after every change to the free sets, the boards re-read their counts (and flash). */
function setLot(d: Sim, lot: Lot) {
  const before = freeCounts(d.lot);
  const after = freeCounts(lot);
  for (let f = 0; f < FLOORS; f++)
    for (const t of SPOT_TYPES) if (before[f][t] !== after[f][t]) d.flash[`${f}-${t}`] = { tick: d.tick, dir: Math.sign(after[f][t] - before[f][t]) };
  d.lot = lot;
}
function parkedVehicle(id: number, type: VehicleType, spot: string, ticket: string, entry: number, leaveAt: number): Vehicle {
  const g = spotGeom(spot);
  return { id, plate: plateOf(id), type, gate: "A", phase: "parked", x: g.cx, y: g.cy, h: g.top ? -90 : 90, path: [], wait: 0, spot, ticket, entry, stay: leaveAt - entry, leaveAt, inBay: true, voided: false };
}
/** Fill spots with parked vehicles (smallest vehicle that matches the spot type, bikes for bike spots). */
function fill(d: Sim, spots: string[], rand: () => number, minStayMin: number) {
  let lot = d.lot;
  for (const spot of spots) {
    const t = parseSpot(spot).type;
    const type: VehicleType = t === "bike" ? "bike" : t === "compact" ? "car" : "truck";
    const id = d.nextPlate++;
    const entry = d.now - Math.round(20 + rand() * 260) * MIN;
    const out = issue(lot, plateOf(id), type, spot, entry);
    lot = out.lot;
    d.vehicles.push(parkedVehicle(id, type, spot, out.ticket.id, entry, d.now + Math.round(minStayMin + rand() * 150) * MIN));
  }
  setLot(d, lot);
}

const START = ["0-B1", "0-C1", "0-C2", "0-L1", "1-C1", "1-L2"];
export function initSim(prefill: string[] = START): Sim {
  const d: Sim = {
    tick: 0,
    now: 8 * HOUR,
    seed: 20251,
    lot: newLot(),
    vehicles: [],
    nextPlate: 1,
    nextGate: "A",
    gateOpen: { A: -1, B: -1, X: -1 },
    mergeFree: 0,
    fullFor: null,
    flash: {},
    conflict: null,
    booth: null,
    log: [],
    latest: "",
    events: 0,
    revenue: 0,
    turnedAway: 0,
  };
  fill(d, prefill, mulberry32(3), 30);
  d.flash = {};
  d.latest = prefill.length
    ? `${prefill.length} vehicles are parked. Add one, click a parked one to send it to the exit, or press Run for rush hour.`
    : "The lot is empty. Add a vehicle, or press Run for rush hour.";
  return d;
}

function spawn(d: Sim, type: VehicleType, stay: number, gate?: GateId) {
  const g = gate ?? d.nextGate;
  d.nextGate = g === "A" ? "B" : "A";
  const id = d.nextPlate++;
  const y = LANE_Y[g];
  const v: Vehicle = { id, plate: plateOf(id), type, gate: g, phase: "approach", x: SPAWN_X, y, h: 180, path: [{ x: GATE_X + 5 + HALF[type], y }], wait: 0, spot: null, ticket: null, entry: 0, stay, leaveAt: null, inBay: false, voided: false };
  d.vehicles.push(v);
  return v;
}

/** A vehicle joins the queue for the next gate (gates alternate A, B). */
export function addArrival(s: Sim, type: VehicleType, stayHours: number): Sim {
  const d = draft(s);
  const v = spawn(d, type, drawStay(stayHours, mulberry32(s.seed ^ (s.nextPlate * 7919))()));
  d.latest = `${NAME[type]} ${v.plate} is driving to Gate ${v.gate}.`;
  return d;
}

function routeIn(v: Vehicle): Wp[] {
  const g = spotGeom(v.spot!);
  const lane = aisleY(g.floor) - 8;
  return [{ x: UP_X, y: v.y }, { x: UP_X, y: lane }, { x: g.cx, y: lane }, { x: g.cx, y: g.cy }];
}
function routeOut(v: Vehicle, fromBay: boolean): Wp[] {
  const g = spotGeom(v.spot!);
  const lane = aisleY(g.floor) + 8;
  return [fromBay ? { x: g.cx, y: lane, rev: true } : { x: v.x, y: lane }, { x: DOWN_X, y: lane }, { x: DOWN_X, y: EXIT_Y }, { x: EXIT_GATE_X - 5 - HALF[v.type], y: EXIT_Y }];
}

/** Drive toward the next waypoint (stopping at it), turning smoothly; reversing keeps the nose pointing back. */
function move(v: Vehicle, dist: number) {
  const wp = v.path[0];
  if (!wp || dist <= 0) return;
  const dx = wp.x - v.x;
  const dy = wp.y - v.y;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) {
    const dir = (Math.atan2(dy, dx) * 180) / Math.PI + (wp.rev ? 180 : 0);
    v.h = wrap(v.h + Math.max(-45, Math.min(45, wrap(dir - v.h))));
  }
  if (len <= dist) {
    v.x = wp.x;
    v.y = wp.y;
    v.path = v.path.slice(1);
  } else {
    v.x += (dx / len) * dist;
    v.y += (dy / len) * dist;
  }
}
/** Room to the vehicle ahead on a horizontal lane (dir -1: westbound entry lanes, +1: eastbound exit lane). */
function room(d: Sim, v: Vehicle, dir: 1 | -1) {
  let r = Infinity;
  for (const o of d.vehicles) if (o !== v && o.y === v.y && (o.x - v.x) * dir > 0 && o.phase !== "parked") r = Math.min(r, Math.abs(o.x - v.x) - HALF[o.type] - HALF[v.type] - GAP);
  return Math.max(0, r);
}

function startExit(d: Sim, v: Vehicle) {
  v.phase = "toExit";
  v.inBay = false;
  v.path = routeOut(v, true);
  d.events++;
  d.latest = `${NAME[v.type]} ${v.plate} is leaving ${v.spot}. The spot stays out of the free set until the ticket is paid at the exit.`;
}

/** A parked vehicle is sent to the exit (a click on it, or its stay is over). */
export function requestExit(s: Sim, id: number): Sim {
  if (!s.vehicles.some((v) => v.id === id && v.phase === "parked")) return s;
  const d = draft(s);
  startExit(d, d.vehicles.find((v) => v.id === id)!);
  return d;
}

function pay(d: Sim, v: Vehicle) {
  if (v.voided) {
    note(d, `${v.plate} left without parking (ticket voided)`, "bad", `${v.plate} leaves without a spot: an attendant voided its ticket. ${v.spot} was handed out twice, and only one car fits.`);
  } else {
    const ms = d.now - v.entry;
    const { lot, fee } = exitLot(d.lot, v.ticket!, d.now);
    setLot(d, lot);
    d.revenue += fee;
    const { floor, type } = parseSpot(v.spot!);
    note(
      d,
      `${v.plate} paid ${fee} for ${fmtDuration(ms)} (${feeText(ms, v.type)}); ${v.spot} free`,
      "ok",
      `${NAME[v.type]} ${v.plate} paid ${fee} for ${fmtDuration(ms)}: ${feeText(ms, v.type)}. ${v.spot} is free again; ${SPOT_NAME[type].toLowerCase()} spots free on floor ${floor}: ${lot.free[floor][type].length}.`,
    );
  }
  d.gateOpen.X = d.tick + 12;
  v.phase = "leaving";
  v.path = [{ x: SPAWN_X, y: EXIT_Y }];
}

function parkSentence(before: Lot, after: Lot, v: Vehicle, spot: string, selector: Selector) {
  const { floor, type } = parseSpot(spot);
  const fits = FITS[v.type];
  const smaller = fits.slice(0, fits.indexOf(type));
  let why = "";
  if (smaller.length) {
    const elsewhere = before.free.some((fl) => smaller.some((t) => fl[t].length));
    why =
      elsewhere && selector === "lowestFloor"
        ? ` Lowest floor first prefers a ${type} spot on floor ${floor} to a ${smaller.join(" or ")} spot higher up.`
        : ` No ${smaller.join(" or ")} spot was free on any floor.`;
  }
  return `${NAME[v.type]} ${v.plate} took ${spot} via Gate ${v.gate}.${why} ${SPOT_NAME[type]} spots free on floor ${floor}: ${after.free[floor][type].length}.`;
}

function admitArrivals(d: Sim, cfg: Cfg) {
  const at = d.vehicles.filter((v) => v.phase === "atGate").sort((a, b) => a.gate.localeCompare(b.gate));
  if (!at.length) return;
  const before = d.lot;
  const { lot, results } = admit(before, at.map((v) => ({ gate: v.gate, plate: v.plate, vehicle: v.type })), cfg.selector, cfg.mode, d.now);
  setLot(d, lot);
  const said: string[] = [];
  results.forEach((r, i) => {
    const v = at[i];
    if (r.ok) {
      Object.assign(v, { phase: "gate", wait: TICKET_TICKS, spot: r.ticket.spot, ticket: r.ticket.id, entry: d.now, leaveAt: d.now + v.stay });
      d.gateOpen[v.gate] = d.tick + TICKET_TICKS + 5;
      note(d, `Gate ${v.gate}: ticket for ${v.plate} (${v.type}) → ${r.ticket.spot}`, "ok");
      said.push(parkSentence(before, lot, v, r.ticket.spot, cfg.selector));
    } else {
      Object.assign(v, { phase: "away", wait: AWAY_TICKS });
      d.fullFor = v.type;
      d.turnedAway++;
      note(d, `Gate ${v.gate}: ${v.plate} turned away (${r.error})`, "bad");
      said.push(`${NAME[v.type]} ${v.plate} was turned away at Gate ${v.gate}: "${r.error}". No ${FITS[v.type].join(" or ")} spot is free on any floor.`);
    }
  });
  d.latest = said.join(" ");
  if (results.length > 1) {
    const spots = results.flatMap((r) => (r.ok ? [r.ticket.spot] : []));
    const dup = spots.find((x, i) => spots.indexOf(x) !== i);
    const lost = at.find((v, i) => !results[i].ok && chooseSpot(before, v.type, cfg.selector));
    if (dup) d.latest = `Race: Gate A and Gate B both read ${dup} as free before either one removed it, so ${at[0].plate} and ${at[1].plate} were both told ${dup}. Two tickets now point at one spot.`;
    else if (lost) {
      const won = at.find((v) => v.spot)!;
      d.latest = `Atomic take(): Gate ${won.gate}'s take() removed ${won.spot} before Gate ${lost.gate}'s ran, so ${lost.plate} got "Lot full for ${lost.type}" and turns away. One spot, one car.`;
    }
  }
}

/** One 50 ms tick: arrivals, movement, gates, payments. Pure: returns a new state (or the same one when idle). */
export function stepSim(s: Sim, cfg: Cfg): Sim {
  if (!cfg.rush && s.vehicles.length === 0) return s;
  const d = draft(s);
  d.tick++;
  d.now += SIM_PER_TICK;
  d.seed = (s.seed + 0x9e3779b9) | 0;
  const rand = mulberry32(s.seed);
  if (cfg.rush && rand() < (cfg.rate * SIM_PER_TICK) / HOUR) {
    const r = rand();
    spawn(d, r < 0.2 ? "bike" : r < 0.85 ? "car" : "truck", drawStay(cfg.stay, rand()));
  }
  d.booth = null;
  for (const v of d.vehicles) {
    switch (v.phase) {
      case "approach":
        move(v, Math.min(SPEED, room(d, v, -1)));
        if (!v.path.length) v.phase = "atGate";
        break;
      case "gate":
        d.gateOpen[v.gate] = Math.max(d.gateOpen[v.gate], d.tick + 5);
        if (--v.wait <= 0 && d.tick >= d.mergeFree) {
          v.phase = "toSpot";
          v.path = routeIn(v);
          d.mergeFree = d.tick + MERGE_TICKS;
        }
        break;
      case "toSpot": {
        if (!v.inBay && v.path.length === 1) {
          const holder = d.vehicles.find((o) => o !== v && o.spot === v.spot && o.inBay);
          if (holder) {
            v.phase = "conflict";
            v.wait = CONFLICT_TICKS;
            d.conflict = { spot: v.spot!, until: d.tick + CONFLICT_TICKS + 30 };
            note(
              d,
              `✕ double-assigned ${v.spot}: ${holder.plate} is in it, ${v.plate} has a ticket for it too`,
              "bad",
              `Double-assigned ${v.spot}: ${v.plate} arrives and finds ${holder.plate} already in it. Checking and taking in two steps let both gates hand out the same spot; one atomic take() (or FOR UPDATE SKIP LOCKED across servers) makes that impossible.`,
            );
            break;
          }
          v.inBay = true;
        }
        move(v, SPEED);
        if (!v.path.length) {
          v.phase = "parked";
          v.h = spotGeom(v.spot!).top ? -90 : 90;
          d.events++;
        }
        break;
      }
      case "parked":
        if (v.leaveAt !== null && d.now >= v.leaveAt) startExit(d, v);
        break;
      case "conflict":
        if (--v.wait <= 0) {
          d.lot = voidTicket(d.lot, v.ticket!);
          Object.assign(v, { voided: true, phase: "toExit", path: routeOut(v, false) });
        }
        break;
      case "toExit": {
        // follow the vehicle ahead on the westbound aisle line and on the exit lane
        const wp = v.path[0];
        move(v, Math.min(SPEED, v.y === EXIT_Y ? room(d, v, 1) : wp && wp.y === v.y && wp.x < v.x ? room(d, v, -1) : SPEED));
        if (!v.path.length) {
          v.phase = "paying";
          v.wait = PAY_TICKS;
          d.events++;
        }
        break;
      }
      case "paying":
        d.booth = { plate: v.plate, quote: v.voided ? 0 : parkingFee(d.now - v.entry, v.type), voided: v.voided };
        if (--v.wait <= 0) pay(d, v);
        break;
      case "leaving":
        move(v, Math.min(SPEED, room(d, v, 1)));
        if (!v.path.length) v.gone = true;
        break;
      case "away":
        if (--v.wait <= 0) v.gone = true;
        break;
    }
    if (v.gone) d.events++;
  }
  admitArrivals(d, cfg);
  if (d.conflict && d.tick > d.conflict.until) d.conflict = null;
  d.vehicles = d.vehicles.filter((v) => !v.gone);
  return d;
}

/** Step button: run until something happens (a ticket, a park, a payment…), at most 120 ticks (1 simulated hour). */
export function stepToEvent(s: Sim, cfg: Cfg, maxTicks = 120): Sim {
  let x = s;
  for (let i = 0; i < maxTicks; i++) {
    const next = stepSim(x, cfg);
    if (next === x) break;
    x = next;
    if (x.events !== s.events) break;
  }
  return x;
}

/** Fill every compact and large spot except RACE_SPOT, then send two cars to Gate A and Gate B at the same instant. */
export function twoCarsOneSpot(s: Sim, stayHours: number): Sim {
  const d = draft(s);
  Object.assign(d, { vehicles: [], conflict: null, booth: null, fullFor: null, mergeFree: d.tick });
  d.lot = newLot();
  const bikes = new Set(["0-B1", "0-B2", "1-B1"]);
  fill(d, ALL_SPOTS.filter((id) => id !== RACE_SPOT && (parseSpot(id).type !== "bike" || bikes.has(id))), mulberry32(77), 90);
  const rand = mulberry32(s.seed);
  spawn(d, "car", drawStay(stayHours, rand()), "A");
  spawn(d, "car", drawStay(stayHours, rand()), "B");
  d.nextGate = "A";
  note(d, `Demo: only ${RACE_SPOT} is left for cars; two cars head for Gate A and Gate B together`, "info", `Every compact and large spot is taken except ${RACE_SPOT}. Two cars are about to reach Gate A and Gate B at the same instant.`);
  return d;
}

// ================================================================ picture
const COLOR: Record<VehicleType, string> = { bike: "var(--series-2)", car: "var(--series-1)", truck: "var(--series-3)" };
const SPOT_COLOR: Record<SpotType, string> = { bike: "var(--series-2)", compact: "var(--series-1)", large: "var(--series-3)" };
const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, var(--card))`;

function Wheels({ xs, y1, y2 }: { xs: number[]; y1: number; y2: number }) {
  return xs.flatMap((x) => [y1, y2].map((y) => <rect key={`${x},${y}`} x={x} y={y} width={6} height={2.5} rx={1} fill="var(--fg)" />));
}

/** Top-down vehicles drawn facing east (+x). */
function VehicleShape({ type }: { type: VehicleType }) {
  const c = COLOR[type];
  if (type === "bike")
    return (
      <g>
        <rect x={-9} y={-1.5} width={5} height={3} rx={1.4} fill="var(--fg)" />
        <rect x={4} y={-1.5} width={5} height={3} rx={1.4} fill="var(--fg)" />
        <rect x={-6} y={-2.8} width={11} height={5.6} rx={2.8} fill={c} />
        <line x1={4} y1={-5} x2={4} y2={5} stroke="var(--fg)" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={-1.5} cy={0} r={2.6} fill="var(--card)" stroke={c} strokeWidth={1.4} />
      </g>
    );
  if (type === "car")
    return (
      <g>
        <Wheels xs={[-11, 5]} y1={-9.5} y2={7} />
        <rect x={-15} y={-8} width={30} height={16} rx={4.5} fill={c} />
        <rect x={3} y={-6.3} width={5.5} height={12.6} rx={1.8} fill="var(--card)" opacity={0.85} />
        <rect x={-12} y={-5.8} width={3.5} height={11.6} rx={1.3} fill="var(--card)" opacity={0.7} />
        <circle cx={14} cy={-5} r={1.2} fill="var(--warning)" />
        <circle cx={14} cy={5} r={1.2} fill="var(--warning)" />
      </g>
    );
  return (
    <g>
      <Wheels xs={[-16, -8, 10]} y1={-11.5} y2={9} />
      <rect x={-19} y={-10} width={27} height={20} rx={2} fill={c} />
      {[-12, -5, 2].map((x) => (
        <line key={x} x1={x} y1={-9} x2={x} y2={9} stroke="var(--card)" strokeOpacity={0.4} strokeWidth={1} />
      ))}
      <rect x={9.5} y={-9} width={9.5} height={18} rx={3} fill={c} />
      <rect x={14} y={-7.2} width={3.6} height={14.4} rx={1.3} fill="var(--card)" opacity={0.85} />
    </g>
  );
}

function VehicleView({ v, reduce, focused, onExit, setFocus }: { v: Vehicle; reduce: boolean; focused: boolean; onExit: (id: number) => void; setFocus: (id: number | null) => void }) {
  const parked = v.phase === "parked";
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onExit(v.id);
    }
  };
  return (
    <m.g
      initial={false}
      animate={{ x: v.x, y: v.y, opacity: v.phase === "away" ? Math.max(0.15, v.wait / AWAY_TICKS) : 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.06, ease: "linear" }}
      role={parked ? "button" : undefined}
      tabIndex={parked ? 0 : undefined}
      aria-label={parked ? `${NAME[v.type]} ${v.plate} parked in ${v.spot}: send it to the exit` : undefined}
      aria-hidden={parked ? undefined : true}
      onClick={parked ? () => onExit(v.id) : undefined}
      onKeyDown={parked ? onKey : undefined}
      onFocus={parked ? () => setFocus(v.id) : undefined}
      onBlur={parked ? () => setFocus(null) : undefined}
      style={parked ? { cursor: "pointer", outline: "none" } : undefined}
    >
      {parked && <rect x={-13} y={-22} width={26} height={44} fill="transparent" />}
      <g transform={`rotate(${v.h.toFixed(1)})`}>
        <VehicleShape type={v.type} />
      </g>
      {v.type !== "bike" && (
        <g aria-hidden="true">
          <rect x={-7.5} y={-4.8} width={15} height={9.6} rx={2} fill="var(--card)" />
          <text y={3} textAnchor="middle" style={{ fontSize: 8, fontWeight: 750 }}>
            {v.plate.slice(-2)}
          </text>
        </g>
      )}
      {focused && parked && <circle r={HALF[v.type] + 5} fill="none" stroke="var(--accent)" strokeWidth={2.5} />}
      {v.phase === "conflict" && <circle r={HALF[v.type] + 4} fill="none" stroke="var(--critical)" strokeWidth={2.5} strokeDasharray="4 3" />}
      {v.phase === "away" && (
        <g>
          <rect x={-22} y={-25} width={44} height={13} rx={6.5} style={{ fill: tint("var(--critical)", 16) }} stroke="var(--critical)" />
          <text y={-15.5} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: "var(--critical-ink)" }}>
            ✕ full
          </text>
        </g>
      )}
    </m.g>
  );
}

function Arm({ x, y, open, reduce }: { x: number; y: number; open: boolean; reduce: boolean }) {
  return (
    <g aria-hidden="true">
      <g style={{ transformOrigin: `${x}px ${y}px`, transform: `rotate(${open ? -80 : 0}deg)`, transition: reduce ? "none" : "transform 0.3s ease" }}>
        <rect x={x - 1.6} y={y} width={3.2} height={24} rx={1.5} fill="var(--critical)" />
        <line x1={x} y1={y + 3} x2={x} y2={y + 22} stroke="var(--card)" strokeWidth={1.4} strokeDasharray="3 3" />
      </g>
      <circle cx={x} cy={y} r={3.2} fill="var(--fg)" />
    </g>
  );
}

const STRUCTURE = (
  <g aria-hidden="true">
    <rect x={4} y={80} width={52} height={466} rx={6} fill="var(--border)" />
    <line x1={30} y1={86} x2={30} y2={516} stroke="var(--card)" strokeWidth={1.5} strokeDasharray="6 6" />
    {[150, 284, 420].map((y) => (
      <g key={y}>
        <text x={UP_X} y={y} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
          ▲
        </text>
        <text x={DOWN_X} y={y} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
          ▼
        </text>
      </g>
    ))}
    <text x={30} y={76} textAnchor="middle" className="muted-text" style={{ fontSize: 9.5 }}>
      ramps
    </text>
    {Array.from({ length: FLOORS }, (_, f) => {
      const T = floorTop(f);
      return (
        <g key={f}>
          <rect x={60} y={T} width={196} height={126} rx={6} fill="var(--card-2)" stroke="var(--border-strong)" />
          <rect x={52} y={T + 54} width={204} height={32} fill="var(--border)" />
          <line x1={62} y1={T + 70} x2={252} y2={T + 70} stroke="var(--card)" strokeWidth={1.2} strokeDasharray="7 6" />
          <text x={66} y={T + 11} style={{ fontSize: 10.5, fontWeight: 700 }}>
            Floor {f}
          </text>
        </g>
      );
    })}
    <rect x={30} y={448} width={W - 30} height={24} fill="var(--border)" />
    <rect x={30} y={484} width={W - 30} height={24} fill="var(--border)" />
    <rect x={4} y={520} width={W - 4} height={24} fill="var(--border)" />
    {[460, 496].map((y) => (
      <text key={y} x={300} y={y + 4} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
        ◀ in
      </text>
    ))}
    <text x={300} y={536} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
      out ▶
    </text>
    <text x={GATE_X + 7} y={443} style={{ fontSize: 10.5, fontWeight: 700 }}>
      Gate A
    </text>
    <text x={GATE_X + 7} y={482} style={{ fontSize: 10, fontWeight: 700 }}>
      Gate B
    </text>
    <text x={EXIT_GATE_X + 7} y={518} style={{ fontSize: 10, fontWeight: 700 }}>
      Exit
    </text>
  </g>
);

function Board({ floor, counts, flash, tick }: { floor: number; counts: Record<SpotType, number>; flash: Sim["flash"]; tick: number }) {
  const T = floorTop(floor) + 14;
  return (
    <g role="img" aria-label={`Floor ${floor} board: ${counts.bike} bike, ${counts.compact} compact, ${counts.large} large spots free`}>
      <rect x={260} y={T} width={82} height={97} rx={7} fill="var(--card)" stroke="var(--border-strong)" />
      <text x={301} y={T + 13} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700 }}>
        Floor {floor} free
      </text>
      {SPOT_TYPES.map((t, i) => {
        const y = T + 19 + i * 25;
        const f = flash[`${floor}-${t}`];
        const hot = !!f && tick - f.tick < FLASH_TICKS;
        const n = counts[t];
        return (
          <g key={t}>
            <rect x={264} y={y} width={74} height={22} rx={5} style={{ fill: hot ? tint("var(--accent)", 26) : "var(--card-2)" }} stroke={hot ? "var(--accent)" : "none"} />
            {n ? (
              <rect x={268} y={y + 6} width={4} height={10} rx={1} fill={SPOT_COLOR[t]} />
            ) : (
              <text x={270} y={y + 15} textAnchor="middle" style={{ fontSize: 10, fontWeight: 750, fill: "var(--critical-ink)" }}>
                ✕
              </text>
            )}
            <text x={276} y={y + 15} style={{ fontSize: 10 }}>
              {SPOT_NAME[t]}
            </text>
            {hot && f && (
              <text x={325} y={y + 14.5} textAnchor="middle" style={{ fontSize: 8, fill: "var(--accent)" }}>
                {f.dir < 0 ? "▼" : "▲"}
              </text>
            )}
            <text x={337} y={y + 15.5} textAnchor="end" style={{ fontSize: 12.5, fontWeight: 750, fill: n ? "var(--fg)" : "var(--critical-ink)" }}>
              {n}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ================================================================ widget
export function ParkingLotSim() {
  const [selector, setSelector] = useState<Selector>("lowestFloor");
  const [mode, setMode] = useState<GateMode>("atomic");
  const [rush, setRush] = useState(false);
  const [rate, setRate] = useState(8);
  const [stay, setStay] = useState(3);
  const [focusId, setFocusId] = useState<number | null>(null);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const cfg = useMemo<Cfg>(() => ({ selector, mode, rush: rush && !reduce, rate, stay }), [selector, mode, rush, reduce, rate, stay]);
  const step = useCallback((s: Sim) => stepSim(s, cfg), [cfg]);
  const [sim, reset] = useFixedStep<Sim>(() => initSim(), step, inView && !reduce);
  const said = useThrottled(sim.latest, 900);

  const counts = freeCounts(sim.lot);
  const freeIds = new Set(sim.lot.free.flatMap((fl) => [...fl.bike, ...fl.compact, ...fl.large]));
  const inBay = new Set(sim.vehicles.filter((v) => v.inBay).map((v) => v.spot));
  const lotFull = !chooseSpot(sim.lot, "bike", "lowestFloor");
  const fullFor = !lotFull && sim.fullFor && !chooseSpot(sim.lot, sim.fullFor, "lowestFloor") ? sim.fullFor : null;
  const parked = sim.vehicles.filter((v) => v.phase === "parked").length;
  const sign = lotFull ? "✕ LOT FULL" : fullFor ? `✕ FULL for ${fullFor}` : "✓ SPACES";
  const exitVehicle = (id: number) => reset(requestExit(sim, id));
  const arrive = (type: VehicleType) => reset(addArrival(sim, type, stay));

  const conflictMark = sim.conflict && spotGeom(sim.conflict.spot);
  return (
    <WidgetFrame
      title="Parking lot simulator"
      sub="Three floors, two entry gates, one pay booth, running the page's design: FITS, a free set per spot type on each floor, the selector you pick, and hourly pricing with a 10 min grace period and a daily cap."
    >
      <div className="controls">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="wbtn primary" onClick={() => arrive("bike")}>
            <Bike size={14} aria-hidden /> Bike arrives
          </button>
          <button type="button" className="wbtn primary" onClick={() => arrive("car")}>
            <Car size={14} aria-hidden /> Car arrives
          </button>
          <button type="button" className="wbtn primary" onClick={() => arrive("truck")}>
            <Truck size={14} aria-hidden /> Truck arrives
          </button>
        </div>
        <Seg<Selector>
          label="Spot selector"
          value={selector}
          onChange={setSelector}
          options={[
            { value: "lowestFloor", label: "Lowest floor first" },
            { value: "smallestType", label: "Smallest spot first (SQL)" },
          ]}
        />
      </div>
      <div className="controls">
        <div className="control" style={{ flex: "none", minWidth: 0 }}>
          <span>Rush hour (auto traffic)</span>
          <SimButtons
            running={rush && !reduce}
            reduce={reduce}
            onToggle={() => setRush((r) => !r)}
            onStep={() => reset(stepToEvent(sim, cfg))}
            stepHint="Jump to the next event (at most 1 simulated hour)"
            onReset={() => {
              setRush(false);
              reset(initSim());
            }}
          />
        </div>
        <Slider label="Arrivals" value={rate} min={2} max={20} onChange={setRate} format={(v) => `${v} per hour`} />
        <Slider label="Typical stay" value={stay} min={0.5} max={8} step={0.5} onChange={setStay} format={(v) => `${v} h`} />
      </div>
      <div className="controls">
        <Seg<GateMode>
          label="Gates share"
          value={mode}
          onChange={setMode}
          options={[
            { value: "atomic", label: "Atomic take()" },
            { value: "race", label: "Check, then take (race)" },
          ]}
        />
        <button
          type="button"
          className="wbtn"
          onClick={() => {
            setRush(false);
            reset(twoCarsOneSpot(sim, stay));
          }}
        >
          <Swords size={14} aria-hidden /> Two cars, one spot
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <div ref={ref} style={{ flex: "3 1 300px", minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="sim-svg"
            style={{ maxWidth: 460, margin: "0 auto" }}
            role="group"
            aria-label={`Parking lot seen from above: 3 floors joined by ramps, entry gates A and B, and an exit with a pay booth. ${TOTAL_SPOTS - freeIds.size} of ${TOTAL_SPOTS} spots taken, ${parked} vehicles parked. Parked vehicles are buttons that send them to the exit.`}
          >
            {STRUCTURE}
            <g aria-hidden="true">
              <text x={6} y={18} style={{ fontSize: 15, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
                {fmtClock(sim.now)}
              </text>
              <text x={W - 4} y={18} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>
                1 s ≈ 10 min · {TOTAL_SPOTS - freeIds.size}/{TOTAL_SPOTS} taken
              </text>
              {ALL_SPOTS.map((id) => {
                const g = spotGeom(id);
                const held = !freeIds.has(id) && !inBay.has(id);
                const bad = sim.conflict?.spot === id;
                return (
                  <g key={id}>
                    <rect x={g.x} y={g.y} width={g.w} height={40} rx={2} style={{ fill: held ? tint("var(--accent)", 12) : "none" }} stroke={bad ? "var(--critical)" : held ? "var(--accent)" : "var(--border-strong)"} strokeWidth={bad ? 2.5 : held ? 1.4 : 1} strokeDasharray={held ? "4 3" : undefined} />
                    <rect x={g.x + 2} y={g.top ? g.y + 1 : g.y + 36} width={g.w - 4} height={3} rx={1} fill={SPOT_COLOR[g.type]} />
                    {!inBay.has(id) && (
                      <text x={g.cx} y={g.y + 24} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
                        {LETTER[g.type]}
                        {g.n}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            {Array.from({ length: FLOORS }, (_, f) => (
              <Board key={f} floor={f} counts={counts[f]} flash={sim.flash} tick={sim.tick} />
            ))}
            <g role="img" aria-label={`Entrance sign: ${lotFull ? "lot full" : fullFor ? `full for ${fullFor}s` : "spaces free"}`}>
              <rect x={172} y={428} width={98} height={18} rx={4} style={{ fill: lotFull || fullFor ? tint("var(--critical)", 18) : tint("var(--good)", 10) }} stroke={lotFull || fullFor ? "var(--critical)" : "var(--good)"} strokeWidth={1.4} />
              <text x={221} y={441} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 750, fill: lotFull || fullFor ? "var(--critical-ink)" : "var(--good-ink)" }}>
                {sign}
              </text>
            </g>
            <Arm x={GATE_X} y={448} open={sim.tick < sim.gateOpen.A} reduce={reduce} />
            <Arm x={GATE_X} y={484} open={sim.tick < sim.gateOpen.B} reduce={reduce} />
            <Arm x={EXIT_GATE_X} y={520} open={sim.tick < sim.gateOpen.X} reduce={reduce} />
            <g aria-hidden="true">
              <rect x={86} y={549} width={110} height={22} rx={5} fill="var(--card)" stroke="var(--border-strong)" />
              <text x={141} y={564} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: sim.booth ? 750 : 500 }} className={sim.booth ? undefined : "muted-text"}>
                {sim.booth ? (sim.booth.voided ? `${sim.booth.plate}: ticket void` : `${sim.booth.plate} pays ${sim.booth.quote}`) : "Pay booth"}
              </text>
            </g>
            {conflictMark && (
              <g role="img" aria-label={`Double-assigned ${sim.conflict!.spot}`}>
                <rect x={124} y={floorTop(conflictMark.floor) + 1} width={130} height={12} rx={6} style={{ fill: tint("var(--critical)", 16) }} stroke="var(--critical)" />
                <text x={189} y={floorTop(conflictMark.floor) + 10.5} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 750, fill: "var(--critical-ink)" }}>
                  ✕ double-assigned {sim.conflict!.spot}
                </text>
              </g>
            )}
            {sim.vehicles.map((v) => (
              <VehicleView key={v.id} v={v} reduce={reduce} focused={focusId === v.id} onExit={exitVehicle} setFocus={setFocusId} />
            ))}
          </svg>
        </div>
        <div style={{ flex: "2 1 220px", minWidth: 0, display: "grid", gap: 10, fontSize: 13.5 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
            {[
              ["Clock", fmtClock(sim.now)],
              ["Free spots", `${freeIds.size} of ${TOTAL_SPOTS}`],
              ["Revenue", String(sim.revenue)],
              ["Turned away", String(sim.turnedAway)],
            ].map(([k, val]) => (
              <div key={k} style={{ background: "var(--card-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px" }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {k}
                </div>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{val}</b>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 650 }}>Event log</div>
            <ol style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "grid", gap: 4 }} aria-label="Last six events">
              {sim.log.length === 0 && <li className="muted">Nothing yet: add a vehicle.</li>}
              {sim.log.map((e) => (
                <li key={e.id} style={{ margin: 0, lineHeight: 1.4 }}>
                  <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmtClock(e.t)}
                  </span>{" "}
                  <span className={e.tone === "ok" ? "ok-ink" : e.tone === "bad" ? "bad-ink" : "muted"} aria-hidden>
                    {e.tone === "ok" ? "✓" : e.tone === "bad" ? "✕" : "•"}
                  </span>{" "}
                  {e.text
                    .replace(/^✕ /, "")
                    .split(/(→ \d-[BCL]\d|\d-[BCL]\d|KA-\d+)/)
                    .map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span> : part))}
                </li>
              ))}
            </ol>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>
            Pricing: first {GRACE_MIN} min free, then every started hour (bike {RATES.bike}, car {RATES.car}, truck {RATES.truck}), at most {DAILY_CAP} a day. Bays: B bike, C compact, L large; a dashed bay is held by a ticket with no vehicle in it yet. Each vehicle stays about the typical stay; click or press Enter on a parked one to send it out early.
          </p>
        </div>
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: vehicles jump instead of driving; Step moves to the next event." />
      </p>
    </WidgetFrame>
  );
}

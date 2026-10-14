"use client";
import { useCallback, useEffect, useId, useState, type RefObject } from "react";
import { m } from "motion/react";
import { hash32, mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const FLOORS = 8; // G, 1 … 7
export const CARS = ["A", "B", "C"] as const;
export const CAP = 6; // riders per car
export const FLOOR_MS = 1200; // travel time per floor
export const DOOR_MS = 600; // doors opening (or closing)
export const HOLD_MS = 1000; // doors stay open at least this long
export const PER_PERSON_MS = 350; // extra hold per person getting on or off
export const LEAVE_MS = 1400; // a delivered person walks off for this long
export const STOP_COST = 2; // nearest car: one stop costs about two floors of travel
const START = [0, 3, 6]; // where the cars wait at t = 0
const SUB_MS = 100; // stepSim splits long steps into ticks of at most this

export type Strategy = "fcfs" | "nearest" | "collective";
export type Traffic = "manual" | "rush" | "random";
export type Dir = "up" | "down";
export type Phase = "closed" | "opening" | "open" | "closing";
export type CarState = "IDLE" | "MOVING_UP" | "MOVING_DOWN" | "DOORS_OPEN" | "OUT_OF_SERVICE";

export interface Person {
  id: number;
  from: number;
  to: number;
  stage: "waiting" | "riding" | "leaving";
  /** Start of the current wait. */
  since: number;
  /** Total time spent waiting so far (a second wait after an evacuation adds to it). */
  waited: number;
  boarded: boolean;
  car: number;
  /** When the person got on (riding) or started walking off (leaving). */
  at: number;
}
/** FCFS keeps each car's stops in arrival order: a car call (dir null) or an assigned hall call. */
export interface Stop {
  floor: number;
  dir: Dir | null;
}
export interface Car {
  /** Floors from the ground; fractional while moving, an exact integer whenever stopped. */
  pos: number;
  /** Motion this tick. */
  moving: -1 | 0 | 1;
  /** Committed sweep direction (LOOK keeps it through stops); 0 when idle. */
  dir: -1 | 0 | 1;
  phase: Phase;
  /** 0 = closed, 1 = fully open. */
  door: number;
  hold: number;
  /** Direction served at the current stop: who may get on. */
  svc: Dir | null;
  calls: number[];
  order: Stop[];
  riders: number[];
  oos: boolean;
  travelled: number;
  /** Hall call cleared by the current stop, for the readout. */
  cleared: string | null;
}
export interface HallCall {
  id: number;
  floor: number;
  dir: Dir;
  at: number;
  /** Assigned car index, or -1 while queued / pooled. */
  car: number;
}
export type SimEvent =
  | { type: "call"; call: number; floor: number; dir: Dir }
  | { type: "assign"; call: number; floor: number; dir: Dir; car: number }
  | { type: "release"; call: number; floor: number; dir: Dir; car: number; why: "out of service" | "full" }
  | { type: "clear"; call: number; floor: number; dir: Dir; car: number; assigned: number }
  | { type: "open"; car: number; floor: number; svc: Dir | null }
  | { type: "board" | "alight"; person: number; car: number; floor: number };
export interface Sim {
  t: number;
  seed: number;
  strategy: Strategy;
  traffic: Traffic;
  /** Passengers per minute (auto traffic). */
  rate: number;
  cars: Car[];
  calls: HallCall[];
  people: Person[];
  nextId: number;
  nextCall: number;
  /** Index of the next generated arrival and its time. */
  k: number;
  nextArrival: number;
  stats: { boarded: number; sumWait: number; maxWait: number; delivered: number; sumRide: number };
  /** Latest event, as a sentence. */
  last: string;
  /** Events emitted by the latest call (step or action). */
  events: SimEvent[];
}

export const floorName = (f: number) => (f === 0 ? "G" : String(f));
export const callName = (f: number, d: Dir) => `${floorName(f)}${d === "up" ? "▲" : "▼"}`;
export const dirOf = (p: Person): Dir => (p.to > p.from ? "up" : "down");
const sgn = (d: Dir | null) => (d === "up" ? 1 : d === "down" ? -1 : 0);
const dname = (n: number): Dir | null => (n > 0 ? "up" : n < 0 ? "down" : null);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const newCar = (pos: number): Car => ({ pos, moving: 0, dir: 0, phase: "closed", door: 0, hold: 0, svc: null, calls: [], order: [], riders: [], oos: false, travelled: 0, cleared: null });

/** Arrival k's randomness depends only on (seed, k), so every strategy replays the same passengers. */
const arrivalRng = (seed: number, k: number) => mulberry32(hash32(`lift:${seed}:${k}`));
const gapMs = (s: Sim, k: number) => (-Math.log(1 - arrivalRng(s.seed, k)()) * 60_000) / Math.max(0.5, s.rate);

export function initSim({ seed = 7, strategy = "collective", traffic = "random", rate = 10 }: { seed?: number; strategy?: Strategy; traffic?: Traffic; rate?: number } = {}): Sim {
  const s: Sim = {
    t: 0,
    seed,
    strategy,
    traffic,
    rate,
    cars: START.map(newCar),
    calls: [],
    people: [],
    nextId: 1,
    nextCall: 1,
    k: 0,
    nextArrival: Infinity,
    stats: { boarded: 0, sumWait: 0, maxWait: 0, delivered: 0, sumRide: 0 },
    last: "",
    events: [],
  };
  if (traffic !== "manual") s.nextArrival = gapMs(s, 0);
  return s;
}

const clone = (s: Sim): Sim => ({
  ...s,
  cars: s.cars.map((c) => ({ ...c, calls: [...c.calls], order: c.order.map((o) => ({ ...o })), riders: [...c.riders] })),
  calls: s.calls.map((h) => ({ ...h })),
  people: s.people.map((p) => ({ ...p })),
  stats: { ...s.stats },
  events: [],
});

/** The trip of generated arrival k: morning rush starts 85% of trips at G going up. */
export function tripFor(seed: number, traffic: Traffic, k: number) {
  const r = arrivalRng(seed, k);
  r(); // the first draw is the gap before this arrival
  if (traffic === "rush" && r() < 0.85) return { from: 0, to: 1 + Math.floor(r() * (FLOORS - 1)) };
  const from = Math.floor(r() * FLOORS);
  let to = Math.floor(r() * (FLOORS - 1));
  if (to >= from) to++;
  return { from, to };
}

/** A destination for someone who presses a hall button by hand (deterministic per seed and person). */
export function manualDest(s: Sim, floor: number, dir: Dir) {
  const r = mulberry32(hash32(`hand:${s.seed}:${s.nextId}`))();
  return dir === "up" ? floor + 1 + Math.floor(r * (FLOORS - 1 - floor)) : Math.floor(r * floor);
}

const findCall = (s: Sim, f: number, d: Dir) => s.calls.find((h) => h.floor === f && h.dir === d);

/** True when a car stands open at f, serving d, with room: a newcomer just walks in. */
function boardableNow(s: Sim, f: number, d: Dir) {
  return s.cars.some((c) => !c.oos && c.pos === f && c.phase !== "closed" && c.riders.length < CAP && (c.svc === d || (c.svc === null && s.strategy !== "fcfs")));
}

/** Pressing a hall button. Idempotent: pressing ▲ twice is still one call. */
function registerCall(s: Sim, floor: number, dir: Dir) {
  if (findCall(s, floor, dir)) return;
  const h: HallCall = { id: s.nextCall++, floor, dir, at: s.t, car: -1 };
  s.calls.push(h);
  s.events.push({ type: "call", call: h.id, floor, dir });
  dispatch(s);
}

function spawn(s: Sim, from: number, to: number, at: number) {
  if (from === to || from < 0 || to < 0 || from >= FLOORS || to >= FLOORS) throw new RangeError(`No trip from ${from} to ${to}`);
  const p: Person = { id: s.nextId++, from, to, stage: "waiting", since: at, waited: 0, boarded: false, car: -1, at };
  s.people.push(p);
  if (!boardableNow(s, from, dirOf(p))) registerCall(s, from, dirOf(p));
}

function assign(s: Sim, h: HallCall, i: number) {
  h.car = i;
  if (s.strategy === "fcfs") s.cars[i].order.push({ floor: h.floor, dir: h.dir });
  s.events.push({ type: "assign", call: h.id, floor: h.floor, dir: h.dir, car: i });
}

type Target = { floor: number; dir: Dir | null; at: number };
const targetsOf = (s: Sim, i: number): Target[] => [
  ...s.cars[i].calls.map((f) => ({ floor: f, dir: null, at: -1 })),
  ...s.calls.filter((h) => h.car === i).map((h) => ({ floor: h.floor, dir: h.dir, at: h.at })),
];

/** Floors the car travels, following its LOOK sweep, before it can open at f heading d. */
export function routeDistance(car: Pick<Car, "pos" | "dir">, targets: { floor: number }[], f: number, d: Dir) {
  const p = car.pos;
  if (car.dir === 0) return Math.abs(p - f);
  const top = Math.max(p, ...targets.map((t) => t.floor));
  const bottom = Math.min(p, ...targets.map((t) => t.floor));
  if (car.dir > 0) {
    if (d === "up" && f >= p) return f - p; // ahead, same direction: on the way
    if (d === "down") {
      const turn = Math.max(top, f);
      return turn - p + (turn - f); // up to the turnaround, then down to f
    }
    const low = Math.min(bottom, f);
    return top - p + (top - low) + (f - low); // a full round trip
  }
  if (d === "down" && f <= p) return p - f;
  if (d === "up") {
    const turn = Math.min(bottom, f);
    return p - turn + (f - turn);
  }
  const high = Math.max(top, f);
  return p - bottom + (high - bottom) + (high - f);
}

/** Nearest car's direction-aware cost: route distance plus STOP_COST per stop the car makes first. */
export function cost(s: Sim, i: number, f: number, d: Dir) {
  const c = s.cars[i];
  if (c.oos || c.riders.length >= CAP) return Infinity;
  const ts = targetsOf(s, i);
  const dist = routeDistance(c, ts, f, d);
  const at = (t: Target) => (t.dir ? routeDistance(c, ts, t.floor, t.dir) : Math.min(routeDistance(c, ts, t.floor, "up"), routeDistance(c, ts, t.floor, "down")));
  return dist + STOP_COST * ts.filter((t) => at(t) < dist).length;
}

/** The controller hands unassigned hall calls to cars, oldest first. One call, at most one car. */
export function dispatch(s: Sim) {
  const pending = s.calls.filter((h) => h.car < 0).sort((a, b) => a.at - b.at || a.id - b.id);
  for (const h of pending) {
    let best = -1;
    let bestCost = Infinity;
    s.cars.forEach((c, i) => {
      let v = Infinity;
      if (s.strategy === "nearest") v = cost(s, i, h.floor, h.dir);
      else if (!c.oos && c.riders.length < CAP) {
        if (s.strategy === "fcfs") {
          // FCFS: only a completely free car takes the oldest call
          if (!c.order.length && !c.riders.length && c.moving === 0 && c.phase === "closed") v = Math.abs(c.pos - h.floor);
        } else {
          // Collective: an idle car, or one already sweeping past the floor in the call's direction
          const d = sgn(h.dir);
          const idle = c.dir === 0 && c.moving === 0;
          const passing = c.dir === d && ((h.floor - c.pos) * d > 0 || (h.floor === c.pos && c.moving === 0));
          if (idle || passing) v = Math.abs(c.pos - h.floor);
        }
      }
      if (v < bestCost) {
        bestCost = v;
        best = i;
      }
    });
    if (best >= 0) assign(s, h, best);
    else if (s.strategy === "fcfs") break; // strict FCFS: nobody jumps the queue
  }
}

function clearCall(s: Sim, i: number, f: number, d: Dir) {
  const h = findCall(s, f, d);
  if (!h) return;
  s.calls = s.calls.filter((x) => x !== h);
  s.events.push({ type: "clear", call: h.id, floor: f, dir: d, car: i, assigned: h.car });
  s.cars[i].cleared = callName(f, d);
}

function stopAt(s: Sim, i: number, svc: Dir | null) {
  const c = s.cars[i];
  const f = c.pos;
  c.moving = 0;
  c.svc = svc;
  c.dir = sgn(svc) as Car["dir"];
  c.calls = c.calls.filter((x) => x !== f);
  c.order = c.order.filter((o) => !(o.floor === f && o.dir === null));
  c.cleared = null;
  if (svc && c.riders.length < CAP) clearCall(s, i, f, svc);
  c.phase = "opening";
  s.events.push({ type: "open", car: i, floor: f, svc });
}

/** LOOK: keep going while any stop lies ahead, serve calls in the travel direction, reverse only when nothing is ahead. */
function decideLook(s: Sim, i: number) {
  const c = s.cars[i];
  const f = c.pos;
  const room = c.riders.length < CAP;
  if (!room)
    for (const h of s.calls.filter((x) => x.car === i)) {
      h.car = -1; // load bypass: a full car hands its hall calls back
      s.events.push({ type: "release", call: h.id, floor: h.floor, dir: h.dir, car: i, why: "full" });
    }
  const ts = targetsOf(s, i);
  const ahead = (d: number) => ts.some((t) => (t.floor - f) * d > 0);
  const mine = (d: Dir) => room && s.calls.some((h) => h.car === i && h.floor === f && h.dir === d);
  let nd = 0;
  if (c.dir !== 0) nd = ahead(c.dir) ? c.dir : ahead(-c.dir) ? -c.dir : 0;
  else {
    const near = ts.filter((t) => t.floor !== f).sort((a, b) => Math.abs(a.floor - f) - Math.abs(b.floor - f) || a.at - b.at || a.floor - b.floor)[0];
    if (near) nd = Math.sign(near.floor - f);
  }
  let svc: Dir | null;
  if (c.dir !== 0) {
    const D = dname(c.dir)!;
    const R = dname(-c.dir)!;
    svc = ahead(c.dir) ? D : mine(D) ? D : mine(R) ? R : dname(nd);
  } else {
    const up = mine("up") ? findCall(s, f, "up")!.at : Infinity;
    const down = mine("down") ? findCall(s, f, "down")!.at : Infinity;
    svc = up === Infinity && down === Infinity ? dname(nd) : up <= down ? "up" : "down";
  }
  if (c.calls.includes(f) || (svc !== null && mine(svc))) return stopAt(s, i, svc);
  c.moving = nd as Car["moving"];
  c.dir = nd as Car["dir"];
  c.svc = null;
}

/** FCFS: go straight to the oldest stop, ignoring everything on the way. */
function decideFifo(s: Sim, i: number) {
  const c = s.cars[i];
  const head = c.order[0];
  if (!head) {
    c.moving = 0;
    c.dir = 0;
    return;
  }
  if (head.floor !== c.pos) {
    c.moving = c.dir = head.floor > c.pos ? 1 : -1;
    return;
  }
  c.order.shift();
  stopAt(s, i, head.dir);
}

function decide(s: Sim, i: number) {
  const c = s.cars[i];
  if (c.oos) {
    c.dir = 0;
    if (c.riders.length) stopAt(s, i, null); // let everyone out at this floor
    else c.moving = 0;
    return;
  }
  if (s.strategy === "fcfs") decideFifo(s, i);
  else decideLook(s, i);
}

function board(s: Sim, i: number) {
  const c = s.cars[i];
  const f = c.pos;
  if (c.oos) return 0;
  const here = s.people.filter((p) => p.stage === "waiting" && p.from === f).sort((a, b) => a.since - b.since || a.id - b.id);
  if (c.svc === null) {
    if (s.strategy === "fcfs" || !here.length || c.riders.length >= CAP) return 0;
    c.svc = dirOf(here[0]); // an idle car takes whoever has waited longest
    c.dir = sgn(c.svc) as Car["dir"];
    clearCall(s, i, f, c.svc);
  }
  const queue = here.filter((p) => dirOf(p) === c.svc);
  let n = 0;
  for (const p of queue) {
    if (c.riders.length >= CAP) break;
    const extra = s.t - p.since;
    p.waited += extra;
    s.stats.sumWait += extra;
    if (!p.boarded) s.stats.boarded++;
    p.boarded = true;
    s.stats.maxWait = Math.max(s.stats.maxWait, p.waited);
    p.stage = "riding";
    p.car = i;
    p.at = s.t;
    c.riders.push(p.id);
    n++;
    if (!c.calls.includes(p.to)) {
      c.calls.push(p.to); // the rider presses a car call
      if (s.strategy === "fcfs") c.order.push({ floor: p.to, dir: null });
    }
    s.events.push({ type: "board", person: p.id, car: i, floor: f });
  }
  if (n && queue.every((p) => p.stage !== "waiting")) clearCall(s, i, f, c.svc);
  return n;
}

function exchange(s: Sim, i: number) {
  const c = s.cars[i];
  const f = c.pos;
  let off = 0;
  let out = 0;
  for (const id of [...c.riders]) {
    const p = s.people.find((x) => x.id === id)!;
    if (p.to === f) {
      s.stats.sumRide += s.t - p.at;
      p.stage = "leaving";
      p.at = s.t;
      s.stats.delivered++;
      off++;
    } else if (c.oos) {
      p.stage = "waiting"; // evacuated: they wait again here and press the hall button
      p.from = f;
      p.since = s.t;
      p.car = -1;
      out++;
    } else continue;
    c.riders = c.riders.filter((x) => x !== id);
    s.events.push({ type: "alight", person: id, car: i, floor: f });
  }
  const on = board(s, i);
  c.hold = HOLD_MS + PER_PERSON_MS * (on + off + out);
  const who = `Car ${CARS[i]}`;
  if (c.oos) s.last = `${who} is out of service: it stops at ${floorName(f)} and lets ${plural(off + out, "rider", "riders")} out.${out ? ` ${plural(out, "person presses", "people press")} the hall button again.` : ""}`;
  else {
    const gotOn = on ? `${plural(on, "person gets", "people get")} on` : "nobody gets on";
    const gotOff = off ? `${off} ${off === 1 ? "gets" : "get"} off` : "nobody gets off";
    s.last = `${who} stops at ${floorName(f)}${c.svc ? ` going ${c.svc}` : ""}: ${gotOn}, ${gotOff}.${c.cleared ? ` Hall call ${c.cleared} cleared.` : ""}`;
  }
}

function wantsIn(s: Sim, c: Car) {
  if (c.oos || c.riders.length >= CAP) return false;
  return s.people.some((p) => p.stage === "waiting" && p.from === c.pos && (c.svc ? dirOf(p) === c.svc : s.strategy !== "fcfs"));
}

function updateCar(s: Sim, i: number, dt: number) {
  const c = s.cars[i];
  if (c.phase === "opening") {
    c.door = Math.min(1, c.door + dt / DOOR_MS);
    if (c.door >= 1) {
      c.phase = "open";
      exchange(s, i);
    }
  } else if (c.phase === "open") {
    c.hold += PER_PERSON_MS * board(s, i);
    c.hold -= dt;
    if (c.hold <= 0) c.phase = "closing";
  } else if (c.phase === "closing") {
    if (wantsIn(s, c)) {
      c.phase = "opening"; // door sensor: someone is stepping in
      return;
    }
    c.door = Math.max(0, c.door - dt / DOOR_MS);
    if (c.door <= 0) {
      c.phase = "closed";
      c.cleared = null;
      decide(s, i);
    }
  } else if (c.moving !== 0) {
    const next = c.moving > 0 ? Math.floor(c.pos + 1e-6) + 1 : Math.ceil(c.pos - 1e-6) - 1;
    if (next > FLOORS - 1 || next < 0) {
      c.moving = 0; // never past the top floor or below G
      return decide(s, i);
    }
    let pos = c.pos + (c.moving * dt) / FLOOR_MS;
    const arrived = c.moving > 0 ? pos >= next - 1e-6 : pos <= next + 1e-6;
    if (arrived) pos = next; // snap: a car deciding at a floor is exactly at it
    c.travelled += Math.abs(pos - c.pos);
    c.pos = Math.min(FLOORS - 1, Math.max(0, pos));
    if (arrived) decide(s, i);
  } else decide(s, i);
}

function tick(s: Sim, dt: number) {
  s.t += dt;
  while (s.traffic !== "manual" && s.nextArrival <= s.t) {
    const { from, to } = tripFor(s.seed, s.traffic, s.k);
    spawn(s, from, to, s.nextArrival);
    s.k++;
    s.nextArrival += gapMs(s, s.k);
  }
  // People left behind (car full, or evacuated) press the button again.
  for (const p of s.people) if (p.stage === "waiting" && !findCall(s, p.from, dirOf(p)) && !boardableNow(s, p.from, dirOf(p))) registerCall(s, p.from, dirOf(p));
  dispatch(s);
  s.cars.forEach((_, i) => updateCar(s, i, dt));
  s.people = s.people.filter((p) => p.stage !== "leaving" || s.t - p.at < LEAVE_MS);
}

/** Advance the simulation by dt ms. Pure: returns a new state. */
export function stepSim(prev: Sim, dt: number): Sim {
  const s = clone(prev);
  for (let left = dt; left > 1e-9; left -= SUB_MS) tick(s, Math.min(SUB_MS, left));
  return s;
}

/** Someone arrives at `from` wanting `to`: they press the hall button for their direction. */
export function addPassenger(prev: Sim, from: number, to: number): Sim {
  const s = clone(prev);
  spawn(s, from, to, s.t);
  return s;
}

/** A bare hall-button press (no person). */
export function pressHall(prev: Sim, floor: number, dir: Dir): Sim {
  if (floor < 0 || floor >= FLOORS || (dir === "up" && floor === FLOORS - 1) || (dir === "down" && floor === 0)) throw new RangeError(`No ${dir} button at ${floor}`);
  const s = clone(prev);
  registerCall(s, floor, dir);
  return s;
}

/** A car-panel press: adds a car call (ignored for a parked car). */
export function pressCar(prev: Sim, i: number, floor: number): Sim {
  if (floor < 0 || floor >= FLOORS) throw new RangeError(`No floor ${floor}`);
  const s = clone(prev);
  const c = s.cars[i];
  if (c.oos || c.calls.includes(floor) || (c.pos === floor && c.phase !== "closed")) return s;
  c.calls.push(floor);
  if (s.strategy === "fcfs") c.order.push({ floor, dir: null });
  return s;
}

/** Take a car out of service (it parks at the next floor and lets riders out) or bring it back. */
export function setOutOfService(prev: Sim, i: number, on: boolean): Sim {
  const s = clone(prev);
  const c = s.cars[i];
  if (c.oos === on) return s;
  c.oos = on;
  if (!on) {
    s.last = `Car ${CARS[i]} is back in service.`;
    return s;
  }
  const moved = s.calls.filter((h) => h.car === i);
  for (const h of moved) {
    h.car = -1;
    s.events.push({ type: "release", call: h.id, floor: h.floor, dir: h.dir, car: i, why: "out of service" });
  }
  c.calls = [];
  c.order = [];
  dispatch(s);
  const where = moved.map((h) => `${callName(h.floor, h.dir)} → ${h.car >= 0 ? `car ${CARS[h.car]}` : "queued"}`);
  s.last = `Car ${CARS[i]} is out of service. ${moved.length ? `Its hall calls are reassigned: ${where.join(", ")}.` : "It had no hall calls to hand over."}${c.riders.length ? ` Its riders get out at the next floor.` : ""}`;
  return s;
}

export function carState(c: Car): CarState {
  if (c.phase !== "closed") return "DOORS_OPEN";
  if (c.moving > 0) return "MOVING_UP";
  if (c.moving < 0) return "MOVING_DOWN";
  return c.oos ? "OUT_OF_SERVICE" : "IDLE";
}
const STATE_WORD: Record<CarState, string> = { IDLE: "IDLE", MOVING_UP: "MOVING ↑", MOVING_DOWN: "MOVING ↓", DOORS_OPEN: "DOORS OPEN", OUT_OF_SERVICE: "OUT OF SERVICE" };

/** Average and longest wait (seconds), counting people still waiting. */
export function waitStats(s: Sim) {
  const now = s.people.filter((p) => p.stage === "waiting").map((p) => p.waited + s.t - p.since);
  return {
    avg: s.stats.boarded ? s.stats.sumWait / s.stats.boarded / 1000 : 0,
    longest: Math.max(s.stats.maxWait, ...now, 0) / 1000,
    waiting: now.length,
    delivered: s.stats.delivered,
    ride: s.stats.delivered ? s.stats.sumRide / s.stats.delivered / 1000 : 0,
    floors: s.cars.reduce((a, c) => a + c.travelled, 0),
  };
}

// ---------------------------------------------------------------- picture
const SEED = 7;
const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const STRATEGY_LABEL: Record<Strategy, string> = { fcfs: "FCFS", nearest: "Nearest car", collective: "Collective (LOOK)" };
/** Below this content width the building drops its side column and uses the narrow drawing. */
const NARROW_BELOW = 480;
/** The building never grows taller than this (px), so the whole widget fits the desktop visual pane. */
const MAX_H = 284;

/**
 * Drawing geometry. Landscape: floors are short and the scene is laid out sideways, left to right: floor label,
 * hall-button plate, the queue, then the three shafts. `narrow` trims the queue and the shafts for phones.
 */
interface Geo {
  narrow: boolean;
  VW: number;
  VH: number;
  /** Indicator band above the shafts. */
  TOP: number;
  /** Floor height. */
  FH: number;
  /** Shaft x, shaft width, car width and height. */
  SX: number[];
  SW: number;
  CW: number;
  CH: number;
  /** Hall-button plate x and width (two 22 px buttons side by side must fit at the drawn scale). */
  PX: number;
  PW: number;
  /** First place in a floor's queue, the gap between people, and how many are drawn. */
  QX: number;
  QG: number;
  MAXQ: number;
  /** Scale of a waiting person, and of a rider inside a car. */
  pk: number;
  rk: number;
  /** Font sizes: floor label, car indicator, state word, destination tag. */
  fs: { floor: number; ind: number; state: number; tag: number };
  stateWord: Record<CarState, string>;
}
const geo = (narrow: boolean): Geo => {
  const FH = 30;
  const TOP = 36;
  const g = narrow
    ? { SX: [150, 213, 276], SW: 58, CW: 50, PX: 17, PW: 64, QX: 124, QG: 24, MAXQ: 2, VW: 337, fs: { floor: 13, ind: 14, state: 11, tag: 10.5 } }
    : { SX: [194, 274, 354], SW: 72, CW: 60, PX: 21, PW: 56, QX: 166, QG: 23, MAXQ: 4, VW: 432, fs: { floor: 13, ind: 14, state: 10.5, tag: 10.5 } };
  return {
    ...g,
    narrow,
    TOP,
    FH,
    VH: TOP + FLOORS * FH + 5,
    CH: 26,
    pk: 0.85,
    rk: narrow ? 0.66 : 0.72,
    stateWord: narrow ? { IDLE: "IDLE", MOVING_UP: "MOVING ↑", MOVING_DOWN: "MOVING ↓", DOORS_OPEN: "OPEN", OUT_OF_SERVICE: "OFF" } : STATE_WORD,
  };
};
const WIDE = geo(false);
const NARROW = geo(true);
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
const stateText = (c: Car) => STATE_WORD[carState(c)];
const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, var(--card))`;

/** True while the element is narrower than `below` px (ResizeObserver; false on the server and in jsdom). */
function useNarrow(ref: RefObject<HTMLElement | null>, below: number) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < below));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

/** A person, standing on y = 0. `k` scales the body; the destination tag sits beside the head at full size. */
function Figure({ color, tag, k, fs }: { color: string; tag?: string; k: number; fs: number }) {
  return (
    <>
      <g transform={`scale(${k})`}>
        <circle cy={-17.5} r={4.4} fill="var(--fg)" />
        <rect x={-5} y={-12.5} width={10} height={10.5} rx={3.5} fill={color} />
        <path d="M-2.2 -2.6 v2.6 M2.2 -2.6 v2.6" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      </g>
      {tag && (
        <g transform="translate(11.5,-21)">
          <rect x={-7} y={-6.5} width={14} height={12.5} rx={4} fill="var(--card)" stroke="var(--border-strong)" />
          <text y={fs * 0.36} textAnchor="middle" style={{ fontSize: fs, fontWeight: 750 }}>
            {tag}
          </text>
        </g>
      )}
    </>
  );
}

function Building({ s, reduce, uid, g, sel }: { s: Sim; reduce: boolean; uid: string; g: Geo; sel: number }) {
  const { VW, VH, TOP, FH, SX, SW, CW, CH, PX, PW, QX, QG, MAXQ, fs } = g;
  const floorTop = (f: number) => TOP + (FLOORS - 1 - f) * FH;
  const slab = (f: number) => floorTop(f) + FH;
  const carY = (pos: number) => floorTop(pos) + FH - CH - 2;
  const inset = (SW - CW) / 2;
  /** Riders stand in two rows: four at the front, two behind. */
  const slotX = (slot: number) => (slot < 4 ? CW / 2 + (slot - 1.5) * (CW - 16) / 3 : CW / 2 + (slot === 4 ? -1 : 1) * (CW - 16) / 4);
  const tr = { duration: reduce ? 0 : 0.1, ease: "linear" as const };
  const queues = new Map<number, Person[]>();
  for (const p of s.people.filter((x) => x.stage === "waiting").sort((a, b) => a.since - b.since || a.id - b.id)) queues.set(p.from, [...(queues.get(p.from) ?? []), p]);
  const lit = s.calls.map((h) => callName(h.floor, h.dir));
  const label = `Building cross-section with ${FLOORS} floors and ${CARS.length} lift cars. ${s.cars
    .map((c, i) => `Car ${CARS[i]} at floor ${floorName(Math.round(c.pos))}, ${stateText(c).replace("↑", "up").replace("↓", "down").toLowerCase()}, ${plural(c.riders.length, "rider", "riders")}.`)
    .join(" ")} ${plural(waitStats(s).waiting, "person", "people")} waiting. ${lit.length ? `Lit hall calls: ${lit.join(", ")}.` : "No hall calls lit."}`;
  // back-row riders first, so the front row is drawn over them
  const people = [...s.people].sort((a, b) => Number(a.stage === "riding" && s.cars[a.car].riders.indexOf(a.id) < 4) - Number(b.stage === "riding" && s.cars[b.car].riders.indexOf(b.id) < 4));
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="sim-svg" role="img" aria-label={label}>
      {Array.from({ length: FLOORS }, (_, f) => {
        const n = queues.get(f)?.length ?? 0;
        return (
          <g key={f}>
            <rect x={0} y={floorTop(f)} width={SX[0]} height={FH} fill={f % 2 ? "var(--card-2)" : "var(--card)"} />
            <line x1={0} x2={SX[2] + SW} y1={slab(f)} y2={slab(f)} stroke="var(--border-strong)" strokeWidth={1.6} />
            <text x={PX / 2} y={floorTop(f) + FH / 2 + fs.floor * 0.36} textAnchor="middle" style={{ fontSize: fs.floor, fontWeight: 750 }}>
              {floorName(f)}
            </text>
            <rect x={PX} y={floorTop(f) + 4} width={PW} height={FH - 8} rx={7} fill="var(--card)" stroke="var(--border)" />
            {n > MAXQ && (
              <text x={QX - MAXQ * QG + 9} y={slab(f) - 9} textAnchor="end" className="muted-text" style={{ fontSize: 10.5, fontWeight: 750 }}>
                +{n - MAXQ}
              </text>
            )}
          </g>
        );
      })}
      {s.cars.map((c, i) => {
        const state = carState(c);
        const arrow = c.moving > 0 || (c.moving === 0 && c.dir > 0) ? "▲" : c.moving < 0 || c.dir < 0 ? "▼" : "";
        const parked = state === "OUT_OF_SERVICE";
        return (
          <g key={i}>
            <rect x={SX[i]} y={TOP} width={SW} height={FLOORS * FH} fill="var(--card-2)" stroke="var(--border)" />
            {[SX[i] + 3, SX[i] + SW - 3].map((x) => (
              <line key={x} x1={x} x2={x} y1={TOP} y2={TOP + FLOORS * FH} stroke="var(--border)" strokeWidth={1.5} />
            ))}
            <m.line x1={SX[i] + SW / 2} x2={SX[i] + SW / 2} y1={TOP} initial={false} animate={{ y2: carY(c.pos) }} transition={tr} stroke="var(--border-strong)" strokeWidth={1.5} />
            <rect x={SX[i] + 3} y={2} width={SW - 6} height={19} rx={6} style={{ fill: i === sel ? tint(COLORS[i], 16) : "var(--card)" }} stroke={c.oos ? "var(--critical)" : COLORS[i]} strokeWidth={i === sel ? 2.4 : 1.6} />
            <text x={SX[i] + 10} y={16} className="muted-text" style={{ fontSize: 10.5, fontWeight: 750 }}>
              {CARS[i]}
            </text>
            <text x={SX[i] + SW / 2 + 6} y={17} textAnchor="middle" style={{ fontSize: fs.ind, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
              {parked ? "⚠" : `${floorName(Math.round(c.pos))}${arrow}`}
            </text>
            <text x={SX[i] + SW / 2} y={32} textAnchor="middle" style={{ fontSize: fs.state, fontWeight: 750, fill: parked ? "var(--critical-ink)" : state === "DOORS_OPEN" ? "var(--good-ink)" : "var(--muted)" }}>
              {g.stateWord[state]}
            </text>
          </g>
        );
      })}
      {/* car bodies, behind the riders */}
      {s.cars.map((c, i) => (
        <g key={i} transform={`translate(${SX[i] + inset},0)`}>
          <m.g initial={false} animate={{ y: carY(c.pos) }} transition={tr}>
            <rect width={CW} height={CH} rx={4} fill="var(--card)" />
            <rect x={3} y={3} width={CW - 6} height={CH - 6} fill="var(--card-2)" />
            <line x1={10} x2={CW - 10} y1={5.5} y2={5.5} stroke="var(--warning)" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
          </m.g>
        </g>
      ))}
      {people.map((p) => {
        let x: number;
        let y: number;
        let opacity = 1;
        let walk = 0.45;
        let k = g.pk;
        if (p.stage === "waiting") {
          const j = queues.get(p.from)!.indexOf(p);
          x = QX - j * QG;
          y = slab(p.from) - 1;
          if (j >= MAXQ) opacity = 0;
        } else if (p.stage === "riding") {
          const slot = s.cars[p.car].riders.indexOf(p.id);
          x = SX[p.car] + inset + slotX(slot);
          y = carY(s.cars[p.car].pos) + CH - 3 - (slot >= 4 ? 3 : 0);
          k = g.rk;
        } else {
          // delivered: step out of the car and fade away
          const q = Math.min(1, (s.t - p.at) / LEAVE_MS);
          x = SX[p.car] + SW / 2 - q * 56;
          y = slab(p.to) - 1;
          opacity = 1 - q;
          walk = 0.1;
        }
        const color = dirOf(p) === "up" ? "var(--k-client)" : "var(--k-gateway)";
        return (
          <m.g key={p.id} initial={reduce ? false : { x: PX + PW, y, opacity: 0 }} animate={{ x, y, opacity }} transition={reduce ? { duration: 0 } : { x: { duration: walk, ease: "easeInOut" }, y: tr, opacity: { duration: 0.2 } }}>
            <Figure color={color} k={k} fs={fs.tag} tag={p.stage === "waiting" ? floorName(p.to) : undefined} />
          </m.g>
        );
      })}
      {/* doors and frames, in front of the riders */}
      {s.cars.map((c, i) => {
        const half = (CW - 6) / 2;
        const gap = c.door * (half - 2);
        return (
          <g key={i} transform={`translate(${SX[i] + inset},0)`}>
            <m.g initial={false} animate={{ y: carY(c.pos) }} transition={tr}>
              <clipPath id={`${uid}-door-${i}`}>
                <rect x={3} y={3} width={CW - 6} height={CH - 6} />
              </clipPath>
              <g clipPath={`url(#${uid}-door-${i})`}>
                <m.g initial={false} animate={{ x: -gap }} transition={tr}>
                  <rect x={3} y={3} width={half} height={CH - 6} fill="var(--border)" stroke="var(--border-strong)" />
                  <line x1={CW / 2 - 4} x2={CW / 2 - 4} y1={10} y2={16} stroke="var(--border-strong)" strokeWidth={2} strokeLinecap="round" />
                </m.g>
                <m.g initial={false} animate={{ x: gap }} transition={tr}>
                  <rect x={CW / 2} y={3} width={half} height={CH - 6} fill="var(--border)" stroke="var(--border-strong)" />
                  <line x1={CW / 2 + 4} x2={CW / 2 + 4} y1={10} y2={16} stroke="var(--border-strong)" strokeWidth={2} strokeLinecap="round" />
                </m.g>
              </g>
              <rect width={CW} height={CH} rx={4} fill="none" stroke={c.oos ? "var(--critical)" : COLORS[i]} strokeWidth={2.2} />
              {carState(c) === "OUT_OF_SERVICE" && (
                <g>
                  <rect x={3} y={4} width={CW - 6} height={CH - 8} rx={3} fill="var(--card)" stroke="var(--critical)" strokeDasharray="3 2" />
                  <text x={CW / 2} y={CH / 2 + 3.5} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: "var(--critical-ink)" }}>
                    ⚠ OFF
                  </text>
                </g>
              )}
              {c.riders.length > 0 && c.door < 0.4 && (
                <text x={CW / 2} y={CH / 2 + 4} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 750 }}>
                  {c.riders.length}/{CAP}
                </text>
              )}
            </m.g>
          </g>
        );
      })}
    </svg>
  );
}

const roundBtn = (lit: boolean, w: number, h: number) =>
  ({
    width: w,
    height: h,
    padding: 0,
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 750,
    lineHeight: 1,
    border: `1px solid ${lit ? "var(--accent)" : "var(--border-strong)"}`,
    background: lit ? "var(--accent)" : "var(--card)",
    color: lit ? "var(--accent-ink)" : "var(--fg)",
    boxShadow: lit ? "0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent)" : "none",
    transition: "background-color .2s, box-shadow .2s",
  }) as const;

/** A segmented choice with its label on the same line (it wraps under the label when the row is too narrow). */
function InlineSeg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 6px", fontSize: 12.5, color: "var(--muted)" }}>
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" title={o.title} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ElevatorSim() {
  const [strategy, setStrategy] = useState<Strategy>("collective");
  const [traffic, setTraffic] = useState<Traffic>("random");
  const [speed, setSpeed] = useState(1.5);
  const [rate, setRate] = useState(16);
  const [running, setRunning] = useState(true);
  const [sel, setSel] = useState(0);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, NARROW_BELOW);
  const g = narrow ? NARROW : WIDE;
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");

  const step = useCallback((st: Sim, dt: number) => stepSim(st.rate === rate ? st : { ...st, rate }, dt * speed), [speed, rate]);
  const [s, reset] = useFixedStep<Sim>(() => initSim({ seed: SEED, strategy, traffic, rate }), step, running && inView && !reduce);
  const restart = (next: { strategy?: Strategy; traffic?: Traffic }) => reset(initSim({ seed: SEED, strategy, traffic, rate, ...next }));

  const callHall = (f: number, dir: Dir) => {
    if (s.people.filter((p) => p.stage === "waiting" && p.from === f).length >= 10) return reset({ ...s, last: `Floor ${floorName(f)} is crowded: let a car take some people first.` });
    const to = manualDest(s, f, dir);
    const had = !!findCall(s, f, dir);
    const next = addPassenger(s, f, to);
    const a = next.events.find((e) => e.type === "assign" && e.floor === f && e.dir === dir);
    const name = callName(f, dir);
    let what: string;
    if (had) what = `${name} is already lit, so it stays one hall call (pressing twice is idempotent).`;
    else if (!next.events.some((e) => e.type === "call")) what = "A car is standing open here going that way, so they just walk in.";
    else if (a?.type === "assign") what = `The controller assigns ${name} to car ${CARS[a.car]}.`;
    else if (strategy === "fcfs") what = `No car is free, so ${name} joins the FCFS queue.`;
    else if (strategy === "collective") what = `No car is idle or already heading ${dir} past ${floorName(f)}, so ${name} waits for the first one that is.`;
    else what = `Every car is full or out of service, so ${name} waits.`;
    reset({ ...next, last: `Someone at ${floorName(f)} wants floor ${floorName(to)} and presses ${dir === "up" ? "▲" : "▼"}. ${what}` });
  };
  const callCar = (i: number, f: number) => {
    const next = pressCar(s, i, f);
    reset(next.cars[i].calls.includes(f) && !s.cars[i].calls.includes(f) ? { ...next, last: `Car ${CARS[i]}: floor ${floorName(f)} lit on the panel (a car call).` } : next);
  };
  const oosB = s.cars[1].oos;

  const w = waitStats(s);
  const sentence = s.last || `${STRATEGY_LABEL[strategy]}, ${traffic === "manual" ? "no automatic passengers" : traffic === "rush" ? "morning-rush traffic" : "random traffic"}. Press a ▲ or ▼ button to add a person.`;
  const said = useThrottled(sentence, 900);
  const sec = (v: number) => `${v.toFixed(1)} s`;
  const tiles = [
    { label: "Sim time", value: `${Math.floor(s.t / 60_000)}:${String(Math.floor((s.t / 1000) % 60)).padStart(2, "0")}` },
    { label: "Average wait", value: sec(w.avg) },
    { label: "Longest wait", value: sec(w.longest) },
    { label: "Average ride", value: sec(w.ride) },
    { label: "Delivered", value: String(w.delivered) },
    { label: "Floors travelled", value: w.floors.toFixed(0) },
  ];

  const car = s.cars[sel];
  const oosButton = (
    <button type="button" className={`wbtn ${oosB ? "" : "danger"}`} onClick={() => reset(setOutOfService(s, 1, !oosB))}>
      {oosB ? "Put car B back in service" : "Take car B out of service"}
    </button>
  );
  // One car's panel at a time: pick the car, then press a floor (two columns like a real panel: 6 7 / 4 5 / 2 3 / G 1).
  const panelFloors = narrow ? Array.from({ length: FLOORS }, (_, f) => f) : Array.from({ length: FLOORS }, (_, k) => FLOORS - 2 - Math.floor(k / 2) * 2 + (k % 2));
  const panel = (
    <div role="group" aria-label={`Car ${CARS[sel]} panel`} style={{ border: `1px solid ${car.oos ? "var(--critical)" : "var(--border)"}`, borderTop: `3px solid ${car.oos ? "var(--critical)" : COLORS[sel]}`, borderRadius: 10, padding: "5px 8px 8px", background: "var(--card-2)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: narrow ? "flex-start" : "center", gap: "4px 6px" }}>
        <span className="muted" aria-hidden style={{ fontSize: 12.5 }}>
          Car
        </span>
        <div className="seg" role="group" aria-label="Car panel to show" style={{ padding: 2 }}>
          {CARS.map((n, i) => (
            <button key={n} type="button" aria-pressed={i === sel} aria-label={`Show car ${n}'s panel`} onClick={() => setSel(i)} style={{ padding: "2px 8px", fontWeight: 750 }}>
              {n}
            </button>
          ))}
        </div>
        {narrow && (
          <span className={car.oos ? "bad-ink" : carState(car) === "DOORS_OPEN" ? "ok-ink" : "muted"} style={{ fontSize: 11.5, fontWeight: 650, whiteSpace: "nowrap" }}>
            {stateText(car)}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(8, 26px)" : "repeat(2, 26px)", gap: 4, justifyContent: narrow ? "start" : "center", marginTop: 6 }}>
        {panelFloors.map((f) => {
          const on = car.calls.includes(f);
          return (
            <button key={f} type="button" disabled={car.oos} onClick={() => callCar(sel, f)} aria-label={`Car ${CARS[sel]}: go to floor ${floorName(f)}${on ? " (lit)" : ""}`} style={{ ...roundBtn(on, 26, 26), fontSize: 12, opacity: car.oos ? 0.5 : 1 }}>
              {floorName(f)}
            </button>
          );
        })}
      </div>
    </div>
  );
  const stats = (
    <dl aria-label="Statistics" style={{ margin: 0, display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: narrow ? "1px 14px" : 1, fontSize: 12.5, lineHeight: 1.35 }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <dt className="muted" style={{ whiteSpace: "nowrap" }}>
            {t.label}
          </dt>
          <dd style={{ margin: 0, fontWeight: 650, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{t.value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <WidgetFrame title="Lift dispatch simulator" sub="Three cars, eight floors. Press ▲ or ▼ on a floor to add a person.">
      <div ref={ref}>
        <div className="controls" style={{ gap: "8px 14px", margin: "2px 0 8px" }}>
          <SimButtons running={running && !reduce} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(stepSim(s, 500))} onReset={() => restart({})} stepHint="Advance half a second" />
          <InlineSeg<Strategy>
            label="Strategy"
            value={strategy}
            onChange={(v) => {
              setStrategy(v);
              restart({ strategy: v });
            }}
            options={[
              { value: "fcfs", label: "FCFS", title: "First come, first served" },
              { value: "nearest", label: "Nearest car" },
              { value: "collective", label: "Collective", title: "Collective control (LOOK)" },
            ]}
          />
          <InlineSeg<Traffic>
            label="Traffic"
            value={traffic}
            onChange={(v) => {
              setTraffic(v);
              restart({ traffic: v });
            }}
            options={[
              { value: "manual", label: "Manual" },
              { value: "rush", label: "Rush", title: "Morning rush: most trips start at G going up" },
              { value: "random", label: "Random" },
            ]}
          />
          {!narrow && oosButton}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0, maxWidth: Math.round((MAX_H * g.VW) / g.VH) }}>
            <Building s={s} reduce={reduce} uid={uid} g={g} sel={sel} />
            <div role="group" aria-label="Hall call buttons">
              {Array.from({ length: FLOORS }, (_, f) =>
                (["up", "down"] as Dir[])
                  .filter((d) => (d === "up" ? f < FLOORS - 1 : f > 0))
                  .map((d) => {
                    const on = !!findCall(s, f, d);
                    const name = `Call ${d} at floor ${floorName(f)}`;
                    return (
                      <button
                        key={`${f}${d}`}
                        type="button"
                        onClick={() => callHall(f, d)}
                        aria-label={on ? `${name} (lit)` : name}
                        title={name}
                        style={{
                          ...roundBtn(on, 22, 18),
                          fontSize: 9,
                          position: "absolute",
                          left: `calc(${pct(g.PX + g.PW / 2, g.VW)} ${d === "up" ? "-" : "+"} 12px)`,
                          top: pct(g.TOP + (FLOORS - 1 - f) * g.FH + g.FH / 2, g.VH),
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {d === "up" ? "▲" : "▼"}
                      </button>
                    );
                  }),
              )}
            </div>
          </div>
          {!narrow && (
            <div style={{ flex: "0 0 140px", display: "grid", gap: 8, alignContent: "start" }}>
              {panel}
              {stats}
            </div>
          )}
        </div>
        {narrow && (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {panel}
            {stats}
          </div>
        )}
        <p className="readout" aria-live="polite" style={{ minHeight: "3em" }}>
          {said}
          <ReducedNote reduce={reduce} what="Animation paused (reduced motion): Step advances half a second." />
        </p>
        <More>
          <div className="controls" style={{ marginBottom: 0 }}>
            <Slider label="Speed" value={speed} min={0.5} max={4} step={0.5} onChange={setSpeed} format={(v) => `${v}×`} />
            <Slider label="Passengers per minute" value={rate} min={2} max={30} onChange={setRate} />
            {narrow && oosButton}
          </div>
        </More>
      </div>
    </WidgetFrame>
  );
}

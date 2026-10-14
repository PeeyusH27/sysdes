"use client";
import { memo, useCallback, useState } from "react";
import { m } from "motion/react";
import { Grid3x3, MapPin, Shuffle, Users } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useBoxWidth } from "@/lib/hooks";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, exported for tests)
/** Blocks across and down. Streets run along every integer x in 0..NX and every integer y in 0..NY. */
export const NX = 7;
export const NY = 5;
/** Index cells: one per intersection, centred on it, so cars drive through cells rather than along their edges. */
export const CW = NX + 1;
export const CH = NY + 1;
export const PING_MS = 2000; // each car reports its location every 2 s
export const RING_MS = 500; // the search ring grows one ring per 0.5 s (slowed down so you can watch it)
export const OFFER_MS = 5000; // offer countdown (real apps use 10–15 s)
export const SPEED = 0.8; // blocks per second
const TURN_DEG_PER_S = 600;
const BOARD_MS = 900;
const DONE_MS = 1300;
const WAIT_MS = 2000;
const MAX_RIDES = 7;
export const N_DRIVERS = 14;
const EPS = 1e-6;

export type Pt = { x: number; y: number };
export type DriverState = "available" | "offered" | "onTrip";
export interface Driver {
  id: string;
  pos: Pt;
  /** Drawn heading in degrees (0 = east, 90 = south), turned gradually at corners. */
  rot: number;
  route: Pt[];
  /** The intersection we just came from, so cruising cars don't U-turn. */
  prev: Pt | null;
  state: DriverState;
  rideId: string | null;
  /** The last position sent to the index: the matcher only ever sees this. */
  reported: Pt;
  pingAt: number;
}
export type Phase = "searching" | "offering" | "pickup" | "boarding" | "trip" | "done" | "waiting";
export type Answer = "accept" | "decline" | "timeout";
export interface Ride {
  id: string;
  pickup: Pt;
  cell: [number, number];
  createdAt: number;
  phase: Phase;
  phaseAt: number;
  /** Rings scanned so far (−1: none yet). */
  ring: number;
  ringAt: number;
  candidates: { id: string; dist: number }[];
  tried: { id: string; result: "declined" | "timed out" | "taken" }[];
  examined: number;
  /** Time spent waiting for the slowed-down ring animation; a real search takes milliseconds, so stats leave it out. */
  searchMs: number;
  offer: { driver: string; at: number; answerAt: number; answer: Answer } | null;
  driver: string | null;
  dest: Pt | null;
  duel: boolean;
}
export interface Stats {
  matched: number;
  matchMs: number;
  pickup: number;
  examined: number;
}
export interface Sim {
  t: number;
  tick: number;
  seed: number;
  drivers: Driver[];
  rides: Ride[];
  nextRide: number;
  /** cell "x,y" → ids of the drivers whose last report fell in it. */
  index: Record<string, string[]>;
  pings: number[];
  stats: Stats;
  event: string;
  cas: { at: number; driver: string; winner: string; loser: string } | null;
}
export type IndexMode = "cells" | "scan";
export interface Cfg {
  declineRate: number;
  ratePerMin: number;
  mode: IndexMode;
}

const isInt = (v: number) => Math.abs(v - Math.round(v)) < EPS;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const manhattan = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const DIRS: Pt[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

/** On a street and inside the map. */
export const onRoad = (p: Pt) => (isInt(p.x) || isInt(p.y)) && p.x > -EPS && p.x < NX + EPS && p.y > -EPS && p.y < NY + EPS;

/** The nearest point on a street (pickups snap to the kerb), on a 1/20-block grid. */
export function snapToRoad(p: Pt): Pt {
  const x = clamp(p.x, 0, NX);
  const y = clamp(p.y, 0, NY);
  const rx = Math.round(x);
  const ry = Math.round(y);
  const q = Math.abs(y - ry) <= Math.abs(x - rx) ? { x, y: ry } : { x: rx, y };
  return { x: Math.round(q.x * 20) / 20, y: Math.round(q.y * 20) / 20 };
}

/** Intersections reachable from a road point without turning, with the distance to each. */
function exits(p: Pt): { at: Pt; cost: number }[] {
  if (isInt(p.x) && isInt(p.y)) return [{ at: { x: Math.round(p.x), y: Math.round(p.y) }, cost: 0 }];
  if (isInt(p.y)) {
    const y = Math.round(p.y);
    const [lo, hi] = [Math.floor(p.x), Math.ceil(p.x)];
    return [
      { at: { x: lo, y }, cost: p.x - lo },
      { at: { x: hi, y }, cost: hi - p.x },
    ];
  }
  const x = Math.round(p.x);
  const [lo, hi] = [Math.floor(p.y), Math.ceil(p.y)];
  return [
    { at: { x, y: lo }, cost: p.y - lo },
    { at: { x, y: hi }, cost: hi - p.y },
  ];
}
const sameStreet = (a: Pt, b: Pt) => (isInt(a.y) && isInt(b.y) && Math.abs(a.y - b.y) < EPS) || (isInt(a.x) && isInt(b.x) && Math.abs(a.x - b.x) < EPS);
function bestLink(a: Pt, b: Pt) {
  let best = { d: Infinity, ea: a, eb: b };
  for (const ea of exits(a))
    for (const eb of exits(b)) {
      const d = ea.cost + manhattan(ea.at, eb.at) + eb.cost;
      if (d < best.d - EPS) best = { d, ea: ea.at, eb: eb.at };
    }
  return best;
}
/** Shortest driving distance in blocks on the full street grid (Manhattan between intersections). */
export const roadDistance = (a: Pt, b: Pt) => (sameStreet(a, b) ? manhattan(a, b) : bestLink(a, b).d);
/** Waypoints of a shortest drive from a to b (excluding a); every leg runs along one street. */
export function roadPath(a: Pt, b: Pt): Pt[] {
  if (sameStreet(a, b)) return [b];
  const { ea, eb } = bestLink(a, b);
  const out: Pt[] = [];
  let last = a;
  for (const p of [ea, { x: eb.x, y: ea.y }, eb, b])
    if (!same(p, last)) {
      out.push(p);
      last = p;
    }
  return out;
}

export const cellOf = (p: Pt): [number, number] => [clamp(Math.floor(p.x + 0.5), 0, CW - 1), clamp(Math.floor(p.y + 0.5), 0, CH - 1)];
const key = (cx: number, cy: number) => `${cx},${cy}`;
/** Cells exactly k steps from (cx, cy), clipped to the map: 1, then up to 8, 16… */
export function ringCells(cx: number, cy: number, k: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = cy - k; y <= cy + k; y++)
    for (let x = cx - k; x <= cx + k; x++) if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === k && x >= 0 && y >= 0 && x < CW && y < CH) out.push([x, y]);
  return out;
}
export const cellsWithin = (cx: number, cy: number, k: number) => (Math.min(cx + k, CW - 1) - Math.max(cx - k, 0) + 1) * (Math.min(cy + k, CH - 1) - Math.max(cy - k, 0) + 1);
const maxRing = ([cx, cy]: [number, number]) => Math.max(cx, CW - 1 - cx, cy, CH - 1 - cy);
export function buildIndex(drivers: Driver[]) {
  const idx: Record<string, string[]> = {};
  for (const d of drivers) (idx[key(...cellOf(d.reported))] ??= []).push(d.id);
  return idx;
}
/** The driver ids stored in the cells of ring k: what the matcher reads for that ring. */
export const scanRing = (index: Record<string, string[]>, cx: number, cy: number, k: number) => ringCells(cx, cy, k).flatMap(([x, y]) => index[key(x, y)] ?? []);
function moveInIndex(index: Record<string, string[]>, id: string, from: Pt, to: Pt) {
  const a = key(...cellOf(from));
  const b = key(...cellOf(to));
  if (a === b) return index;
  return { ...index, [a]: (index[a] ?? []).filter((x) => x !== id), [b]: [...(index[b] ?? []), id] };
}

const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
/** A geohash-like label: longitude and latitude bits interleaved, 5 bits per character. */
export function cellLabel(cx: number, cy: number) {
  const lon = cx + 9;
  const lat = CH - 1 - cy + 11; // north is up; the offsets put a prefix boundary inside the map, as in real cities
  let bits = 0;
  for (let i = 4; i >= 0; i--) bits = (bits << 2) | (((lon >> i) & 1) << 1) | ((lat >> i) & 1);
  return `9q8${B32[(bits >> 5) & 31]}${B32[bits & 31]}`;
}

/** Atomic compare-and-set on a driver's state: null if the driver isn't in the expected state. */
export function cas(drivers: Driver[], id: string, expect: { state: DriverState; rideId?: string | null }, next: { state: DriverState; rideId: string | null }) {
  const d = drivers.find((x) => x.id === id);
  if (!d || d.state !== expect.state || (expect.rideId !== undefined && d.rideId !== expect.rideId)) return null;
  return drivers.map((x) => (x.id === id ? { ...x, state: next.state, rideId: next.rideId } : x));
}

const ZERO: Stats = { matched: 0, matchMs: 0, pickup: 0, examined: 0 };
const tickRand = (s: Sim) => mulberry32((Math.imul(s.seed, 0x9e3779b1) ^ Math.imul(s.tick + 1, 0x85ebca6b)) >>> 0);
const headingOf = (d: Pt) => (Math.atan2(d.y, d.x) * 180) / Math.PI;
const wrap180 = (a: number) => ((((a % 360) + 540) % 360) - 180);

export function initSim(seed = 11, n = N_DRIVERS): Sim {
  const rand = mulberry32(seed);
  const drivers: Driver[] = [];
  const used = new Set<string>();
  while (drivers.length < n) {
    const at = { x: Math.floor(rand() * (NX + 1)), y: Math.floor(rand() * (NY + 1)) };
    const dir = DIRS[Math.floor(rand() * 4)];
    const pos = { x: at.x + dir.x / 2, y: at.y + dir.y / 2 };
    if (!onRoad(pos) || used.has(key(pos.x, pos.y))) continue;
    used.add(key(pos.x, pos.y));
    drivers.push({ id: `D${drivers.length + 1}`, pos, rot: headingOf(dir), route: [{ x: at.x + dir.x, y: at.y + dir.y }], prev: at, state: "available", rideId: null, reported: pos, pingAt: -Math.floor(rand() * PING_MS) });
  }
  return { t: 0, tick: 0, seed, drivers, rides: [], nextRide: 1, index: buildIndex(drivers), pings: [], stats: ZERO, event: "Cars cruise and report their location every 2 s. Tap the map, or pick a pickup spot, to request a ride.", cas: null };
}

function nextTurn(at: Pt, prev: Pt | null, rot: number, rand: () => number): Pt {
  const opts = DIRS.map((d) => ({ x: at.x + d.x, y: at.y + d.y })).filter((p) => p.x >= 0 && p.y >= 0 && p.x <= NX && p.y <= NY);
  const pool = opts.filter((p) => !prev || !same(p, prev));
  const choices = pool.length ? pool : opts;
  const r = (rot * Math.PI) / 180;
  const ahead = { x: at.x + Math.round(Math.cos(r)), y: at.y + Math.round(Math.sin(r)) };
  const w = choices.map((p) => (same(p, ahead) ? 2 : 1)); // going straight is twice as likely as each turn
  let pick = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) if ((pick -= w[i]) < 0) return choices[i];
  return choices[choices.length - 1];
}

/** Move a car `dist` blocks along its route; cruising cars pick a new street at each intersection. */
function drive(d: Driver, dist: number, turn: number, rand: () => number): Driver {
  let { pos, route, prev } = d;
  let left = dist;
  let want = d.rot;
  for (let guard = 0; left > EPS && guard < 6; guard++) {
    if (!route.length) {
      if (d.state === "onTrip") break; // parked at the pickup or the drop-off
      if (isInt(pos.x) && isInt(pos.y)) route = [nextTurn(pos, prev, d.rot, rand)];
      else {
        const ex = exits(pos);
        const r = (d.rot * Math.PI) / 180;
        route = [ex.find((e) => (e.at.x - pos.x) * Math.cos(r) + (e.at.y - pos.y) * Math.sin(r) > 0)?.at ?? ex[0].at];
      }
    }
    const tgt = route[0];
    const dx = tgt.x - pos.x;
    const dy = tgt.y - pos.y;
    const len = Math.abs(dx) + Math.abs(dy); // every leg is axis-aligned
    if (len > EPS) want = headingOf({ x: dx, y: dy });
    if (len <= left) {
      if (len > EPS && isInt(tgt.x) && isInt(tgt.y)) prev = { x: tgt.x - Math.sign(dx), y: tgt.y - Math.sign(dy) };
      pos = tgt;
      left -= len;
      route = route.slice(1);
    } else {
      pos = { x: pos.x + Math.sign(dx) * left, y: pos.y + Math.sign(dy) * left };
      left = 0;
    }
  }
  const delta = wrap180(want - d.rot);
  const rot = d.rot + clamp(delta, -turn, turn);
  return { ...d, pos, route, prev, rot };
}

function randomRoadPoint(rand: () => number): Pt {
  return rand() < 0.5 ? { x: Math.round(rand() * NX * 20) / 20, y: Math.floor(rand() * (NY + 1)) } : { x: Math.floor(rand() * (NX + 1)), y: Math.round(rand() * NY * 20) / 20 };
}

const live = (s: Sim) => s.rides.filter((r) => r.phase !== "done").length;

/** A rider asks for a ride at `at` (snapped to the nearest street). */
export function requestRide(s: Sim, at: Pt, quiet = false): Sim {
  if (live(s) >= MAX_RIDES) return quiet ? s : { ...s, event: `${live(s)} riders are already waiting or riding; let a few finish first.` };
  const pickup = snapToRoad(at);
  const cell = cellOf(pickup);
  const id = `R${s.nextRide}`;
  const ride: Ride = { id, pickup, cell, createdAt: s.t, phase: "searching", phaseAt: s.t, ring: -1, ringAt: s.t, candidates: [], tried: [], examined: 0, searchMs: 0, offer: null, driver: null, dest: null, duel: false };
  return {
    ...s,
    rides: [...s.rides, ride],
    nextRide: s.nextRide + 1,
    event: quiet ? s.event : `Rider ${id} requested a ride in cell ${cellLabel(...cell)}. The matcher reads that cell, then its 8 neighbours, then the next ring out.`,
  };
}

/** Two riders appear on either side of the most isolated free car, at the same instant. */
export function twoRiders(s: Sim): Sim {
  const free = s.drivers.filter((d) => d.state === "available");
  if (!free.length) return { ...s, event: "Every car is busy right now. Try again in a moment." };
  if (live(s) + 2 > MAX_RIDES) return { ...s, event: "Too many riders on the map; let a few rides finish first." };
  const iso = (d: Driver) => Math.min(Infinity, ...free.filter((e) => e !== d).map((e) => roadDistance(d.pos, e.pos)));
  const d = free.reduce((a, b) => (iso(b) > iso(a) ? b : a));
  // The car reports its position right now, so both searches see it where it really is.
  let out: Sim = { ...s, index: moveInIndex(s.index, d.id, d.reported, d.pos), drivers: s.drivers.map((x) => (x.id === d.id ? { ...x, reported: x.pos, pingAt: s.t } : x)), pings: [...s.pings, s.t] };
  const horiz = isInt(d.pos.y);
  const c = horiz ? d.pos.x : d.pos.y;
  const max = horiz ? NX : NY;
  const offs = c - 0.4 < 0 ? [0.4, 0.8] : c + 0.4 > max ? [-0.4, -0.8] : [0.4, -0.4];
  for (const o of offs) out = requestRide(out, horiz ? { x: d.pos.x + o, y: d.pos.y } : { x: d.pos.x, y: d.pos.y + o }, true);
  const [a, b] = out.rides.slice(-2);
  return {
    ...out,
    rides: out.rides.map((r) => (r === a || r === b ? { ...r, duel: true } : r)),
    event: `Riders ${a.id} and ${b.id} both request a ride next to ${d.id}, the only free car close by. Both matchers will pick ${d.id} in the same instant.`,
  };
}

function matchedSentence(r: Ride, driver: string, dist: number, mode: IndexMode) {
  const nCells = cellsWithin(...r.cell, r.ring);
  const where = mode === "scan" ? `checking all ${N_DRIVERS} cars` : `searching ${nCells} cell${nCells === 1 ? "" : "s"}`;
  const notes = r.tried.map((x) => `${x.id} ${x.result === "taken" ? "was taken by another rider" : x.result}`);
  const eta = dist < 0.15 ? "the car is already at the kerb" : `pickup ${dist.toFixed(1)} blocks away, about ${Math.max(1, Math.round(dist / SPEED))} s`;
  return `Rider ${r.id} matched with car ${driver} after ${where}${notes.length ? ` (${notes.join(", ")})` : ""}; ${eta}.`;
}

function stepRides(s: Sim, cfg: Cfg, rand: () => number): Sim {
  const { t } = s;
  const snapshot = s.drivers; // every matcher reads this tick's state before anyone writes
  let drivers = s.drivers;
  let { stats, event, cas: casInfo } = s;
  const byId = (id: string) => drivers.find((d) => d.id === id)!;
  const patch = (id: string, p: Partial<Driver>) => (drivers = drivers.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const freeNow = (id: string) => snapshot.find((d) => d.id === id)?.state === "available";
  const rides: Ride[] = [];

  for (const r0 of s.rides) {
    let r = r0;
    if (r.phase === "searching") {
      const scan = (k: number) => {
        const ids = cfg.mode === "scan" ? snapshot.map((d) => d.id) : scanRing(s.index, ...r.cell, k);
        const found = ids.filter(freeNow).map((id) => ({ id, dist: roadDistance(snapshot.find((d) => d.id === id)!.reported, r.pickup) }));
        const candidates = [...(cfg.mode === "scan" ? [] : r.candidates), ...found].sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id));
        const searchMs = r.searchMs + (cfg.mode === "cells" && k > 0 ? RING_MS : 0);
        r = { ...r, ring: cfg.mode === "scan" ? maxRing(r.cell) : k, ringAt: t, examined: r.examined + ids.length, candidates, searchMs };
      };
      if (r.ring < 0) scan(0);
      for (let pass = 0; pass < 2; pass++) {
        const best = r.candidates.find((c) => freeNow(c.id) && !r.tried.some((x) => x.id === c.id && x.result !== "taken"));
        // After ring k, anything unscanned is at least k blocks away: a candidate that close can't be beaten.
        const done = r.ring >= maxRing(r.cell);
        if (best && (best.dist <= r.ring + EPS || done)) {
          const next = cas(drivers, best.id, { state: "available" }, { state: "offered", rideId: r.id });
          if (next) {
            drivers = next;
            const forced = r.duel && !r.tried.length; // the demo's winner accepts, so the race reads clearly
            const answer: Answer = forced || rand() >= cfg.declineRate ? "accept" : rand() < 0.5 ? "decline" : "timeout";
            r = { ...r, phase: "offering", phaseAt: t, offer: { driver: best.id, at: t, answerAt: answer === "timeout" ? t + OFFER_MS : t + 900 + rand() * 1500, answer } };
          } else {
            const holder = byId(best.id).rideId ?? "another rider";
            r = { ...r, tried: [...r.tried, { id: best.id, result: "taken" }] };
            event = `${holder} and ${r.id} both picked ${best.id} in the same instant. Compare-and-set let ${holder}'s write through; ${r.id}'s found ${best.id} no longer available, so ${r.id} moves on to its next candidate. ${best.id} is never offered twice.`;
            casInfo = { at: t, driver: best.id, winner: holder, loser: r.id };
          }
          break;
        }
        // Nothing left to scan (with no index: a fresh full scan found nobody): wait and retry.
        if (done && !best && (cfg.mode === "cells" || r.ringAt === t)) {
          r = { ...r, phase: "waiting", phaseAt: t };
          event = `No free car anywhere for ${r.id} right now; it retries in ${WAIT_MS / 1000} s.`;
          break;
        }
        if (pass > 0) break;
        if (cfg.mode === "scan") scan(0); // no index: re-read every driver
        else if (!done && t - r.ringAt >= RING_MS) scan(r.ring + 1);
        else break;
      }
    } else if (r.phase === "offering" && r.offer && t >= r.offer.answerAt) {
      const o = r.offer;
      const accepted = o.answer === "accept" ? cas(drivers, o.driver, { state: "offered", rideId: r.id }, { state: "onTrip", rideId: r.id }) : null;
      if (accepted) {
        drivers = accepted;
        const d = byId(o.driver);
        const dist = roadDistance(d.pos, r.pickup);
        patch(o.driver, { route: roadPath(d.pos, r.pickup) });
        stats = { matched: stats.matched + 1, matchMs: stats.matchMs + Math.max(0, t - r.createdAt - r.searchMs), pickup: stats.pickup + dist, examined: stats.examined + r.examined };
        event = matchedSentence(r, o.driver, dist, cfg.mode);
        r = { ...r, phase: "pickup", phaseAt: t, driver: o.driver, offer: null };
      } else {
        drivers = cas(drivers, o.driver, { state: "offered", rideId: r.id }, { state: "available", rideId: null }) ?? drivers;
        const result = o.answer === "timeout" ? "timed out" : "declined";
        event = o.answer === "timeout" ? `${o.driver} didn't answer ${r.id} within ${OFFER_MS / 1000} s, so the offer expired and goes to the next candidate.` : `${o.driver} declined ${r.id}; the offer goes to the next-nearest free car.`;
        r = { ...r, phase: "searching", phaseAt: t, offer: null, tried: [...r.tried, { id: o.driver, result }] };
      }
    } else if (r.phase === "pickup" && r.driver) {
      const d = byId(r.driver);
      if (same(d.pos, r.pickup)) r = { ...r, phase: "boarding", phaseAt: t };
      else if (!d.route.length) patch(d.id, { route: roadPath(d.pos, r.pickup) });
    } else if (r.phase === "boarding" && r.driver && t - r.phaseAt >= BOARD_MS) {
      let dest = randomRoadPoint(rand);
      for (let i = 0; i < 8 && roadDistance(r.pickup, dest) < 3; i++) dest = randomRoadPoint(rand);
      patch(r.driver, { route: roadPath(byId(r.driver).pos, dest) });
      r = { ...r, phase: "trip", phaseAt: t, dest };
    } else if (r.phase === "trip" && r.driver && r.dest) {
      const d = byId(r.driver);
      if (same(d.pos, r.dest)) {
        drivers = cas(drivers, d.id, { state: "onTrip", rideId: r.id }, { state: "available", rideId: null }) ?? drivers;
        event = `${r.id} arrived. ${d.id} is available again and its next location update puts it back in the index as free.`;
        r = { ...r, phase: "done", phaseAt: t };
      } else if (!d.route.length) patch(d.id, { route: roadPath(d.pos, r.dest) });
    } else if (r.phase === "done" && t - r.phaseAt >= DONE_MS) continue;
    else if (r.phase === "waiting" && t - r.phaseAt >= WAIT_MS) r = { ...r, phase: "searching", phaseAt: t, ring: -1, candidates: [], tried: [] };
    rides.push(r);
  }
  return { ...s, drivers, rides, stats, event, cas: casInfo };
}

/** One fixed step of the whole city: drive, report locations, maybe spawn a rider, then match. */
export function stepSim(s0: Sim, dt: number, cfg: Cfg): Sim {
  const rand = tickRand(s0);
  const t = s0.t + dt;
  let index = s0.index;
  const pings = s0.pings.filter((p) => t - p < 4000);
  const drivers = s0.drivers.map((d0) => {
    const slow = d0.state === "offered" ? 0.35 : 1; // a driver reading an offer eases off
    const d = drive(d0, (SPEED * slow * dt) / 1000, (TURN_DEG_PER_S * dt) / 1000, rand);
    if (t - d.pingAt < PING_MS) return d;
    index = moveInIndex(index, d.id, d.reported, d.pos); // left the old cell, joined the new one
    pings.push(t);
    return { ...d, reported: d.pos, pingAt: t };
  });
  let s: Sim = { ...s0, t, tick: s0.tick + 1, drivers, index, pings };
  if (cfg.ratePerMin > 0 && rand() < (cfg.ratePerMin / 60) * (dt / 1000) && live(s) < MAX_RIDES - 1) s = requestRide(s, randomRoadPoint(rand), true);
  return stepRides(s, cfg, rand);
}

// ---------------------------------------------------------------- picture
const S = 56; // px per block
const PAD = S / 2;
const RW = 14; // street width
/** On narrow screens the map is drawn transposed (portrait): about a third larger on a phone. */
interface View {
  T: boolean;
  W: number;
  H: number;
}
const WIDE: View = { T: false, W: CW * S, H: CH * S };
const TALL: View = { T: true, W: CH * S, H: CW * S };
const toPx = (v: View, p: Pt) => (v.T ? { x: PAD + p.y * S, y: PAD + p.x * S } : { x: PAD + p.x * S, y: PAD + p.y * S });
const fromPx = (v: View, x: number, y: number): Pt => (v.T ? { x: (y - PAD) / S, y: (x - PAD) / S } : { x: (x - PAD) / S, y: (y - PAD) / S });
/** A rectangle measured along the model's axes, in px → the screen rectangle. */
const rectPx = (v: View, x: number, y: number, w: number, h: number) => (v.T ? { x: y, y: x, width: h, height: w } : { x, y, width: w, height: h });
const screenRot = (v: View, rot: number) => (v.T ? 90 - rot : rot);

const STATE_COLOR: Record<DriverState, string> = { available: "var(--series-1)", offered: "var(--series-2)", onTrip: "var(--series-3)" };
const Z: Record<DriverState, number> = { available: 0, onTrip: 1, offered: 2 }; // offer bubbles draw on top
const STATE_WORD: Record<DriverState, string> = { available: "available", offered: "offered", onTrip: "on a trip" };
const PRESETS: { label: string; at: Pt }[] = [
  { label: "Station", at: { x: 1.5, y: 3 } },
  { label: "Stadium", at: { x: 5.5, y: 2 } },
  { label: "Market", at: { x: 3.5, y: 1 } },
  { label: "Park", at: { x: 3, y: 3.5 } },
];
const LANDMARK: Record<string, string> = { "1,2": "station", "5,1": "stadium", "3,0": "market", "3,3": "park", "6,4": "park", "0,0": "park" };
const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, var(--card))`;
const SEED = 11;

const CSS = `
.ride-map { cursor: crosshair; touch-action: manipulation; }
.ride-map .rm-lbl { font-size: 10px; font-weight: 700; paint-order: stroke; stroke: var(--card); stroke-width: 3px; stroke-linejoin: round; }
.ride-map .rm-cell { font-family: var(--font-mono); font-size: 7.5px; font-weight: 600; fill: var(--k-gateway); }
.ride-map .rm-lm { font-size: 8.5px; font-weight: 650; fill: var(--muted); }
.ride-map .rm-bubble { font-size: 9.5px; font-weight: 700; }
.ride-map[data-tall] .rm-lbl { font-size: 13px; }
.ride-map[data-tall] .rm-cell { font-size: 9px; }
.ride-map[data-tall] .rm-lm { font-size: 10.5px; }
.ride-map[data-tall] .rm-bubble { font-size: 11.5px; }
.rm-body { display: grid; grid-template-columns: minmax(0, 460px) 156px; gap: 12px; justify-content: center; align-items: start; }
.rm-body[data-narrow] { grid-template-columns: minmax(0, 1fr); gap: 8px; }
.rm-side { display: grid; gap: 8px; align-content: start; min-width: 0; }
.rm-pick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
.rm-body[data-narrow] .rm-pick { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rm-pick .wbtn { height: 28px; padding: 0 6px; font-size: 12.5px; justify-content: center; min-width: 0; }
.rm-pick .wbtn:first-of-type { grid-column: span 2; }
.rm-pick-label { grid-column: 1 / -1; display: flex; align-items: center; gap: 4px; font-size: 12.5px; line-height: 1.4; color: var(--muted); }
.rm-stats { display: grid; gap: 4px; margin: 0; }
.rm-body[data-narrow] .rm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 10px; }
.rm-stats > div { border-top: 1px solid var(--border); padding-top: 3px; min-width: 0; }
.rm-stats dt { font-size: 11.5px; line-height: 1.3; color: var(--muted); }
.rm-stats dd { margin: 0; font-size: 14px; line-height: 1.3; font-weight: 650; font-variant-numeric: tabular-nums; }
.rm-stats dd span { display: block; font-size: 11px; font-weight: 400; color: var(--muted); }
.rm-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; list-style: none; padding: 0; margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--muted); }
.rm-legend li { display: flex; align-items: center; gap: 6px; }
`;

function CarShape({ color }: { color: string }) {
  return (
    <g>
      {[-8.5, 4].map((x) => [-8, 5.6].map((y) => <rect key={`${x}${y}`} x={x} y={y} width={5} height={2.4} rx={1} fill="var(--fg)" />))}
      <rect x={-12} y={-6.5} width={24} height={13} rx={4} fill={color} stroke="var(--card)" strokeWidth={1.2} />
      <rect x={3} y={-4.6} width={4.6} height={9.2} rx={1.6} fill="var(--card)" opacity={0.85} />
      <rect x={-9.5} y={-4} width={3} height={8} rx={1.2} fill="var(--card)" opacity={0.65} />
      <circle cx={11} cy={-4} r={1.2} fill="var(--card)" />
      <circle cx={11} cy={4} r={1.2} fill="var(--card)" />
    </g>
  );
}

/** One city block at screen block (i, j); `kind` is a landmark, if any. */
function Block({ i, j, kind }: { i: number; j: number; kind?: string }) {
  const x = PAD + i * S + RW / 2;
  const y = PAD + j * S + RW / 2;
  const w = S - RW;
  const base = <rect x={x} y={y} width={w} height={w} rx={5} fill={kind === "park" ? tint("var(--good)", 16) : "var(--card-2)"} stroke="var(--border-strong)" strokeOpacity={0.5} />;
  const cx = x + w / 2;
  const cy = y + w / 2;
  if (kind === "park")
    return (
      <g>
        {base}
        {[
          [-10, -9, 6],
          [9, -7, 5],
          [-6, 9, 5],
          [10, 10, 6],
          [1, 1, 4],
        ].map(([dx, dy, r]) => (
          <circle key={`${dx}${dy}`} cx={cx + dx} cy={cy + dy} r={r} fill={tint("var(--good)", 42)} />
        ))}
      </g>
    );
  if (kind === "stadium")
    return (
      <g>
        {base}
        <ellipse cx={cx} cy={cy - 3} rx={18} ry={12} fill={tint("var(--k-database)", 22)} stroke={tint("var(--k-database)", 60)} />
        <ellipse cx={cx} cy={cy - 3} rx={11} ry={6.5} fill={tint("var(--good)", 35)} />
        <text x={cx} y={y + w - 2} textAnchor="middle" className="rm-lm">
          Stadium
        </text>
      </g>
    );
  if (kind === "station" || kind === "market")
    return (
      <g>
        {base}
        {kind === "station" ? (
          <>
            <rect x={x + 5} y={y + 6} width={w - 10} height={16} rx={3} fill={tint("var(--k-client)", 18)} stroke={tint("var(--k-client)", 55)} />
            <line x1={x + 5} x2={x + w - 5} y1={y + 14} y2={y + 14} stroke={tint("var(--k-client)", 55)} />
          </>
        ) : (
          [0, 1, 2].map((k) => <rect key={k} x={x + 5 + k * 11} y={y + 7} width={9} height={14} rx={2} fill={tint(k % 2 ? "var(--k-cache)" : "var(--k-database)", 22)} stroke="var(--border-strong)" strokeOpacity={0.6} />)
        )}
        <text x={cx} y={y + w - 4} textAnchor="middle" className="rm-lm">
          {kind === "station" ? "Station" : "Market"}
        </text>
      </g>
    );
  const h = ((i + 3) * 7 + (j + 3) * 13) % 3;
  const parts = h === 0 ? [[3, 3, 17, 17], [22, 3, 17, 17], [3, 22, 36, 17]] : h === 1 ? [[3, 3, 36, 15], [3, 21, 17, 18], [22, 21, 17, 18]] : [[3, 3, 17, 36], [22, 3, 17, 17], [22, 22, 17, 17]];
  return (
    <g>
      {base}
      {parts.map(([a, b, c, d]) => (
        <rect key={`${a}${b}`} x={x + a - 1} y={y + b - 1} width={c - 1} height={d - 1} rx={2} fill="var(--card)" stroke="var(--border)" />
      ))}
    </g>
  );
}

/** Streets, blocks and lane markings never change: render them once per orientation. */
const City = memo(function City({ v }: { v: View }) {
  const cols = v.T ? NY : NX;
  const rows = v.T ? NX : NY;
  const blocks: { i: number; j: number; kind?: string }[] = [];
  for (let j = -1; j <= rows; j++) for (let i = -1; i <= cols; i++) blocks.push({ i, j, kind: LANDMARK[v.T ? `${j},${i}` : `${i},${j}`] });
  return (
    <g>
      <rect width={v.W} height={v.H} fill="var(--border)" />
      {blocks.map((b) => (
        <Block key={`${b.i},${b.j}`} {...b} />
      ))}
      {Array.from({ length: rows + 1 }, (_, y) => (
        <line key={`h${y}`} x1={0} x2={v.W} y1={PAD + y * S} y2={PAD + y * S} stroke="var(--card)" strokeDasharray="5 6" opacity={0.6} />
      ))}
      {Array.from({ length: cols + 1 }, (_, x) => (
        <line key={`v${x}`} y1={0} y2={v.H} x1={PAD + x * S} x2={PAD + x * S} stroke="var(--card)" strokeDasharray="5 6" opacity={0.6} />
      ))}
    </g>
  );
});

const CellGrid = memo(function CellGrid({ v }: { v: View }) {
  const cells: [number, number][] = [];
  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) cells.push([cx, cy]);
  return (
    <g pointerEvents="none">
      {Array.from({ length: v.W / S + 1 }, (_, c) => (
        <line key={`x${c}`} x1={c * S} x2={c * S} y1={0} y2={v.H} stroke="var(--k-gateway)" strokeOpacity={0.45} strokeDasharray="3 3" />
      ))}
      {Array.from({ length: v.H / S + 1 }, (_, c) => (
        <line key={`y${c}`} y1={c * S} y2={c * S} x1={0} x2={v.W} stroke="var(--k-gateway)" strokeOpacity={0.45} strokeDasharray="3 3" />
      ))}
      {cells.map(([cx, cy]) => {
        const r = rectPx(v, cx * S, cy * S, S, S);
        return (
          <text key={`${cx},${cy}`} x={r.x + 3} y={r.y + 9} className="rm-cell">
            {cellLabel(cx, cy)}
          </text>
        );
      })}
    </g>
  );
});

function RiderPin({ v, at, label, reduce }: { v: View; at: Pt; label: string; reduce: boolean }) {
  const p = toPx(v, at);
  const below = p.y < PAD + 0.6 * S; // near the top edge: put the words under the pin
  return (
    <g transform={`translate(${p.x},${p.y})`}>
      <m.g initial={reduce ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.35 }}>
        <path d="M0 0 C -5 -6 -9 -11 -9 -17 A 9 9 0 1 1 9 -17 C 9 -11 5 -6 0 0 Z" fill="var(--k-gateway)" stroke="var(--card)" strokeWidth={1.5} />
        <circle cx={0} cy={-20} r={2.6} fill="var(--card)" />
        <path d="M -4.5 -12.5 Q 0 -18.5 4.5 -12.5 Z" fill="var(--card)" />
        <text y={below ? 15 : -30} textAnchor="middle" className="rm-lbl">
          {label}
        </text>
      </m.g>
    </g>
  );
}

function Car({ v, d, offer, duel, candidate, reduce }: { v: View; d: Driver; offer: { ride: string; left: number } | null; duel: { winner: string; loser: string } | null; candidate: boolean; reduce: boolean }) {
  const rot = screenRot(v, d.rot);
  const r = (rot * Math.PI) / 180;
  const p = toPx(v, d.pos);
  const x = p.x - Math.sin(r) * 3.5; // keep right: offset into the right-hand lane
  const y = p.y + Math.cos(r) * 3.5;
  const secs = offer ? Math.ceil(offer.left / 1000) : 0;
  const top = p.y < PAD + 0.8 * S; // near the top edge: bubbles go below the car
  const keepIn = (half: number) => clamp(x, half + 2, v.W - half - 2) - x; // nudge bubbles back inside the map
  return (
    <m.g initial={false} animate={{ x, y }} transition={{ duration: reduce ? 0 : 0.08, ease: "linear" }}>
      {candidate && <circle r={16} fill="none" stroke="var(--k-gateway)" strokeWidth={1.6} strokeDasharray="4 3" />}
      <g transform={`rotate(${rot})`}>
        <CarShape color={STATE_COLOR[d.state]} />
        {d.state === "onTrip" && d.rideId && <circle cx={-2} cy={0} r={2.6} fill="var(--card)" stroke="var(--fg)" strokeWidth={0.8} />}
      </g>
      <text y={p.y < PAD + 0.4 * S ? 24 : -12} textAnchor="middle" className="rm-lbl">
        {d.id}
      </text>
      {offer && (
        <g transform={`translate(${keepIn(30)},${top ? 52 : -16})`}>
          <rect x={-30} y={-24} width={60} height={20} rx={6} fill="var(--card)" stroke="var(--series-2)" strokeWidth={1.6} />
          <text y={-10.5} textAnchor="middle" className="rm-bubble">
            {offer.ride}? {secs} s
          </text>
          <rect x={-26} y={-8} width={52 * clamp(offer.left / OFFER_MS, 0, 1)} height={2.5} rx={1} fill="var(--series-2)" />
        </g>
      )}
      {duel && (
        <g transform={`translate(${keepIn(50)},${top ? 78 : -42})`}>
          <rect x={-50} y={-24} width={100} height={20} rx={6} fill="var(--card)" stroke="var(--k-gateway)" strokeWidth={1.4} />
          <text y={-10} textAnchor="middle" className="rm-bubble">
            CAS: <tspan style={{ fill: "var(--good-ink)" }}>{duel.winner} ✓</tspan> <tspan style={{ fill: "var(--critical-ink)" }}>{duel.loser} ✕</tspan>
          </text>
        </g>
      )}
    </m.g>
  );
}

function LegendCar({ state }: { state: DriverState }) {
  return (
    <svg width={26} height={16} viewBox="-13 -8 26 16" aria-hidden="true">
      <CarShape color={STATE_COLOR[state]} />
    </svg>
  );
}

export function RideMatchSim() {
  const [running, setRunning] = useState(true);
  const [ratePerMin, setRate] = useState(8);
  const [declinePct, setDecline] = useState(30);
  const [mode, setMode] = useState<IndexMode>("cells");
  const [showCells, setShowCells] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const width = useBoxWidth(ref);
  const narrow = width !== undefined && width < 520;
  const v = narrow ? TALL : WIDE;
  const at = (p: Pt) => toPx(v, p);
  const cfgStep = useCallback((st: Sim, dt: number) => stepSim(st, dt, { declineRate: declinePct / 100, ratePerMin, mode }), [declinePct, ratePerMin, mode]);
  const [s, reset] = useFixedStep<Sim>(() => initSim(SEED), cfgStep, running && inView && !reduce);

  const request = (at: Pt) => reset(requestRide(s, at));
  const randomSpot = () => request(randomRoadPoint(mulberry32(s.seed * 31 + s.nextRide * 977 + s.tick)));
  const onMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    request(fromPx(v, ((e.clientX - box.left) / box.width) * v.W, ((e.clientY - box.top) / box.height) * v.H));
  };

  const count = (st: DriverState) => s.drivers.filter((d) => d.state === st).length;
  const waiting = s.rides.filter((r) => r.phase === "searching" || r.phase === "offering" || r.phase === "waiting").length;
  const searching = s.rides.filter((r) => (r.phase === "searching" || r.phase === "offering") && r.ring >= 0);
  const candidates = new Set(s.rides.filter((r) => r.phase === "searching").flatMap((r) => r.candidates.filter((c) => s.drivers.find((d) => d.id === c.id)?.state === "available").map((c) => c.id)));
  const offers = new Map(s.rides.filter((r) => r.phase === "offering" && r.offer).map((r) => [r.offer!.driver, { ride: r.id, left: r.offer!.at + OFFER_MS - s.t }]));
  const casFresh = s.cas && s.t - s.cas.at < 3000 ? s.cas : null;

  const st = s.stats;
  const n = st.matched;
  const avgPickup = n ? st.pickup / n : 0;
  const ups = s.pings.filter((p) => s.t - p < 4000).length / Math.min(4, Math.max(s.t / 1000, 1));
  const said = useThrottled(s.event, 700);
  const mapLabel = `City map: ${N_DRIVERS} cars, ${count("available")} ${STATE_WORD.available}, ${count("offered")} ${STATE_WORD.offered}, ${count("onTrip")} ${STATE_WORD.onTrip}; ${waiting} rider${waiting === 1 ? "" : "s"} waiting for a match.`;

  return (
    <WidgetFrame title="Ride matching on a city grid" sub="Tap the map to call a ride, then watch the search ring grow.">
      <style href="w-ride-match" precedence="widgets">
        {CSS}
      </style>
      <div className="controls">
        <SimButtons running={running && inView && !reduce} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(advance(s, cfgStep, 10))} stepHint="Advance 0.5 simulated seconds" onReset={() => reset(initSim(SEED))} />
        <button type="button" className="wbtn primary" onClick={() => reset(twoRiders(s))}>
          <Users size={14} aria-hidden /> Two riders, one driver
        </button>
      </div>

      <div ref={ref} className="rm-body" data-narrow={narrow || undefined}>
        <svg viewBox={`0 0 ${v.W} ${v.H}`} className="sim-svg ride-map" data-tall={v.T || undefined} style={{ maxWidth: v.T ? 440 : 460, margin: "0 auto", borderRadius: 12 }} role="img" aria-label={mapLabel} onClick={onMapClick}>
          <City v={v} />
          {showCells && <CellGrid v={v} />}
          {searching.map((r) => {
            const k = mode === "scan" ? maxRing(r.cell) : r.ring;
            const [cx, cy] = r.cell;
            const x0 = Math.max(cx - k, 0) * S;
            const y0 = Math.max(cy - k, 0) * S;
            const ring = rectPx(v, x0 + 1, y0 + 1, (Math.min(cx + k, CW - 1) + 1) * S - x0 - 2, (Math.min(cy + k, CH - 1) + 1) * S - y0 - 2);
            return (
              <g key={`ring-${r.id}`} pointerEvents="none">
                <m.rect initial={false} animate={ring} transition={{ duration: reduce ? 0 : 0.3 }} rx={8} fill="color-mix(in srgb, var(--k-gateway) 9%, transparent)" stroke="var(--k-gateway)" strokeWidth={1.8} strokeDasharray="7 4" />
                <rect {...rectPx(v, cx * S + 2, cy * S + 2, S - 4, S - 4)} rx={6} fill="color-mix(in srgb, var(--k-gateway) 12%, transparent)" />
              </g>
            );
          })}
          {s.rides.map((r) => {
            const d = r.driver ? s.drivers.find((x) => x.id === r.driver) : null;
            if (!d || (r.phase !== "pickup" && r.phase !== "trip")) return null;
            const pts = [d.pos, ...d.route].map(at);
            return <polyline key={`route-${r.id}`} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={r.phase === "pickup" ? "var(--series-3)" : "var(--k-gateway)"} strokeWidth={3} strokeDasharray="2 5" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />;
          })}
          {s.rides.map((r) => {
            if (r.phase !== "offering" || !r.offer) return null;
            const d = s.drivers.find((x) => x.id === r.offer!.driver);
            if (!d) return null;
            const a = at(r.pickup);
            const b = at(d.pos);
            return <line key={`offer-${r.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--series-2)" strokeWidth={2} strokeDasharray="4 4" />;
          })}
          {s.drivers.map((d) => {
            const age = s.t - d.pingAt;
            if (age > 700 || age < 0) return null;
            const p = at(d.reported);
            const f = reduce ? 0.5 : age / 700;
            return <circle key={`ping-${d.id}`} cx={p.x} cy={p.y} r={6 + 16 * f} fill="none" stroke={STATE_COLOR[d.state]} strokeWidth={2} opacity={0.85 * (1 - f)} />;
          })}
          {s.rides.map((r) =>
            (r.phase === "trip" || r.phase === "done") && r.dest ? (
              <g key={`dest-${r.id}`} transform={`translate(${at(r.dest).x},${at(r.dest).y})`} opacity={r.phase === "done" ? 0.5 : 1}>
                <line x1={0} y1={0} x2={0} y2={-20} stroke="var(--fg)" strokeWidth={1.6} />
                <path d="M0 -20 h12 l-3 4 l3 4 h-12 Z" fill="var(--k-gateway)" />
                <text x={14} y={-10} className="rm-lbl">
                  {r.id}
                </text>
              </g>
            ) : null,
          )}
          {s.rides.map((r) =>
            r.phase === "searching" || r.phase === "offering" || r.phase === "pickup" || r.phase === "waiting" || (r.phase === "boarding" && s.t - r.phaseAt < 500) ? (
              <RiderPin
                key={`pin-${r.id}`}
                v={v}
                at={r.pickup}
                label={r.phase === "waiting" ? `${r.id} no car` : r.id}
                reduce={reduce}
              />
            ) : null,
          )}
          {[...s.drivers].sort((a, b) => Z[a.state] - Z[b.state] || +(casFresh?.driver === a.id) - +(casFresh?.driver === b.id)).map((d) => (
            <Car key={d.id} v={v} d={d} offer={offers.get(d.id) ?? null} duel={casFresh?.driver === d.id ? casFresh : null} candidate={candidates.has(d.id)} reduce={reduce} />
          ))}
        </svg>

        <div className="rm-side">
          <div className="rm-pick" role="group" aria-label="Request a ride at">
            <span className="rm-pick-label">
              <MapPin size={13} aria-hidden /> Request a ride at:
            </span>
            <button type="button" className="wbtn" onClick={randomSpot} aria-label="Request ride at random spot">
              <Shuffle size={13} aria-hidden /> Random spot
            </button>
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="wbtn" onClick={() => request(p.at)}>
                {p.label}
              </button>
            ))}
          </div>
          <dl className="rm-stats">
            <div>
              <dt>Avg pickup</dt>
              <dd>
                {n ? `${avgPickup.toFixed(1)} blocks` : "–"}
                <span>{n ? `ETA ≈ ${(avgPickup / SPEED).toFixed(1)} s` : "no matches yet"}</span>
              </dd>
            </div>
            <div>
              <dt>Avg time to match</dt>
              <dd>
                {n ? `${(st.matchMs / n / 1000).toFixed(1)} s` : "–"}
                <span>{n} matched, request → accept</span>
              </dd>
            </div>
            <div>
              <dt>Location updates</dt>
              <dd>
                {ups.toFixed(1)}/s
                <span>
                  {N_DRIVERS} cars × 1 per {PING_MS / 1000} s
                </span>
              </dd>
            </div>
            <div>
              <dt>Examined per match</dt>
              <dd>
                {n ? (st.examined / n).toFixed(1) : "–"}
                <span>
                  of {N_DRIVERS} ({mode === "scan" ? "full scan" : "cell index"})
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Animation paused (reduced motion): use Step to advance half a second at a time." />
      </p>

      <More label="Settings and legend">
        <div className="controls">
          <Slider label="Ride requests" value={ratePerMin} min={0} max={30} onChange={setRate} format={(v) => (v ? `${v}/min` : "off")} />
          <Slider label="Decline rate" value={declinePct} min={0} max={90} step={10} onChange={setDecline} format={(v) => `${v}%`} />
          <Seg<IndexMode>
            label="Index"
            value={mode}
            onChange={(v) => {
              setMode(v);
              reset({ ...s, stats: ZERO, event: v === "scan" ? `No index: every match now examines all ${N_DRIVERS} cars. Stats reset.` : "Cell index: a match examines only the cars in the rings it searches. Stats reset." });
            }}
            options={[
              { value: "cells", label: "cells" },
              { value: "scan", label: "scan all drivers" },
            ]}
          />
          <button type="button" className="wbtn" aria-pressed={showCells} onClick={() => setShowCells((v) => !v)}>
            <Grid3x3 size={14} aria-hidden /> Show cells
          </button>
        </div>
        <ul className="rm-legend" aria-label="Legend">
          <li>
            <LegendCar state="available" /> Available
          </li>
          <li>
            <LegendCar state="offered" /> Offered (countdown)
          </li>
          <li>
            <LegendCar state="onTrip" /> On a trip
          </li>
          <li>
            <svg width={14} height={18} viewBox="-9 -27 18 28" aria-hidden="true">
              <path d="M0 0 C -5 -6 -9 -11 -9 -17 A 9 9 0 1 1 9 -17 C 9 -11 5 -6 0 0 Z" fill="var(--k-gateway)" />
            </svg>
            Rider
          </li>
          <li>
            <svg width={18} height={14} aria-hidden="true">
              <rect x={1} y={1} width={16} height={12} rx={3} fill="none" stroke="var(--k-gateway)" strokeWidth={1.6} strokeDasharray="4 2" />
            </svg>
            Search ring (dashed circle: candidate)
          </li>
          <li>
            <svg width={16} height={16} aria-hidden="true">
              <circle cx={8} cy={8} r={6} fill="none" stroke="var(--series-1)" strokeWidth={2} />
            </svg>
            Location update (every {PING_MS / 1000} s)
          </li>
        </ul>
      </More>
    </WidgetFrame>
  );
}

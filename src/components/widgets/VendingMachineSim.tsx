"use client";
import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { m } from "motion/react";
import { Ban, Coins, PackagePlus, Undo2, Wrench } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- the machine (pure)
export type Coin = 100 | 25 | 10 | 5;
export const COINS: readonly Coin[] = [100, 25, 10, 5];
export type Box = Record<Coin, number>;
export type VState = "idle" | "hasMoney" | "dispensing" | "outOfService";
export const STATE_NAME: Record<VState, string> = { idle: "Idle", hasMoney: "HasMoney", dispensing: "Dispensing", outOfService: "OutOfService" };
export type Preset = "plenty" | "low";
export const PRESETS: Record<Preset, Box> = { plenty: { 100: 2, 25: 8, 10: 8, 5: 8 }, low: { 100: 0, 25: 1, 10: 3, 5: 0 } };
export const CAPACITY = 6;

type Shape = "can" | "bottle" | "bag" | "bar";
export interface Slot {
  code: string;
  name: string;
  price: number; // cents
  count: number;
  shape: Shape;
  color: string;
}
export interface Pending {
  code: string;
  price: number;
  credit: number;
  change: Coin[];
  /** The coin greedy would have grabbed first and then got stuck, if greedy fails here. */
  greedyStuck: Coin | null;
}
export interface Ledger {
  opening: number;
  inserted: number;
  paidOut: number;
  /** Coins the operator added (+) or took out (−) of the tubes. */
  adjusted: number;
  revenue: number;
  sales: number;
}
export interface Machine {
  state: VState;
  escrow: Coin[];
  box: Box;
  slots: Slot[];
  pending: Pending | null;
  ledger: Ledger;
}
export type VEvent =
  | { type: "coin"; coin: number; fake?: boolean }
  | { type: "select"; code: string }
  | { type: "cancel" }
  | { type: "dropped" }
  | { type: "dropFailed" }
  | { type: "service" }
  | { type: "restock" }
  | { type: "refill"; preset: Preset };
export type Effect =
  | { kind: "accept"; coin: Coin }
  | { kind: "return"; coins: number[]; why: "change" | "refund" | "refused" }
  | { kind: "spin"; code: string }
  | { kind: "drop"; code: string };
export interface Outcome {
  state: Machine;
  ok: boolean;
  effects: Effect[];
  text: string;
  /** Short message for the machine's display. */
  lcd: string;
  from: VState;
  to: VState;
}

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
export const boxTotal = (b: Box) => COINS.reduce((t, c) => t + c * b[c], 0);
const isCoin = (c: number): c is Coin => (COINS as readonly number[]).includes(c);
const cents = (n: number) => `${n}¢`;
const coinList = (cs: readonly number[]) => cs.map(cents).join(" + ");
const withCoins = (b: Box, coins: readonly Coin[]): Box => {
  const out = { ...b };
  for (const c of coins) out[c]++;
  return out;
};
const withoutCoins = (b: Box, coins: readonly Coin[]): Box => {
  const out = { ...b };
  for (const c of coins) out[c]--;
  return out;
};
const boxText = (b: Box) => COINS.filter((c) => b[c] > 0).map((c) => `${b[c]} × ${c}¢`).join(", ") || "empty";

/** Largest coin first, never backtracking. Optimal for 100/25/10/5 only when coins are unlimited. */
export function greedyChange(amount: number, counts: Partial<Record<number, number>>): Coin[] | null {
  const out: Coin[] = [];
  for (const d of COINS) {
    let n = Math.min(counts[d] ?? 0, Math.floor(amount / d));
    amount -= n * d;
    while (n-- > 0) out.push(d);
  }
  return amount === 0 ? out : null;
}

/** Bounded DP: the fewest coins that pay `amount` exactly with at most counts[d] of each coin, or null. */
export function makeChange(amount: number, counts: Partial<Record<number, number>>): Coin[] | null {
  if (amount < 0) return null;
  let best = [0, ...Array<number>(amount).fill(Infinity)];
  const used: number[][] = [];
  for (const d of COINS) {
    const next = Array<number>(amount + 1).fill(Infinity);
    const pick = Array<number>(amount + 1).fill(0);
    const have = counts[d] ?? 0;
    for (let a = 0; a <= amount; a++)
      for (let j = 0; j <= have && j * d <= a; j++) {
        const c = best[a - j * d] + j;
        if (c < next[a]) {
          next[a] = c;
          pick[a] = j;
        }
      }
    used.push(pick);
    best = next;
  }
  if (!Number.isFinite(best[amount])) return null;
  const out: Coin[] = [];
  for (let i = COINS.length - 1, a = amount; i >= 0; i--) {
    const j = used[i][a];
    for (let k = 0; k < j; k++) out.push(COINS[i]);
    a -= j * COINS[i];
  }
  return out.sort((x, y) => y - x);
}

/** The light real machines show when the tubes can't cover every small change amount. */
export const exactChangeOnly = (b: Box) => {
  for (let a = 5; a <= 95; a += 5) if (!makeChange(a, b)) return true;
  return false;
};

/** Money is conserved: what's in the machine plus what came out equals what was ever put in. */
export const balanced = (vm: Machine) => sum(vm.escrow) + boxTotal(vm.box) + vm.ledger.paidOut === vm.ledger.opening + vm.ledger.inserted + vm.ledger.adjusted;

export const START_SLOTS: Slot[] = [
  { code: "A1", name: "Water", price: 90, count: 5, shape: "bottle", color: "var(--k-client)" },
  { code: "A2", name: "Lemonade", price: 110, count: 4, shape: "bottle", color: "var(--warning)" },
  { code: "A3", name: "Iced tea", price: 120, count: 0, shape: "bottle", color: "var(--k-database)" },
  { code: "B1", name: "Lime soda", price: 65, count: 5, shape: "can", color: "var(--k-queue)" },
  { code: "B2", name: "Cola", price: 65, count: 3, shape: "can", color: "var(--k-cache)" },
  { code: "B3", name: "Orange", price: 70, count: 4, shape: "can", color: "var(--serious)" },
  { code: "C1", name: "Chips", price: 75, count: 5, shape: "bag", color: "var(--series-1)" },
  { code: "C2", name: "Pretzels", price: 85, count: 4, shape: "bag", color: "var(--k-gateway)" },
  { code: "C3", name: "Choc bar", price: 55, count: 2, shape: "bar", color: "var(--accent-2)" },
];

export function initMachine(preset: Preset = "plenty"): Machine {
  const box = { ...PRESETS[preset] };
  return { state: "idle", escrow: [], box, slots: START_SLOTS.map((s) => ({ ...s })), pending: null, ledger: { opening: boxTotal(box), inserted: 0, paidOut: 0, adjusted: 0, revenue: 0, sales: 0 } };
}

const changeText = (owed: number, coins: readonly number[]) => (owed === 0 ? "none (exact money)" : `${cents(owed)} = ${coinList(coins)}`);

/** The transition table as a reducer: one outcome per (state, event); rejections return the same object. */
export function machine(vm: Machine, e: VEvent): Outcome {
  const S = STATE_NAME[vm.state];
  const credit = sum(vm.escrow);
  const reject = (text: string, lcd = "", effects: Effect[] = []): Outcome => ({ state: vm, ok: false, effects, text, lcd, from: vm.state, to: vm.state });
  const accept = (state: Machine, text: string, lcd = "", effects: Effect[] = []): Outcome => ({ state, ok: true, effects, text, lcd, from: vm.state, to: state.state });
  const refundAll = (to: VState): Machine => ({ ...vm, state: to, escrow: [], pending: null, ledger: { ...vm.ledger, paidOut: vm.ledger.paidOut + credit } });
  const refundFx: Effect[] = credit ? [{ kind: "return", coins: vm.escrow, why: "refund" }] : [];
  const adminBusy = vm.state === "hasMoney" || vm.state === "dispensing";

  switch (e.type) {
    case "coin": {
      const bounce: Effect[] = [{ kind: "return", coins: [e.coin], why: "refused" }];
      if (e.fake || !isCoin(e.coin)) return reject(`Coin refused: the validator didn't recognise that ${cents(e.coin)} (wrong weight and metal), so it dropped to the cup. Nothing changed (state ${S}).`, "COIN REFUSED", bounce);
      if (vm.state === "dispensing") return reject(`Coin returned: busy dispensing, so the ${cents(e.coin)} dropped to the cup (state Dispensing).`, "", bounce);
      if (vm.state === "outOfService") return reject(`Coin returned: out of service, so the ${cents(e.coin)} dropped to the cup (state OutOfService).`, "OUT OF SERVICE", bounce);
      const escrow = [...vm.escrow, e.coin];
      const next: Machine = { ...vm, state: "hasMoney", escrow, ledger: { ...vm.ledger, inserted: vm.ledger.inserted + e.coin } };
      const text = vm.state === "idle" ? `Inserted ${cents(e.coin)}: Idle → HasMoney, credit ${cents(sum(escrow))}.` : `Inserted ${cents(e.coin)}: credit ${cents(sum(escrow))} (state HasMoney).`;
      return accept(next, text, "", [{ kind: "accept", coin: e.coin }]);
    }
    case "select": {
      if (vm.state === "idle") return reject("Select ignored: insert money first (state Idle).", "INSERT COINS");
      if (vm.state === "dispensing") return reject("Select ignored: already dispensing (state Dispensing).");
      if (vm.state === "outOfService") return reject("Select ignored: out of service (state OutOfService).", "OUT OF SERVICE");
      const slot = vm.slots.find((s) => s.code === e.code);
      if (!slot) return reject(`Select ignored: there is no slot ${e.code} (state HasMoney).`);
      const item = `${slot.code} ${slot.name}`;
      if (slot.count === 0) return reject(`Select ignored: ${item} is SOLD OUT. Your ${cents(credit)} stays: pick another item or cancel (state HasMoney).`, "SOLD OUT");
      if (credit < slot.price)
        return reject(`Select ignored: ${item} costs ${cents(slot.price)} and the credit is ${cents(credit)}. Insert ${cents(slot.price - credit)} more (state HasMoney).`, `INSERT ${slot.price - credit}¢`);
      const owed = credit - slot.price;
      const counts = withCoins(vm.box, vm.escrow); // the customer's own coins can be part of the change
      const change = makeChange(owed, counts);
      if (!change)
        return accept(refundAll("idle"), `No sale: the coin box can't make ${cents(owed)} change for ${item}, so all ${cents(credit)} came back (${coinList(vm.escrow)}). HasMoney → Idle, nothing dispensed.`, "EXACT CHANGE", refundFx);
      const greedyStuck = greedyChange(owed, counts) ? null : (COINS.find((c) => c <= owed && counts[c] > 0) ?? null);
      const pending: Pending = { code: slot.code, price: slot.price, credit, change, greedyStuck };
      return accept({ ...vm, state: "dispensing", pending }, `${item}: ${cents(slot.price)} of ${cents(credit)} credit; change ${changeText(owed, change)} reserved. Spiral turning (HasMoney → Dispensing).`, "VENDING…", [{ kind: "spin", code: slot.code }]);
    }
    case "cancel": {
      if (vm.state === "dispensing") return reject("Cancel ignored: too late, the item is already on its way (state Dispensing).");
      if (vm.state !== "hasMoney") return reject(`Cancel ignored: no credit to refund (state ${S}).`);
      return accept(refundAll("idle"), `Cancelled: refunded ${cents(credit)} (${coinList(vm.escrow)}), the same coins that went in. HasMoney → Idle.`, "REFUND", refundFx);
    }
    case "dropped": {
      const p = vm.pending;
      if (vm.state !== "dispensing" || !p) return reject(`Drop sensor ignored: nothing is being dispensed (state ${S}).`);
      const slot = vm.slots.find((s) => s.code === p.code)!;
      const owed = p.credit - p.price;
      const greedy = p.greedyStuck ? ` Greedy would have grabbed a ${cents(p.greedyStuck)} first and got stuck; the bounded DP found this.` : "";
      const next: Machine = {
        ...vm,
        state: "idle",
        escrow: [],
        pending: null,
        box: withoutCoins(withCoins(vm.box, vm.escrow), p.change), // escrow in, reserved change out
        slots: vm.slots.map((s) => (s.code === p.code ? { ...s, count: s.count - 1 } : s)), // exactly once per sale
        ledger: { ...vm.ledger, paidOut: vm.ledger.paidOut + sum(p.change), revenue: vm.ledger.revenue + p.price, sales: vm.ledger.sales + 1 },
      };
      const fx: Effect[] = [{ kind: "drop", code: p.code }];
      if (p.change.length) fx.push({ kind: "return", coins: p.change, why: "change" });
      return accept(next, `Dispensed ${p.code} ${slot.name} for ${cents(p.price)} from ${cents(p.credit)}; change ${changeText(owed, p.change)}.${greedy}`, "THANK YOU", fx);
    }
    case "dropFailed": {
      const p = vm.pending;
      if (vm.state !== "dispensing" || !p) return reject(`Drop sensor ignored: nothing is being dispensed (state ${S}).`);
      const slot = vm.slots.find((s) => s.code === p.code)!;
      return accept(refundAll("idle"), `Nothing crossed the drop sensor: ${p.code} ${slot.name} is stuck in the spiral. No sale: refunded ${cents(credit)}, stock unchanged. Dispensing → Idle.`, "REFUND", refundFx);
    }
    case "service": {
      if (vm.state === "dispensing") return reject("Service ignored: wait for the vend to finish (state Dispensing).");
      if (vm.state === "outOfService") return accept({ ...vm, state: "idle" }, "Service mode off: OutOfService → Idle. Ready for customers.");
      if (vm.state === "hasMoney") return accept(refundAll("outOfService"), `Service mode on: refunded ${cents(credit)} first, then HasMoney → OutOfService.`, "OUT OF SERVICE", refundFx);
      return accept({ ...vm, state: "outOfService" }, "Service mode on: Idle → OutOfService. Coins and selections are refused until it's switched off.", "OUT OF SERVICE");
    }
    case "restock": {
      if (adminBusy) return reject(`Restock ignored: a customer is mid-purchase (state ${S}).`);
      const added = sum(vm.slots.map((s) => CAPACITY - s.count));
      const text = added ? `Restocked ${added} items: every slot holds ${CAPACITY} (state ${S}).` : `Restock: every slot is already full (state ${S}).`;
      return accept({ ...vm, slots: vm.slots.map((s) => ({ ...s, count: CAPACITY })) }, text);
    }
    case "refill": {
      if (adminBusy) return reject(`Coin box change ignored: a customer is mid-purchase (state ${S}).`);
      const box = { ...PRESETS[e.preset] };
      const ledger = { ...vm.ledger, adjusted: vm.ledger.adjusted + boxTotal(box) - boxTotal(vm.box) };
      return accept({ ...vm, box, ledger }, `Coin box set to ${e.preset}: ${boxText(box)} (${cents(boxTotal(box))}).${exactChangeOnly(box) ? " Exact change only: some purchases will be refused." : ""}`);
    }
  }
}

// ---------------------------------------------------------------- the world around it (animation + customers)
const COIN_MS = 450;
const SPIN_MS = 900;
const FALL_MS = 500;
const VEND_MS = SPIN_MS + FALL_MS;
const JAM_MS = 2200; // the drop sensor gives up
const TUMBLE_MS = 650;
const STAGGER_MS = 130;
const CUP_MS = 4200;
const TRAY_MS = 3600;
const FLASH_MS = 900;
const LCD_MS = 2200;

interface Customer {
  want: string;
  coins: Coin[];
  cancel: boolean;
  tries: number;
}
interface Moving {
  id: number;
  coin: number;
  at: number;
}
export interface World {
  vm: Machine;
  t: number;
  /** Credit on the display: ticks up toward the real credit as coins land. */
  shown: number;
  coinsIn: Moving[];
  coinsOut: Moving[];
  cup: Moving[];
  vend: { code: string; at: number; jam: boolean } | null;
  tray: { id: number; code: string; at: number }[];
  flash: { from: VState; to: VState; ok: boolean; at: number; event: VEvent["type"] } | null;
  key: { code: string; at: number } | null;
  lcd: { text: string; at: number } | null;
  msg: string;
  jamNext: boolean;
  auto: boolean;
  preset: Preset;
  seed: number;
  cust: Customer | null;
  nextAt: number;
  nextId: number;
}

export const initWorld = (): World => ({
  vm: initMachine(),
  t: 0,
  shown: 0,
  coinsIn: [],
  coinsOut: [],
  cup: [],
  vend: null,
  tray: [],
  flash: null,
  key: null,
  lcd: null,
  msg: "Insert coins, then click a product, or press Run to watch customers. Try a product before paying, or the SOLD OUT slot A3.",
  jamNext: false,
  auto: false,
  preset: "plenty",
  seed: 2024,
  cust: null,
  nextAt: 0,
  nextId: 1,
});

/** Apply one event: run the reducer, then turn its effects into things that move. */
export function act(w: World, e: VEvent): World {
  const r = machine(w.vm, e);
  let nextId = w.nextId;
  const coinsIn = [...w.coinsIn];
  const coinsOut = [...w.coinsOut];
  let { vend, tray, jamNext } = w;
  for (const fx of r.effects) {
    if (fx.kind === "accept") coinsIn.push({ id: nextId++, coin: fx.coin, at: w.t });
    else if (fx.kind === "return") fx.coins.forEach((coin, i) => coinsOut.push({ id: nextId++, coin, at: w.t + i * STAGGER_MS }));
    else if (fx.kind === "spin") {
      vend = { code: fx.code, at: w.t, jam: jamNext };
      jamNext = false;
    } else tray = [...tray, { id: nextId++, code: fx.code, at: w.t }].slice(-3);
  }
  return {
    ...w,
    vm: r.state,
    coinsIn,
    coinsOut,
    vend,
    tray,
    jamNext,
    nextId,
    msg: r.text,
    lcd: r.lcd ? { text: r.lcd, at: w.t } : null,
    flash: { from: r.from, to: r.to, ok: r.ok, at: w.t, event: e.type },
    key: e.type === "select" ? { code: e.code, at: w.t } : w.key,
    preset: e.type === "refill" && r.ok ? e.preset : w.preset,
  };
}

const creditTarget = (w: World) => Math.max(0, sum(w.vm.escrow) - sum(w.coinsIn.map((c) => c.coin)));

/** Finish everything in flight at once (reduced motion, and the Step button). */
export function settle(w0: World): World {
  let w = w0;
  if (w.vend) w = act({ ...w, vend: null }, { type: w.vend.jam ? "dropFailed" : "dropped" });
  return { ...w, coinsIn: [], coinsOut: [], cup: [...w.cup, ...w.coinsOut].slice(-12), shown: sum(w.vm.escrow) };
}

export const busy = (w: World) =>
  !!w.vend ||
  w.coinsIn.length + w.coinsOut.length + w.cup.length + w.tray.length > 0 ||
  w.shown !== creditTarget(w) ||
  (!!w.flash && w.t - w.flash.at < FLASH_MS * 2) ||
  (!!w.lcd && w.t - w.lcd.at < LCD_MS);

function newCustomer(vm: Machine, rnd: () => number): Customer {
  const slot = vm.slots[Math.floor(rnd() * vm.slots.length)];
  const need = Math.max(0, slot.price - sum(vm.escrow));
  const style = rnd();
  let coins: Coin[];
  if (style < 0.45) coins = Array<Coin>(Math.ceil(need / 100)).fill(100);
  else if (style < 0.8) coins = Array<Coin>(Math.ceil(need / 25)).fill(25);
  else coins = greedyChange(need, { 25: 99, 10: 99, 5: 99 }) ?? []; // exact money
  return { want: slot.code, coins, cancel: rnd() < 0.1, tries: 0 };
}

/** One action by the current (seeded, random) customer, or by the technician when the machine needs one. */
export function autoAct(w: World): World {
  const vm = w.vm;
  const later = (x: World, ms: number): World => ({ ...x, nextAt: x.t + ms });
  if (vm.state === "dispensing" || w.vend) return later(w, 300);
  if (vm.state === "outOfService") return later(act(w, vm.slots.some((s) => s.count === 0) ? { type: "restock" } : { type: "service" }), 900);
  const rnd = mulberry32(w.seed);
  const seed = Math.floor(rnd() * 4294967296);
  let cust = w.cust;
  if (!cust) {
    if (vm.state === "idle" && vm.slots.filter((s) => s.count === 0).length >= 3) return later({ ...act(w, { type: "service" }), seed }, 900);
    cust = newCustomer(vm, rnd);
  }
  if (cust.coins.length) {
    const [coin, ...rest] = cust.coins;
    return later({ ...act(w, { type: "coin", coin }), cust: { ...cust, coins: rest }, seed }, 520);
  }
  if (cust.cancel) return later({ ...act(w, { type: "cancel" }), cust: null, seed }, 1400);
  const nw = act(w, { type: "select", code: cust.want });
  if (nw.vm.state !== "hasMoney") return later({ ...nw, cust: null, seed }, 1500); // vending, or refunded: done
  const slot = vm.slots.find((s) => s.code === cust.want)!;
  if (slot.count > 0) {
    const short = slot.price - sum(vm.escrow);
    return later({ ...nw, cust: { ...cust, coins: Array<Coin>(Math.max(1, Math.ceil(short / 25))).fill(25) }, seed }, 700);
  }
  const inStock = vm.slots.filter((s) => s.count > 0);
  if (!inStock.length || cust.tries >= 2) return later({ ...nw, cust: { ...cust, cancel: true }, seed }, 900);
  const pick = inStock[Math.floor(rnd() * inStock.length)];
  return later({ ...nw, cust: { ...cust, want: pick.code, tries: cust.tries + 1 }, seed }, 900);
}

const tickCredit = (shown: number, target: number) => (shown >= target ? target : Math.min(target, shown + Math.max(5, Math.ceil((target - shown) / 20) * 5)));

/** Fixed-step clock: coins land, the spiral turns, the drop sensor fires, customers act. */
export function stepWorld(w0: World, dt: number): World {
  const t = w0.t + dt;
  let w: World = { ...w0, t };
  if (w.coinsIn.some((c) => t - c.at >= COIN_MS)) w = { ...w, coinsIn: w.coinsIn.filter((c) => t - c.at < COIN_MS) };
  const landed = w.coinsOut.filter((c) => t - c.at >= TUMBLE_MS);
  if (landed.length) w = { ...w, coinsOut: w.coinsOut.filter((c) => t - c.at < TUMBLE_MS), cup: [...w.cup, ...landed.map((c) => ({ ...c, at: c.at + TUMBLE_MS }))].slice(-12) };
  if (w.cup.some((c) => t - c.at >= CUP_MS)) w = { ...w, cup: w.cup.filter((c) => t - c.at < CUP_MS) };
  if (w.tray.some((i) => t - i.at >= TRAY_MS)) w = { ...w, tray: w.tray.filter((i) => t - i.at < TRAY_MS) };
  w = { ...w, shown: tickCredit(w.shown, creditTarget(w)) };
  if (w.vend && t - w.vend.at >= (w.vend.jam ? JAM_MS : VEND_MS)) w = act({ ...w, vend: null }, { type: w.vend.jam ? "dropFailed" : "dropped" });
  if (w.auto && t >= w.nextAt) w = autoAct(w);
  return w;
}

// ---------------------------------------------------------------- drawing
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const HEIGHT: Record<Shape, number> = { can: 34, bottle: 48, bag: 42, bar: 38 };
/** The machine front: a short, wide cabinet (three shelves, pickup tray and change cup underneath). */
const MW = 340;
const MH = 332;
const cellX = (i: number) => 56 + (i % 3) * 68;
const shelfY = (i: number) => 98 + Math.floor(i / 3) * 74;
/** A product slot's clickable area (and its hover / focus outline). */
const cellBox = (i: number) => ({ x: cellX(i) - 33, y: shelfY(i) - 55, width: 66, height: 74 });
const TRAY_Y = 302;
const trayX = (i: number) => 52 + (i % 3) * 58;
const cupPos = (i: number) => ({ x: 258 + (i % 5) * 12.5, y: 309 - Math.floor(i / 5) * 9 });
const CHUTE = { x: 282, y: 244 };
const SLIT = { x: 282, y: 116 };
const OUTLINE = { stroke: "var(--fg)", strokeOpacity: 0.3, strokeWidth: 1 };
const ITEM = 1.15; // products drawn a little larger than their nominal size

function Product({ shape, color }: { shape: Shape; color: string }) {
  const band = { fill: "var(--card)", opacity: 0.55 };
  if (shape === "can")
    return (
      <g>
        <rect x={-11} y={-34} width={22} height={34} rx={4} fill={color} {...OUTLINE} />
        <rect x={-11} y={-24} width={22} height={10} {...band} />
        <ellipse cx={0} cy={-31.5} rx={8.5} ry={2} {...band} />
      </g>
    );
  if (shape === "bottle")
    return (
      <g>
        <path d="M-9,0 h18 v-26 q0,-6 -5,-9 v-7 h-8 v7 q-5,3 -5,9 z" fill={color} {...OUTLINE} />
        <rect x={-5} y={-48} width={10} height={6} rx={1.5} fill="var(--fg)" opacity={0.6} />
        <rect x={-9} y={-20} width={18} height={9} {...band} />
      </g>
    );
  if (shape === "bag")
    return (
      <g>
        <path d="M-15,0 Q-18,-20 -14,-38 L-10,-42 L-6,-38 L-2,-42 L2,-38 L6,-42 L10,-38 L14,-42 Q18,-20 15,0 Z" fill={color} {...OUTLINE} />
        <circle cx={0} cy={-20} r={7} {...band} />
      </g>
    );
  return (
    <g>
      <rect x={-11} y={-38} width={22} height={38} rx={2} fill={color} {...OUTLINE} />
      <rect x={-11} y={-38} width={22} height={4} fill="var(--fg)" opacity={0.25} />
      <rect x={-11} y={-4} width={22} height={4} fill="var(--fg)" opacity={0.25} />
      <path d="M-11,-12 L11,-26 L11,-20 L-11,-6 Z" {...band} />
    </g>
  );
}

function CoinShape({ value, r = 9, label = true }: { value: number; r?: number; label?: boolean }) {
  const gold = value === 100;
  return (
    <g>
      <circle r={r} fill={gold ? "var(--card)" : "var(--card-2)"} stroke={gold ? "var(--accent-2)" : "var(--muted)"} strokeWidth={gold ? 2.6 : 1.6} />
      <circle r={r - 3} fill="none" stroke={gold ? "var(--accent-2)" : "var(--muted)"} strokeOpacity={0.5} strokeWidth={0.8} />
      {label && (
        <text y={3} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 700 }}>
          {gold ? "$1" : value}
        </text>
      )}
    </g>
  );
}

/** The coil under an item: slanted wires that slide sideways while the motor turns. */
function Coil({ x, y, phase }: { x: number; y: number; phase: number }) {
  return (
    <g aria-hidden>
      {[0, 1, 2, 3, 4].map((k) => {
        const px = x - 30 + ((k * 12 + phase) % 60);
        return <path key={k} d={`M${px},${y + 5} L${px + 6},${y - 1}`} stroke="var(--muted)" strokeWidth={1.6} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** The machine as seen by a customer. `hover` outlines the slot under the pointer (or keyboard focus). */
export function MachineFront({ w, reduce, hover = null }: { w: World; reduce: boolean; hover?: string | null }) {
  const { vm, t } = w;
  const exact = exactChangeOnly(vm.box);
  const lcdLive = w.lcd && (reduce || t - w.lcd.at < LCD_MS) ? w.lcd.text : null;
  const idleLcd = { idle: "INSERT COINS", hasMoney: "SELECT ITEM", dispensing: "VENDING…", outOfService: "OUT OF SERVICE" }[vm.state];
  const vend = w.vend;
  const vendIndex = vend ? vm.slots.findIndex((s) => s.code === vend.code) : -1;
  const soldOut = vm.slots.filter((s) => s.count === 0).map((s) => s.code);
  const label = `Vending machine front. State ${STATE_NAME[vm.state]}, credit ${cents(sum(vm.escrow))}. ${soldOut.length ? `Sold out: ${soldOut.join(", ")}.` : "Nothing sold out."}${exact ? " The exact change only light is on." : ""}${w.tray.length ? " There is an item in the pickup tray." : ""}${vend ? ` Dispensing ${vend.code}.` : ""}`;

  // The item being vended: creeps forward while the spiral turns, then falls into the tray (or sticks).
  let moving: ReactNode = null;
  if (vend && vendIndex >= 0 && !reduce) {
    const s = vm.slots[vendIndex];
    const e = t - vend.at;
    const h = HEIGHT[s.shape] * ITEM;
    const x0 = cellX(vendIndex);
    const y0 = shelfY(vendIndex) - h / 2;
    const p = clamp01(e / SPIN_MS);
    let x = x0;
    let y = y0 + 6 * p;
    let rot = vend.jam && p >= 1 ? Math.sin(e / 70) * 5 + 8 : 0;
    let scale = ITEM * (1 + 0.12 * p);
    if (!vend.jam && e > SPIN_MS) {
      const q = clamp01((e - SPIN_MS) / FALL_MS);
      x = lerp(x0, trayX(Math.min(w.tray.length, 2)), q);
      y = lerp(y0 + 6, TRAY_Y, q * q);
      rot = 90 * q;
      scale = ITEM * lerp(1.12, 0.9, q);
    }
    moving = (
      <m.g initial={false} animate={{ x, y }} transition={{ duration: 0.06, ease: "linear" }}>
        <g transform={`rotate(${rot.toFixed(1)}) scale(${scale.toFixed(3)}) translate(0 ${HEIGHT[s.shape] / 2})`}>
          <Product shape={s.shape} color={s.color} />
        </g>
      </m.g>
    );
  }

  return (
    <svg viewBox={`0 0 ${MW} ${MH}`} className="sim-svg" role="img" aria-label={label}>
      <rect x={6} y={4} width={328} height={318} rx={16} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={2} />
      <rect x={24} y={322} width={28} height={8} rx={2} fill="var(--border-strong)" />
      <rect x={288} y={322} width={28} height={8} rx={2} fill="var(--border-strong)" />
      <rect x={18} y={11} width={304} height={18} rx={5} fill="var(--accent)" />
      <text x={170} y={24} textAnchor="middle" style={{ fill: "var(--accent-ink)", fontWeight: 750, fontSize: 11, letterSpacing: 2 }}>
        SNACKS · DRINKS
      </text>

      {/* glass window with the 3 × 3 grid */}
      <rect x={18} y={34} width={212} height={236} rx={8} fill="var(--card)" stroke="var(--border-strong)" strokeWidth={1.5} />
      {vm.slots.map((s, i) => {
        const x = cellX(i);
        const y = shelfY(i);
        const isVending = i === vendIndex && !reduce;
        const spinning = isVending && t - vend!.at < SPIN_MS + (vend!.jam ? 300 : 0);
        const phase = spinning ? ((t - vend!.at) * 0.05) % 12 : 0;
        const showFront = s.count > 0 && !isVending;
        const showBehind = s.count > 1;
        return (
          <g key={s.code}>
            <rect x={x - 32} y={y + 3} width={64} height={4} rx={1} fill="var(--border-strong)" />
            <Coil x={x} y={y - 2} phase={phase} />
            {showBehind && (
              <g transform={`translate(${x + 7} ${y - 3}) scale(${ITEM * 0.9})`} opacity={0.4}>
                <Product shape={s.shape} color={s.color} />
              </g>
            )}
            {showFront && (
              <g transform={`translate(${x} ${y}) scale(${ITEM})`}>
                <Product shape={s.shape} color={s.color} />
              </g>
            )}
            {s.count === 0 && (
              <g transform={`translate(${x} ${y - 24}) rotate(-12)`}>
                <rect x={-29} y={-10} width={58} height={19} rx={4} fill="var(--card)" stroke="var(--critical)" strokeWidth={1.6} />
                <text y={3.5} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: "var(--critical-ink)" }}>
                  SOLD OUT
                </text>
              </g>
            )}
            <text x={x - 31} y={y + 17} style={{ fontSize: 10.5, fontWeight: 700 }}>
              {s.code} {s.price}¢
            </text>
            <text x={x + 31} y={y + 17} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
              ×{s.count}
            </text>
          </g>
        );
      })}
      <path d="M44,34 L84,34 L36,270 L18,270 L18,160 Z" fill="var(--fg)" opacity={0.04} aria-hidden />
      {hover &&
        vm.slots.map((s, i) =>
          s.code === hover ? <rect key={s.code} {...cellBox(i)} rx={6} fill="color-mix(in srgb, var(--accent) 8%, transparent)" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 3" /> : null,
        )}
      {vm.state === "outOfService" && (
        <g>
          <rect x={30} y={134} width={188} height={36} rx={7} fill="var(--card)" stroke="var(--critical)" strokeWidth={2} />
          <circle cx={58} cy={152} r={7} fill="none" stroke="var(--critical)" strokeWidth={2} />
          <path d="M53,147 L63,157" stroke="var(--critical)" strokeWidth={2} />
          <text x={134} y={157} textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fill: "var(--critical-ink)" }}>
            OUT OF SERVICE
          </text>
        </g>
      )}

      {/* pickup tray and change cup */}
      <rect x={18} y={276} width={212} height={42} rx={8} fill="var(--border)" stroke="var(--border-strong)" />
      <text x={26} y={287} className="muted-text" style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.2 }}>
        PUSH · PICKUP
      </text>
      {w.tray.map((it, i) => {
        const s = vm.slots.find((x) => x.code === it.code)!;
        const h = HEIGHT[s.shape];
        return (
          <g key={it.id} transform={`translate(${trayX(i)} ${TRAY_Y}) rotate(90) scale(${ITEM * 0.9}) translate(0 ${h / 2})`}>
            <Product shape={s.shape} color={s.color} />
          </g>
        );
      })}

      {/* right-hand panel */}
      <rect x={240} y={34} width={84} height={44} rx={6} fill="var(--card)" stroke="var(--border-strong)" />
      <text x={282} y={57} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
        {w.shown}¢
      </text>
      <text x={282} y={71} textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 750, fill: lcdLive && w.flash && !w.flash.ok ? "var(--critical-ink)" : "var(--fg)" }}>
        {lcdLive ?? idleLcd}
      </text>
      <circle cx={247} cy={88} r={5} fill={exact ? "var(--warning)" : "none"} stroke={exact ? "var(--warning-ink)" : "var(--border-strong)"} strokeWidth={1.4} />
      <text x={255} y={91.5} style={{ fontSize: 8, fontWeight: exact ? 800 : 500, fill: exact ? "var(--warning-ink)" : "var(--muted)" }}>
        {exact ? "EXACT CHANGE" : "change OK"}
      </text>
      <rect x={262} y={98} width={40} height={42} rx={6} fill="var(--card)" stroke="var(--border-strong)" />
      <rect x={280} y={104} width={4} height={22} rx={2} fill="var(--fg)" opacity={0.7} />
      <text x={282} y={135} textAnchor="middle" className="muted-text" style={{ fontSize: 8, fontWeight: 700 }}>
        COINS
      </text>
      {vm.slots.map((s, i) => {
        const lit = (w.key?.code === s.code && (reduce ? w.flash?.event === "select" : t - w.key.at < 500)) || s.code === hover;
        return (
          <g key={s.code} transform={`translate(${250 + (i % 3) * 22} ${147 + Math.floor(i / 3) * 17})`}>
            <rect width={18} height={14} rx={3} fill={lit ? "var(--accent)" : "var(--card)"} stroke="var(--border-strong)" />
            <text x={9} y={10.3} textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fill: lit ? "var(--accent-ink)" : "var(--fg)" }}>
              {s.code}
            </text>
          </g>
        );
      })}
      <circle cx={282} cy={211} r={8} fill={w.flash?.event === "cancel" && w.flash.ok && (reduce || t - w.flash.at < 500) ? "var(--critical)" : "var(--card)"} stroke="var(--critical)" strokeWidth={1.5} />
      <text x={282} y={230} textAnchor="middle" className="muted-text" style={{ fontSize: 8, fontWeight: 700 }}>
        REFUND
      </text>
      <rect x={270} y={241} width={24} height={6} rx={3} fill="var(--border-strong)" />
      <rect x={246} y={276} width={72} height={42} rx={8} fill="var(--border)" stroke="var(--border-strong)" />
      <text x={282} y={287} textAnchor="middle" className="muted-text" style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.2 }}>
        CHANGE
      </text>
      {w.cup.map((c, i) => {
        const p = cupPos(i);
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`}>
            <CoinShape value={c.coin} r={6} label={false} />
          </g>
        );
      })}

      {moving}
      {/* coins sliding into the slot */}
      {!reduce &&
        w.coinsIn.map((c) => {
          const p = clamp01((t - c.at) / COIN_MS);
          const q = 1 - (1 - p) * (1 - p);
          const x = lerp(SLIT.x + 34, SLIT.x, q);
          const y = lerp(SLIT.y - 40, SLIT.y, q);
          const edge = p > 0.65 ? lerp(1, 0.15, (p - 0.65) / 0.35) : 1;
          return (
            <m.g key={c.id} initial={false} animate={{ x, y }} transition={{ duration: 0.06, ease: "linear" }}>
              <g transform={`scale(${edge.toFixed(2)} 1)`}>
                <CoinShape value={c.coin} />
              </g>
            </m.g>
          );
        })}
      {/* coins tumbling down the chute into the cup */}
      {!reduce &&
        w.coinsOut.map((c, k) => {
          if (t < c.at) return null;
          const p = clamp01((t - c.at) / TUMBLE_MS);
          const end = cupPos(w.cup.length + k);
          const bounce = p > 0.8 ? Math.sin(((p - 0.8) / 0.2) * Math.PI) * 5 : 0;
          const x = lerp(CHUTE.x, end.x, p);
          const y = lerp(CHUTE.y, end.y, p * p) - bounce;
          return (
            <m.g key={c.id} initial={false} animate={{ x, y }} transition={{ duration: 0.06, ease: "linear" }}>
              <g transform={`rotate(${(p * 540).toFixed(0)})`}>
                <CoinShape value={c.coin} r={7} />
              </g>
            </m.g>
          );
        })}
    </svg>
  );
}

// State diagram: nodes and edges as cubic Bézier segments, so the token's position is computed each tick.
type Pt = [number, number];
type Seg4 = [Pt, Pt, Pt, Pt];
const NODE: Record<VState, Pt> = { idle: [62, 76], hasMoney: [248, 76], outOfService: [62, 206], dispensing: [248, 206] };
const NW = 104;
const NH = 40;
interface Edge {
  segs: Seg4[];
  label: string;
  at: Pt;
  anchor?: "start" | "middle";
  rotate?: number;
}
const EDGES: Record<string, Edge> = {
  "idle>hasMoney": { segs: [[[114, 68], [150, 68], [160, 68], [194, 68]]], label: "first coin", at: [155, 61] },
  "hasMoney>idle": { segs: [[[196, 86], [160, 86], [150, 86], [116, 86]]], label: "cancel / refund", at: [155, 101] },
  "hasMoney>hasMoney": { segs: [[[234, 56], [226, 18], [270, 18], [262, 54]]], label: "coin · sold out · short", at: [248, 15] },
  "hasMoney>dispensing": { segs: [[[248, 96], [248, 130], [248, 152], [248, 184]]], label: "select (paid)", at: [255, 144], anchor: "start" },
  "dispensing>idle": { segs: [[[196, 190], [160, 160], [120, 130], [93, 98]]], label: "dropped / no drop", at: [146, 149] },
  "idle>outOfService": { segs: [[[50, 96], [50, 130], [50, 152], [50, 184]]], label: "", at: [0, 0] },
  "outOfService>idle": { segs: [[[74, 186], [74, 152], [74, 130], [74, 98]]], label: "service", at: [36, 141], rotate: -90 },
  "hasMoney>outOfService": {
    segs: [
      [[300, 82], [336, 96], [338, 262], [250, 262]],
      [[250, 262], [150, 262], [66, 262], [62, 228]],
    ],
    label: "service (refund first)",
    at: [170, 280],
  },
};
const segPath = (segs: Seg4[]) => `M${segs[0][0].join(",")} ${segs.map((s) => `C${s[1].join(",")} ${s[2].join(",")} ${s[3].join(",")}`).join(" ")}`;
function pointOn(segs: Seg4[], p: number): Pt {
  const n = segs.length;
  const i = Math.min(n - 1, Math.floor(p * n));
  const u = p * n - i;
  const [a, b, c, d] = segs[i];
  const k = [(1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u ** 2, u ** 3];
  return [k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1]];
}

export function StateDiagram({ w, reduce }: { w: World; reduce: boolean }) {
  const uid = useId().replace(/:/g, "");
  const cur = w.vm.state;
  const f = w.flash;
  const age = f ? w.t - f.at : Infinity;
  const fresh = !!f && (reduce || age < FLASH_MS * 2);
  const edgeKey = f && f.ok ? `${f.from}>${f.to}` : "";
  const activeKey = fresh && EDGES[edgeKey] ? edgeKey : "";
  const token = activeKey && !reduce && age < FLASH_MS ? pointOn(EDGES[activeKey].segs, clamp01(age / FLASH_MS)) : null;
  const line = !f
    ? "Events light up the transition they take."
    : f.ok
      ? f.from === f.to
        ? `✓ ${f.event}: stays ${STATE_NAME[f.to]}`
        : `✓ ${f.event}: ${STATE_NAME[f.from]} → ${STATE_NAME[f.to]}`
      : `✕ ${f.event} rejected in ${STATE_NAME[f.from]}: nothing changed`;
  return (
    <svg viewBox="0 0 340 312" className="sim-svg" role="img" aria-label={`State diagram. Current state: ${STATE_NAME[cur]}. ${line.replace(/[✓✕]/g, "")}.`} style={{ maxWidth: 420, margin: "0 auto" }}>
      <defs>
        {[
          ["n", "var(--border-strong)"],
          ["a", "var(--accent)"],
        ].map(([k, c]) => (
          <marker key={k} id={`${uid}${k}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {Object.entries(EDGES).map(([key, e]) => {
        const on = key === activeKey;
        return (
          <g key={key}>
            <path d={segPath(e.segs)} fill="none" stroke={on ? "var(--accent)" : "var(--border-strong)"} strokeWidth={on ? 2.6 : 1.4} markerEnd={`url(#${uid}${on ? "a" : "n"})`} />
            {e.label && (
              <text
                x={e.at[0]}
                y={e.at[1]}
                textAnchor={e.anchor ?? "middle"}
                transform={e.rotate ? `rotate(${e.rotate} ${e.at[0]} ${e.at[1]})` : undefined}
                className={on ? undefined : "muted-text"}
                style={{ fontSize: 10, fontWeight: on ? 750 : 500, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 4, strokeLinejoin: "round" }}
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {(Object.keys(NODE) as VState[]).map((s) => {
        const [x, y] = NODE[s];
        const isCur = s === cur;
        const bad = fresh && f && !f.ok && f.from === s;
        return (
          <g key={s}>
            <rect x={x - NW / 2} y={y - NH / 2} width={NW} height={NH} rx={10} fill={isCur ? "var(--accent)" : "var(--card-2)"} stroke={bad ? "var(--critical)" : isCur ? "var(--accent)" : "var(--border-strong)"} strokeWidth={bad ? 3 : 1.5} strokeDasharray={bad ? "5 3" : undefined} />
            <text x={x} y={isCur ? y - 1 : y + 4} textAnchor="middle" style={{ fontSize: 12, fontWeight: 750, fill: isCur ? "var(--accent-ink)" : "var(--fg)" }}>
              {STATE_NAME[s]}
            </text>
            {isCur && (
              <text x={x} y={y + 12} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: "var(--accent-ink)" }}>
                ● current
              </text>
            )}
            {bad && (
              <g transform={`translate(${x + NW / 2 - 4} ${y - NH / 2 + 2})`}>
                <circle r={8} fill="var(--card)" stroke="var(--critical)" strokeWidth={1.6} />
                <text y={3.5} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: "var(--critical-ink)" }}>
                  ✕
                </text>
              </g>
            )}
          </g>
        );
      })}
      {token && (
        <m.g initial={false} animate={{ x: token[0], y: token[1] }} transition={{ duration: 0.06, ease: "linear" }}>
          <circle r={6} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
        </m.g>
      )}
      <text x={170} y={302} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fill: !f ? "var(--muted)" : f.ok ? "var(--good-ink)" : "var(--critical-ink)" }}>
        {line}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- the widget
const COIN_BUTTONS: { coin: number; label: string; fake?: boolean }[] = [
  { coin: 5, label: "5¢" },
  { coin: 10, label: "10¢" },
  { coin: 25, label: "25¢" },
  { coin: 100, label: "$1" },
  { coin: 25, label: "Fake 25¢", fake: true },
];
/** Below this content width the state diagram moves under the controls. */
const NARROW_BELOW = 480;
/** The machine and the diagram never grow taller than this (px), so the widget fits the desktop visual pane. */
const MAX_H = 296;
const DIAGRAM_W = 340;
const DIAGRAM_H = 312;
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

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

export function VendingMachineSim() {
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, NARROW_BELOW);
  const [hover, setHover] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [w, reset] = useFixedStep<World>(initWorld, stepWorld, live && inView && !reduce);
  const want = w.auto || busy(w);
  if (want !== live) setLive(want); // the clock only runs while something moves or customers are playing

  const send = (e: VEvent) => reset(reduce ? settle(act(w, e)) : act(w, e));
  const said = useThrottled(w.msg, 500);
  const vm = w.vm;
  const L = vm.ledger;
  const ok = balanced(vm);
  const unhover = (code: string) => setHover((h) => (h === code ? null : h));

  // The products are the select buttons: one transparent button over each slot in the drawing.
  const machine = (
    <div style={{ position: "relative", width: "100%", maxWidth: Math.round((MAX_H * MW) / MH), margin: "0 auto" }}>
      <MachineFront w={w} reduce={reduce} hover={hover} />
      <div role="group" aria-label="Select a product">
        {vm.slots.map((s, i) => {
          const b = cellBox(i);
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => send({ type: "select", code: s.code })}
              onPointerEnter={() => setHover(s.code)}
              onPointerLeave={() => unhover(s.code)}
              onFocus={() => setHover(s.code)}
              onBlur={() => unhover(s.code)}
              aria-label={`Select ${s.code}: ${s.name}, ${s.price}¢, ${s.count === 0 ? "sold out" : `${s.count} left`}`}
              title={`${s.code} ${s.name} · ${s.price}¢`}
              style={{ position: "absolute", left: pct(b.x, MW), top: pct(b.y, MH), width: pct(b.width, MW), height: pct(b.height, MH), padding: 0, border: 0, borderRadius: 8, background: "transparent", cursor: "pointer" }}
            />
          );
        })}
      </div>
    </div>
  );
  const diagram = (
    <div style={{ width: "100%", maxWidth: Math.round((MAX_H * DIAGRAM_W) / DIAGRAM_H), margin: "0 auto" }}>
      <StateDiagram w={w} reduce={reduce} />
    </div>
  );

  return (
    <WidgetFrame title="Vending machine state machine" sub="Coins wait in escrow until the item drops. Insert coins, then click a product.">
      <div ref={ref}>
        {narrow ? (
          machine
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
            {machine}
            {diagram}
          </div>
        )}
        <div className="controls" style={{ gap: "8px 14px", margin: "8px 0" }}>
          <div role="group" aria-label="Insert a coin" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span className="muted" aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
              <Coins size={14} /> Insert
            </span>
            {COIN_BUTTONS.map((c) => (
              <button key={c.label} type="button" className={`wbtn${c.fake ? " danger" : ""}`} style={{ padding: "0 10px" }} onClick={() => send({ type: "coin", coin: c.coin, fake: c.fake })}>
                <span className="sr-only">Insert </span>
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" className="wbtn danger" aria-label="Cancel / refund" title="Cancel and get the coins back" onClick={() => send({ type: "cancel" })}>
            <Undo2 size={14} aria-hidden /> Refund
          </button>
          <SimButtons
            running={w.auto && !reduce}
            reduce={reduce}
            onToggle={() => reset({ ...w, auto: !w.auto, nextAt: w.t + 200 })}
            onStep={() => reset(reduce ? settle(autoAct(w)) : autoAct(settle(w)))}
            stepLabel="Next"
            stepHint="Play the next customer action"
            onReset={() => reset(initWorld())}
          />
          <span style={{ fontSize: 12.5 }}>
            <b className={ok ? "ok-ink" : "bad-ink"} style={{ fontWeight: 650 }}>
              {ok ? "✓ Money balanced" : "✕ Money lost"}
            </b>
            <span className="muted">
              {" "}
              · {L.sales} {L.sales === 1 ? "sale" : "sales"} ({cents(L.revenue)})
            </span>
          </span>
        </div>
        <p className="readout" aria-live="polite" style={{ minHeight: "3em", marginTop: 0 }}>
          <span className="pill" style={{ marginRight: 6 }}>
            {STATE_NAME[vm.state]} · {cents(sum(vm.escrow))}
          </span>
          {said}
          <ReducedNote reduce={reduce} what="No animation (reduced motion): every event completes at once; Next plays one customer action." />
        </p>
        {narrow && <div style={{ marginTop: 8 }}>{diagram}</div>}
        <More label="Service, restock, jam, coin box">
          <div className="controls" style={{ marginBottom: 4 }}>
            <Seg<Preset>
              label="Coin box"
              value={w.preset}
              onChange={(v) => send({ type: "refill", preset: v })}
              options={[
                { value: "plenty", label: "Plenty" },
                { value: "low", label: "Low (exact change only)" },
              ]}
            />
            <button type="button" className="wbtn" onClick={() => send({ type: "restock" })}>
              <PackagePlus size={14} aria-hidden /> Restock
            </button>
            <button type="button" className="wbtn" aria-pressed={vm.state === "outOfService"} onClick={() => send({ type: "service" })}>
              <Wrench size={14} aria-hidden /> Toggle service mode
            </button>
            <button type="button" className="wbtn" aria-pressed={w.jamNext} onClick={() => reset({ ...w, jamNext: !w.jamNext, msg: w.jamNext ? "The next item will drop normally." : "The next item will jam in the spiral: watch the drop sensor time out and the refund." })}>
              <Ban size={14} aria-hidden /> Jam the next item
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Coin box: {boxText(vm.box)} ({cents(boxTotal(vm.box))}) · sales {L.sales} ({cents(L.revenue)}).{" "}
            <span className={ok ? "ok-ink" : "bad-ink"}>
              {ok ? "✓ Money balanced" : "✕ Money lost"}: escrow {cents(sum(vm.escrow))} + box {cents(boxTotal(vm.box))} + paid out {cents(L.paidOut)} = float {cents(L.opening)} + inserted {cents(L.inserted)}
              {L.adjusted ? ` ${L.adjusted > 0 ? "+" : "−"} refills ${cents(Math.abs(L.adjusted))}` : ""}.
            </span>
          </p>
        </More>
      </div>
    </WidgetFrame>
  );
}

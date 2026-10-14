"use client";
import { useState } from "react";
import { m } from "motion/react";
import { CloudLightning, CreditCard, Repeat, TimerOff, Webhook } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useBoxWidth } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- rules (pure, tested)

export type PayStatus = "created" | "processing" | "unknown" | "succeeded" | "failed";

/** Legal moves. A PSP timeout makes a payment unknown (the card may have been charged), never failed. */
export const NEXT: Record<PayStatus, readonly PayStatus[]> = {
  created: ["processing"],
  processing: ["succeeded", "failed", "unknown"],
  unknown: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
};
export const canMove = (from: PayStatus, to: PayStatus) => NEXT[from].includes(to);

export interface StoredResponse {
  code: number;
  payId: string;
}
export interface IdemRow {
  hash: string;
  state: "started" | "done";
  response?: StoredResponse;
}
export type IdemResult = { kind: "new" } | { kind: "replay"; response: StoredResponse } | { kind: "in_flight" } | { kind: "mismatch" };

/** Same rules as INSERT … ON CONFLICT DO NOTHING on the key, then reading the row it collided with. */
export function idemCheck(rows: Record<string, IdemRow>, key: string, hash: string): { rows: Record<string, IdemRow>; result: IdemResult } {
  const row = rows[key];
  if (!row) return { rows: { ...rows, [key]: { hash, state: "started" } }, result: { kind: "new" } };
  if (row.hash !== hash) return { rows, result: { kind: "mismatch" } }; // 422
  if (row.state === "done" && row.response) return { rows, result: { kind: "replay", response: row.response } };
  return { rows, result: { kind: "in_flight" } }; // 409
}
export function idemFinish(rows: Record<string, IdemRow>, key: string, response: StoredResponse): Record<string, IdemRow> {
  const row = rows[key];
  return row ? { ...rows, [key]: { ...row, state: "done", response } } : rows;
}

export type Account = "Cash at PSP" | "Merchant payable";
/** One ledger transaction. Amounts in cents: positive = debit, negative = credit. */
export interface Posting {
  id: string;
  payId: string;
  evt: string;
  lines: { account: Account; amount: number }[];
}
export const capturePosting = (id: string, payId: string, evt: string, cents: number): Posting => ({
  id,
  payId,
  evt,
  lines: [
    { account: "Cash at PSP", amount: cents },
    { account: "Merchant payable", amount: -cents },
  ],
});
export const postingSum = (p: Posting) => p.lines.reduce((s, l) => s + l.amount, 0);
export const balanceOf = (ledger: Posting[], account: Account) =>
  ledger.reduce((s, p) => s + p.lines.reduce((a, l) => a + (l.account === account ? l.amount : 0), 0), 0);

// ---------------------------------------------------------------- simulation (pure, tested)

export const KEY = "k1";
export const AMOUNT = 5000; // $50.00 in cents
export const WALLET = 20000;
const HASH = "order=1&amount=5000&currency=usd"; // stands in for SHA-256 of the request body
export const TIMEOUT_MS = 2000; // the payment service gives up waiting for the PSP
export const WEBHOOK_DELAY = 3000; // the PSP sends its webhook this long after charging
export const REDELIVER_GAP = 1500;
const COIN_MS = 1300;
const TAP_MS = 600;
const FLASH_MS = 1600;
const HIT_MS = 400;

export type NodeId = "customer" | "api" | "keys" | "svc" | "psp";
export type Tone = "req" | "ok" | "warn" | "bad" | "hook";
export type Msg =
  | { k: "pay"; retry: boolean }
  | { k: "check"; retry: boolean }
  | { k: "checked"; result: IdemResult }
  | { k: "create" }
  | { k: "charge"; payId: string; pspKey: string }
  | { k: "charged"; payId: string }
  | { k: "accepted"; payId: string }
  | { k: "resp"; code: number; payId?: string; replayed?: boolean }
  | { k: "webhook"; evt: string; payId: string };
export type TimerMsg = { k: "timeout"; payId: string } | { k: "sendWebhook"; evt: string; payId: string; again: boolean } | { k: "retry" };

export interface Packet {
  id: number;
  from: NodeId;
  to: NodeId;
  hook?: boolean;
  label: string;
  tone: Tone;
  start: number;
  dur: number;
  msg: Msg | null; // null: a reply that is lost on the way
  lostAt?: number;
}
export interface Timer {
  id: number;
  at: number;
  msg: TimerMsg;
}
export interface Payment {
  id: string;
  status: PayStatus;
  history: PayStatus[];
}
export interface Charge {
  id: string;
  payId: string;
  at: number;
}
export interface LogLine {
  t: number;
  text: string;
  tone: "info" | "ok" | "warn" | "bad";
}
export interface Flash {
  node: "api" | "svc";
  at: number;
  text: string;
  tone: "ok" | "warn" | "bad";
}

export interface Sim {
  t: number;
  seed: number;
  n: number;
  keysOn: boolean;
  dedupeOn: boolean;
  armTimeout: boolean;
  armDupHook: boolean;
  retryOnPending: boolean;
  started: boolean;
  screen: "paying" | "pending" | "busy" | "error";
  clientPay: string | null;
  idem: Record<string, IdemRow>;
  payments: Payment[];
  charges: Charge[];
  pspKeys: Record<string, string>; // the PSP's own idempotency: our key → its charge
  pspCalls: number;
  seenEvents: string[];
  sentEvents: { evt: string; payId: string }[];
  nextEvt: number;
  ledger: Posting[];
  waiting: Record<string, number>; // payId → when the payment service gives up on the PSP
  packets: Packet[];
  timers: Timer[];
  taps: number[];
  coins: number[];
  flashes: Flash[];
  hits: Partial<Record<NodeId | "ledger", number>>;
  log: LogLine[];
  visualUntil: number;
}

export const INTRO = "Press Pay $50 for the happy path, or Play the bad day: a PSP timeout, an impatient second tap and a duplicate webhook.";

export function initSim({ keysOn = true, dedupeOn = true, seed = 1 }: { keysOn?: boolean; dedupeOn?: boolean; seed?: number } = {}): Sim {
  return {
    t: 0, seed, n: 0, keysOn, dedupeOn,
    armTimeout: false, armDupHook: false, retryOnPending: false,
    started: false, screen: "paying", clientPay: null,
    idem: {}, payments: [], charges: [], pspKeys: {}, pspCalls: 0,
    seenEvents: [], sentEvents: [], nextEvt: 9, ledger: [], waiting: {},
    packets: [], timers: [], taps: [], coins: [], flashes: [], hits: {},
    log: [], visualUntil: 0,
  };
}

const clone = (s: Sim): Sim => JSON.parse(JSON.stringify(s));
const fmt = (cents: number) => `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;

function hopMs(from: NodeId, to: NodeId, hook?: boolean) {
  if (hook) return 900;
  const pair = [from, to];
  if (pair.includes("customer") || pair.includes("psp")) return 700;
  if (pair.includes("keys")) return 400;
  return 600;
}
function send(d: Sim, from: NodeId, to: NodeId, label: string, tone: Tone, msg: Msg | null, opts: { hook?: boolean; lostAt?: number } = {}) {
  d.n++;
  const jitter = 0.9 + 0.2 * mulberry32(d.seed * 100003 + d.n)();
  d.packets.push({ id: d.n, from, to, label, tone, start: d.t, dur: Math.round(hopMs(from, to, opts.hook) * jitter), msg, ...opts });
}
function later(d: Sim, ms: number, msg: TimerMsg) {
  d.n++;
  d.timers.push({ id: d.n, at: d.t + ms, msg });
}
function say(d: Sim, text: string, tone: LogLine["tone"] = "info") {
  d.log = [{ t: d.t, text, tone }, ...d.log].slice(0, 12);
}
function flash(d: Sim, node: Flash["node"], text: string, tone: Flash["tone"]) {
  d.flashes = [...d.flashes.filter((f) => d.t - f.at < FLASH_MS), { node, at: d.t, text, tone }];
  d.visualUntil = Math.max(d.visualUntil, d.t + FLASH_MS);
}
function move(p: Payment, to: PayStatus) {
  if (!canMove(p.status, to)) return false;
  p.status = to;
  p.history.push(to);
  return true;
}
const findPay = (d: Sim, id: string) => d.payments.find((p) => p.id === id)!;

function startPay(d: Sim, retry: boolean) {
  d.started = true;
  d.taps.push(d.t);
  d.visualUntil = Math.max(d.visualUntil, d.t + TAP_MS);
  send(d, "customer", "api", `${retry ? "↻ " : ""}POST /payments ${d.keysOn ? `key=${KEY}` : "(no key)"}`, "req", { k: "pay", retry });
  if (!retry)
    say(d, d.keysOn ? `The customer taps Pay $50. The app sends POST /payments with Idempotency-Key ${KEY}, generated for this checkout.` : "The customer taps Pay $50. The app sends POST /payments with no idempotency key.");
  else
    say(
      d,
      d.keysOn ? `The customer taps Pay again. The app resends the same request with the same key, ${KEY}.` : "The customer taps Pay again. With no key, the retry looks exactly like a brand-new payment.",
      d.keysOn ? "info" : "warn",
    );
}

function deliver(d: Sim, msg: Msg, at: NodeId) {
  d.hits[at] = d.t;
  d.visualUntil = Math.max(d.visualUntil, d.t + HIT_MS);
  switch (msg.k) {
    case "pay":
      if (d.keysOn) send(d, "api", "keys", `check ${KEY}`, "req", { k: "check", retry: msg.retry });
      else send(d, "api", "svc", "create payment", "req", { k: "create" });
      break;
    case "check": {
      const { rows, result } = idemCheck(d.idem, KEY, HASH);
      d.idem = rows;
      if (result.kind === "new") {
        send(d, "keys", "api", "new: claimed", "ok", { k: "checked", result });
        say(d, `${KEY} is new: the API claims it in the idempotency store (status started).`);
      } else if (result.kind === "replay") {
        send(d, "keys", "api", `seen: ${result.response.code}`, "ok", { k: "checked", result });
      } else send(d, "keys", "api", result.kind === "in_flight" ? "seen: in flight" : "body differs", "warn", { k: "checked", result });
      break;
    }
    case "checked": {
      const r = msg.result;
      if (r.kind === "new") send(d, "api", "svc", "create payment", "req", { k: "create" });
      else if (r.kind === "replay") {
        send(d, "api", "customer", `${r.response.code} ${r.response.payId} (replay)`, "ok", { k: "resp", code: r.response.code, payId: r.response.payId, replayed: true });
        flash(d, "api", `replayed ${r.response.code}`, "ok");
        say(d, `${KEY} is already done, so the API replays the stored ${r.response.code} for ${r.response.payId}. The PSP is not called again.`, "ok");
      } else if (r.kind === "in_flight") {
        send(d, "api", "customer", "409 in flight", "warn", { k: "resp", code: 409 });
        flash(d, "api", "409: in flight", "warn");
        say(d, `${KEY} is still in flight: the API answers 409 Conflict instead of charging again.`, "ok");
      } else {
        send(d, "api", "customer", "422 key reused", "bad", { k: "resp", code: 422 });
        say(d, `${KEY} was sent with a different body: 422, because a key belongs to one request.`, "warn");
      }
      break;
    }
    case "create": {
      const id = `pay_${d.payments.length + 1}`;
      const pay: Payment = { id, status: "created", history: ["created"] };
      move(pay, "processing");
      d.payments.push(pay);
      // With keys on, our key travels to the PSP; with keys off, every attempt gets a fresh PSP key.
      const pspKey = d.keysOn ? KEY : id;
      d.waiting[id] = d.t + TIMEOUT_MS;
      later(d, TIMEOUT_MS, { k: "timeout", payId: id });
      send(d, "svc", "psp", `charge $50 key=${pspKey}`, "req", { k: "charge", payId: id, pspKey });
      if (d.payments.length > 1) say(d, `No key, so the API can't tell it's a retry: it creates a second payment, ${id}, for the same order.`, "bad");
      else say(d, `${id} is created and marked processing before the PSP is called.`);
      break;
    }
    case "charge": {
      d.pspCalls++;
      const known = d.pspKeys[msg.pspKey];
      if (known) say(d, `The PSP has seen key ${msg.pspKey} before and returns ${known} instead of charging again.`, "ok");
      else {
        const chargeId = `ch_${d.charges.length + 1}`;
        d.pspKeys[msg.pspKey] = chargeId;
        d.charges.push({ id: chargeId, payId: msg.payId, at: d.t });
        d.coins.push(d.t);
        d.visualUntil = Math.max(d.visualUntil, d.t + COIN_MS);
        later(d, WEBHOOK_DELAY, { k: "sendWebhook", evt: `evt_${d.nextEvt++}`, payId: msg.payId, again: false });
        if (d.charges.length > 1)
          say(d, `The PSP charges the card again (${chargeId}). Double charge: the customer has paid ${fmt(d.charges.length * AMOUNT)} for one $50 order.`, "bad");
        else say(d, `The PSP charges the card $50 (${chargeId}). The coin moves from the customer's wallet to the merchant.`);
      }
      if (d.armTimeout) {
        d.armTimeout = false;
        send(d, "psp", "svc", "200 OK", "ok", null, { lostAt: 0.45 });
        say(d, "The PSP did the work, but its reply is lost on the way back. The payment service is still waiting.", "warn");
      } else send(d, "psp", "svc", "200 OK accepted", "ok", { k: "charged", payId: msg.payId });
      break;
    }
    case "charged":
      if (!(msg.payId in d.waiting)) break; // the timeout already answered the client
      delete d.waiting[msg.payId];
      d.timers = d.timers.filter((tm) => !(tm.msg.k === "timeout" && tm.msg.payId === msg.payId));
      send(d, "svc", "api", "processing", "ok", { k: "accepted", payId: msg.payId });
      say(d, `The PSP accepted the charge. ${msg.payId} stays processing until the webhook confirms it.`);
      break;
    case "accepted": {
      const response = { code: 202, payId: msg.payId };
      if (d.keysOn) d.idem = idemFinish(d.idem, KEY, response);
      send(d, "api", "customer", `202 ${msg.payId}`, "ok", { k: "resp", ...response });
      say(d, d.keysOn ? `The API stores "202 ${msg.payId}" under ${KEY}, then returns it.` : `The API returns 202 for ${msg.payId}.`);
      break;
    }
    case "resp":
      if (msg.code === 202 && msg.payId) {
        d.clientPay = msg.payId;
        d.screen = "pending";
        if (d.retryOnPending) {
          d.retryOnPending = false;
          later(d, 500, { k: "retry" });
        }
        if (!msg.replayed) say(d, `The app shows ${findPay(d, msg.payId).status === "succeeded" ? "Paid" : "Pending"} and polls GET /payments/${msg.payId}.`);
      } else if (msg.code === 409) {
        if (d.screen !== "pending") d.screen = "busy";
        say(d, "The app gets 409 and keeps waiting for the first request's answer.");
      } else d.screen = "error";
      break;
    case "webhook": {
      const pay = findPay(d, msg.payId);
      if (d.dedupeOn) {
        if (d.seenEvents.includes(msg.evt)) {
          flash(d, "svc", `${msg.evt}: duplicate ✓`, "ok");
          say(d, `${msg.evt} was already processed: ignored, with a 200 so the PSP stops retrying. ${pay.id} still has one ledger posting.`, "ok");
          break;
        }
        d.seenEvents.push(msg.evt);
        const from = pay.status;
        if (move(pay, "succeeded")) {
          post(d, pay.id, msg.evt);
          say(d, `${msg.evt} is verified and recorded. ${pay.id} moves ${from} → succeeded, and its capture is posted to the ledger in the same transaction.`, "ok");
        } else say(d, `${msg.evt} is new, but ${pay.id} is already ${pay.status}: not a legal move, so nothing is posted.`);
      } else {
        const before = d.ledger.some((p) => p.payId === pay.id);
        if (pay.status !== "succeeded") {
          pay.status = "succeeded"; // the naive handler doesn't check the state machine either
          pay.history.push("succeeded");
        }
        post(d, pay.id, msg.evt);
        if (before) {
          flash(d, "svc", "posted twice ✕", "bad");
          say(d, `Dedupe is off: ${msg.evt} ran again and posted the capture a second time. The customer paid once, but the ledger says the merchant is owed ${fmt(-balanceOf(d.ledger, "Merchant payable"))}.`, "bad");
        } else say(d, `Dedupe is off: the handler marks ${pay.id} succeeded and posts the capture without recording ${msg.evt}.`);
      }
      break;
    }
  }
}

/** Once nothing is in flight, say what the day added up to. */
function summarize(d: Sim) {
  const n = d.charges.length;
  if (!d.started || n === 0) return;
  const cash = balanceOf(d.ledger, "Cash at PSP");
  const dupPosted = cash !== n * AMOUNT;
  if (n === 1 && !dupPosted) say(d, "Settled: one charge, one balanced posting, and the ledger matches the PSP's report. Exactly-once effect.", "ok");
  else if (n === 1)
    say(d, `Settled: one charge but ${d.ledger.length} postings. Each posting balances, yet the ledger says the PSP holds ${fmt(cash)} and its report says ${fmt(AMOUNT)}: reconciliation flags it.`, "bad");
  else
    say(
      d,
      `Settled: the customer paid ${n}× for one order.${dupPosted ? ` On top of that a duplicate webhook was posted, so the ledger says ${fmt(cash)} against the PSP's ${fmt(n * AMOUNT)}.` : " The ledger matches the PSP because the money really moved twice."} Now it needs a refund.`,
      "bad",
    );
}

function post(d: Sim, payId: string, evt: string) {
  d.ledger.push(capturePosting(`tx_${d.ledger.length + 1}`, payId, evt, AMOUNT));
  d.hits.ledger = d.t;
}

function fire(d: Sim, msg: TimerMsg) {
  if (msg.k === "timeout") {
    if (!(msg.payId in d.waiting)) return;
    delete d.waiting[msg.payId];
    move(findPay(d, msg.payId), "unknown");
    flash(d, "svc", "⏱ PSP timeout", "bad");
    send(d, "svc", "api", "unknown ⏱", "warn", { k: "accepted", payId: msg.payId });
    say(d, `No reply from the PSP after ${TIMEOUT_MS / 1000} s. The card may have been charged, so ${msg.payId} becomes unknown, not failed.`, "warn");
  } else if (msg.k === "sendWebhook") {
    send(d, "psp", "svc", `webhook ${msg.evt}${msg.again ? " again" : ""}`, "hook", { k: "webhook", evt: msg.evt, payId: msg.payId }, { hook: true });
    if (!msg.again) d.sentEvents.push({ evt: msg.evt, payId: msg.payId });
    if (!msg.again && d.armDupHook) {
      d.armDupHook = false;
      later(d, REDELIVER_GAP, { ...msg, again: true });
    }
    say(d, msg.again ? `The PSP delivers ${msg.evt} again: webhooks are at-least-once.` : `The PSP sends webhook ${msg.evt}: charge succeeded for ${msg.payId}.`, msg.again ? "warn" : "info");
  } else if (d.started) startPay(d, true);
}

export type Action = "pay" | "retry" | "armTimeout" | "dupWebhook" | "badDay" | "reset" | { keys: boolean } | { dedupe: boolean };

export function act(s: Sim, a: Action): Sim {
  if (typeof a === "object") {
    const d = clone(s);
    if ("keys" in a) {
      d.keysOn = a.keys;
      say(d, a.keys ? "Idempotency keys on: a retry carries the same key and gets the stored answer." : "Idempotency keys off: the API can't tell a retry from a new payment.", a.keys ? "ok" : "warn");
    } else {
      d.dedupeOn = a.dedupe;
      say(d, a.dedupe ? "Webhook dedupe on: each event id is recorded once, and moves only go forward." : "Webhook dedupe off: the handler trusts every delivery.", a.dedupe ? "ok" : "warn");
    }
    return d;
  }
  const fresh = () => ({ ...initSim({ keysOn: s.keysOn, dedupeOn: s.dedupeOn, seed: s.seed }), armTimeout: s.armTimeout, armDupHook: s.armDupHook });
  switch (a) {
    case "reset":
      return initSim({ keysOn: s.keysOn, dedupeOn: s.dedupeOn, seed: s.seed });
    case "pay": {
      const d = fresh();
      startPay(d, false);
      return d;
    }
    case "badDay": {
      const d = { ...fresh(), armTimeout: true, armDupHook: true, retryOnPending: true };
      say(d, "The bad day: the PSP's reply will be lost, the customer will tap again, and the webhook will arrive twice.", "warn");
      startPay(d, false);
      return d;
    }
    case "retry": {
      const d = clone(s);
      if (d.started) startPay(d, true);
      else say(d, "Nothing to retry yet: press Pay $50 first.");
      return d;
    }
    case "armTimeout": {
      const d = clone(s);
      d.armTimeout = !d.armTimeout;
      say(d, d.armTimeout ? "Armed: the PSP will do the next charge, but its reply will be lost." : "Timeout disarmed.", "warn");
      return d;
    }
    case "dupWebhook": {
      const d = clone(s);
      const pending = d.timers.some((tm) => tm.msg.k === "sendWebhook") || d.packets.some((p) => p.msg?.k === "webhook");
      const last = d.sentEvents.at(-1);
      if (!pending && last) later(d, 0, { k: "sendWebhook", evt: last.evt, payId: last.payId, again: true });
      else {
        d.armDupHook = !d.armDupHook;
        say(d, d.armDupHook ? "Armed: the PSP will deliver the next webhook twice." : "Duplicate webhook disarmed.", "warn");
      }
      return d;
    }
  }
}

export interface NextEvent {
  at: number;
  kind: "packet" | "timer";
  id: number;
}
export function nextEvent(s: Sim): NextEvent | null {
  let best: NextEvent | null = null;
  const better = (e: NextEvent) => !best || e.at < best.at || (e.at === best.at && e.id < best.id);
  for (const p of s.packets) {
    const e: NextEvent = { at: p.start + p.dur, kind: "packet", id: p.id };
    if (better(e)) best = e;
  }
  for (const tm of s.timers) {
    const e: NextEvent = { at: tm.at, kind: "timer", id: tm.id };
    if (better(e)) best = e;
  }
  return best;
}
export const isIdle = (s: Sim) => s.packets.length === 0 && s.timers.length === 0 && s.t >= s.visualUntil;

/** Advance the clock by dt ms, delivering every message and timer that falls due, in order. */
export function step(s: Sim, dt: number): Sim {
  if (isIdle(s)) return s; // same object: React skips the render
  const target = s.t + dt;
  let d: Sim | null = null;
  for (let guard = 0; guard < 500; guard++) {
    const ev = nextEvent(d ?? s);
    if (!ev || ev.at > target) break;
    d ??= clone(s);
    d.t = Math.max(d.t, ev.at);
    if (ev.kind === "packet") {
      const p = d.packets.find((x) => x.id === ev.id)!;
      d.packets = d.packets.filter((x) => x.id !== ev.id);
      if (p.msg) deliver(d, p.msg, p.to);
    } else {
      const tm = d.timers.find((x) => x.id === ev.id)!;
      d.timers = d.timers.filter((x) => x.id !== ev.id);
      fire(d, tm.msg);
    }
  }
  if (d && d.packets.length === 0 && d.timers.length === 0) summarize(d);
  return { ...(d ?? s), t: target };
}
export function stepToNext(s: Sim): Sim {
  const ev = nextEvent(s);
  if (ev) return step(s, Math.max(0, ev.at - s.t));
  return s.t < s.visualUntil ? { ...s, t: s.visualUntil } : s;
}
export function runUntilIdle(s: Sim, maxEvents = 1000): Sim {
  let x = s;
  for (let i = 0; i < maxEvents && nextEvent(x); i++) x = stepToNext(x);
  return x;
}

// ---------------------------------------------------------------- picture

type Pt = { x: number; y: number };
type Anchor = "start" | "middle" | "end";
interface Rect {
  x: number;
  y: number;
  w: number;
}
/**
 * Two drawings of the same system. Landscape (the desktop pane): phone → API → payment service → PSP left to right,
 * the idempotency store and the ledger under their services, webhooks looping back over the top and the coin flying
 * from the customer's wallet to the merchant across the top. Portrait (a phone): the same chain top to bottom.
 */
interface PayLayout {
  wide: boolean;
  W: number;
  H: number;
  phone: Pt;
  wallet: Pt & { label: Pt; anchor: Anchor };
  merchant: Pt & { label: Pt; anchor: Anchor };
  badge: Pt;
  api: Rect;
  svc: Rect;
  psp: Pt; // roof apex
  pspText: Pt & { anchor: Anchor };
  keys: Pt & { caption: Pt; anchor: Anchor };
  ledger: Pt & { caption: Pt; anchor: Anchor };
  wires: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
  hook: Pt[];
  hookLabel: Pt & { rotate: number };
  seg: Record<string, Pt[]>;
  coin: [Pt, Pt, Pt];
}
const BOX_H = 40;
const WIDE: PayLayout = {
  wide: true,
  W: 640,
  H: 194,
  phone: { x: 14, y: 52 },
  wallet: { x: 14, y: 6, label: { x: 74, y: 0 }, anchor: "start" },
  merchant: { x: 566, y: 4, label: { x: 558, y: 0 }, anchor: "end" },
  badge: { x: 320, y: 14 },
  api: { x: 168, y: 75, w: 112 },
  svc: { x: 346, y: 75, w: 128 },
  psp: { x: 572, y: 66 },
  pspText: { x: 638, y: 150, anchor: "end" },
  keys: { x: 224, y: 160, caption: { x: 186, y: 164 }, anchor: "end" },
  ledger: { x: 404, y: 160, caption: { x: 409, y: 133 }, anchor: "start" },
  wires: [
    { x1: 74, y1: 95, x2: 168, y2: 95 },
    { x1: 280, y1: 95, x2: 346, y2: 95 },
    { x1: 474, y1: 95, x2: 520, y2: 95 },
    { x1: 224, y1: 115, x2: 224, y2: 143 },
    { x1: 404, y1: 115, x2: 404, y2: 143, dashed: true },
  ],
  hook: [{ x: 522, y: 134 }, { x: 522, y: 176 }, { x: 462, y: 176 }, { x: 462, y: 119 }],
  hookLabel: { x: 492, y: 190, rotate: 0 },
  seg: {
    "customer>api": [{ x: 76, y: 88 }, { x: 166, y: 88 }],
    "api>customer": [{ x: 166, y: 102 }, { x: 76, y: 102 }],
    "api>svc": [{ x: 282, y: 88 }, { x: 344, y: 88 }],
    "svc>api": [{ x: 344, y: 102 }, { x: 282, y: 102 }],
    "svc>psp": [{ x: 476, y: 88 }, { x: 528, y: 88 }],
    "psp>svc": [{ x: 528, y: 102 }, { x: 476, y: 102 }],
    "api>keys": [{ x: 216, y: 117 }, { x: 216, y: 143 }],
    "keys>api": [{ x: 232, y: 143 }, { x: 232, y: 117 }],
  },
  coin: [{ x: 40, y: 23 }, { x: 320, y: -10 }, { x: 594, y: 30 }],
};
const DOWN = 165; // portrait: requests travel down this lane
const UP = 185; // portrait: replies travel up this one
const TALL: PayLayout = {
  wide: false,
  W: 360,
  H: 436,
  phone: { x: 145, y: 18 },
  wallet: { x: 14, y: 44, label: { x: 40, y: 96 }, anchor: "middle" },
  merchant: { x: 290, y: 37, label: { x: 318, y: 96 }, anchor: "middle" },
  badge: { x: 175, y: 9 },
  api: { x: 115, y: 146, w: 120 },
  svc: { x: 115, y: 238, w: 120 },
  psp: { x: 175, y: 322 },
  pspText: { x: 175, y: 412, anchor: "middle" },
  keys: { x: 38, y: 166, caption: { x: 38, y: 202 }, anchor: "middle" },
  ledger: { x: 38, y: 258, caption: { x: 90, y: 252 }, anchor: "middle" },
  wires: [
    { x1: 175, y1: 104, x2: 175, y2: 146 },
    { x1: 175, y1: 186, x2: 175, y2: 238 },
    { x1: 175, y1: 278, x2: 175, y2: 320 },
    { x1: 66, y1: 166, x2: 115, y2: 166 },
    { x1: 66, y1: 258, x2: 115, y2: 258, dashed: true },
  ],
  hook: [{ x: 234, y: 378 }, { x: 330, y: 378 }, { x: 330, y: 258 }, { x: 237, y: 258 }],
  hookLabel: { x: 346, y: 318, rotate: -90 },
  seg: {
    "customer>api": [{ x: DOWN, y: 106 }, { x: DOWN, y: 146 }],
    "api>customer": [{ x: UP, y: 146 }, { x: UP, y: 106 }],
    "api>svc": [{ x: DOWN, y: 186 }, { x: DOWN, y: 238 }],
    "svc>api": [{ x: UP, y: 238 }, { x: UP, y: 186 }],
    "svc>psp": [{ x: DOWN, y: 278 }, { x: DOWN, y: 325 }],
    "psp>svc": [{ x: UP, y: 325 }, { x: UP, y: 278 }],
    "api>keys": [{ x: 115, y: 160 }, { x: 66, y: 160 }],
    "keys>api": [{ x: 66, y: 172 }, { x: 115, y: 172 }],
  },
  coin: [{ x: 40, y: 52 }, { x: 179, y: -40 }, { x: 318, y: 52 }],
};

function along(pts: Pt[], f: number): Pt & { seg: number } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let left = Math.max(0, Math.min(1, f)) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, left / lens[i]) : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k, seg: i };
    }
    left -= lens[i];
  }
  return { ...pts[0], seg: 0 };
}

const TONE: Record<Tone, string> = { req: "var(--series-3)", ok: "var(--series-1)", warn: "var(--warning)", bad: "var(--critical)", hook: "var(--series-2)" };
const textW = (s: string, size = 11) => s.length * size * 0.56 + 10;
const ORDER: Record<NodeId, number> = { customer: 0, api: 1, keys: 1.5, svc: 2, psp: 3 };

/** Where a packet's label sits relative to the packet, so labels stay beside their lane. */
function labelAt(L: PayLayout, p: Packet, seg: number, w: number): [number, number] {
  const fwd = ORDER[p.to] > ORDER[p.from];
  if (L.wide) {
    if (p.hook) return seg === 1 ? [-w / 2, -26] : [10, -7.5];
    if (p.to === "keys") return [-w - 10, -7.5];
    if (p.from === "keys") return [10, -7.5];
    return fwd ? [-w / 2, -25] : [-w / 2, 10];
  }
  if (p.hook) return seg === 1 ? [-12 - w, -7.5] : [-w / 2, -24];
  if (p.to === "keys") return [-w / 2, -26];
  if (p.from === "keys") return [-w / 2, 10];
  return fwd ? [-14 - w, -7.5] : [14, -7.5];
}

function PacketG({ L, p, t, reduce }: { L: PayLayout; p: Packet; t: number; reduce: boolean }) {
  const f = Math.max(0, Math.min(1, (t - p.start) / p.dur));
  const lost = p.lostAt !== undefined && f > p.lostAt;
  if (lost && f > p.lostAt! + 0.3) return null;
  const pt = p.hook ? along(L.hook, f) : along(L.seg[`${p.from}>${p.to}`], lost ? p.lostAt! : f);
  const label = lost ? "✕ reply lost" : p.label;
  const w = textW(label);
  const [lx, ly] = labelAt(L, p, pt.seg, w);
  const color = lost ? TONE.bad : TONE[p.tone];
  const body = (
    <>
      {lost ? (
        <text textAnchor="middle" y={5} style={{ fontSize: 15, fontWeight: 800, fill: "var(--critical-ink)" }}>
          ✕
        </text>
      ) : (
        <>
          <rect x={-8} y={-5.5} width={16} height={11} rx={2} fill={color} stroke="var(--card)" strokeWidth={1.2} />
          <path d="M-8,-5 L0,1 L8,-5" fill="none" stroke="var(--card)" strokeWidth={1.1} />
        </>
      )}
      <rect x={lx} y={ly} width={w} height={16} rx={8} fill="var(--card)" stroke={color} strokeWidth={1.2} />
      <text x={lx + w / 2} y={ly + 11.8} textAnchor="middle" style={{ fontSize: 11, fontWeight: 650, fill: lost ? "var(--critical-ink)" : "var(--fg)" }}>
        {label}
      </text>
    </>
  );
  if (reduce) return <g transform={`translate(${pt.x} ${pt.y})`}>{body}</g>;
  return (
    <m.g initial={false} animate={{ x: pt.x, y: pt.y }} transition={{ duration: 0.06, ease: "linear" }}>
      {body}
    </m.g>
  );
}

function coinAt(L: PayLayout, f: number): Pt {
  const e = f < 0.5 ? 4 * f * f * f : 1 - (-2 * f + 2) ** 3 / 2; // ease in-out
  const [a, c, b] = L.coin;
  return { x: (1 - e) ** 2 * a.x + 2 * (1 - e) * e * c.x + e * e * b.x, y: (1 - e) ** 2 * a.y + 2 * (1 - e) * e * c.y + e * e * b.y };
}

function Drum({ x, y, title, sub, hit }: { x: number; y: number; title: string; sub: string; hit: boolean }) {
  const stroke = hit ? "var(--accent)" : "var(--k-database)";
  return (
    <g>
      <path d={`M${x - 30},${y - 17} v32 a30,7 0 0 0 60,0 v-32`} fill="var(--card-2)" stroke={stroke} strokeWidth={hit ? 2.4 : 1.6} />
      <ellipse cx={x} cy={y - 17} rx={30} ry={7} fill="var(--card)" stroke={stroke} strokeWidth={hit ? 2.4 : 1.6} />
      <text x={x} y={y + 2} textAnchor="middle" style={{ fontWeight: 700, fontSize: 11 }}>
        {title}
      </text>
      <text x={x} y={y + 14} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
        {sub}
      </text>
    </g>
  );
}

function Box({ r, title, sub, subTone, hit, stroke }: { r: Rect; title: string; sub: string; subTone?: Flash["tone"]; hit: boolean; stroke: string }) {
  const ink = subTone === "bad" ? "var(--critical-ink)" : subTone === "warn" ? "var(--warning-ink)" : subTone === "ok" ? "var(--good-ink)" : "var(--muted)";
  const cx = r.x + r.w / 2;
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={BOX_H} rx={9} fill="var(--card-2)" stroke={hit ? "var(--accent)" : stroke} strokeWidth={hit ? 2.6 : 1.6} />
      <text x={cx} y={r.y + 16} textAnchor="middle" style={{ fontWeight: 700 }}>
        {title}
      </text>
      <text x={cx} y={r.y + 31} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: subTone ? 650 : 400, fill: ink }}>
        {sub}
      </text>
    </g>
  );
}

const STATUS_INK: Record<PayStatus, string> = { created: "", processing: "", unknown: "warn-ink", succeeded: "ok-ink", failed: "bad-ink" };
const STATUS_WORD: Record<PayStatus, string> = { created: "created", processing: "processing", unknown: "? unknown", succeeded: "✓ succeeded", failed: "✕ failed" };

const ARMED = { borderColor: "var(--warning)", color: "var(--warning-ink)" };

function screenOf(s: Sim): { text: string; ink: string } {
  if (!s.started) return { text: "", ink: "" };
  const p = s.payments.find((x) => x.id === s.clientPay);
  if (p?.status === "succeeded") return { text: "Paid ✓", ink: "var(--good-ink)" };
  if (s.screen === "pending") return { text: "Pending…", ink: "var(--warning-ink)" };
  if (s.screen === "busy") return { text: "409: wait", ink: "var(--warning-ink)" };
  if (s.screen === "error") return { text: "Error", ink: "var(--critical-ink)" };
  return { text: "Paying…", ink: "var(--muted)" };
}

const CSS = `
.pay-seg { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); min-width: 0; max-width: 100%; }
.pay-seg .seg { min-width: 0; flex: 0 1 auto; }
.pay-seg .seg button { padding: 4px 10px; }
@container (max-width: 420px) { .pay-seg { flex-direction: column; align-items: flex-start; gap: 2px; } }
.pay-facts { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; margin-top: 6px; font-size: 13px; line-height: 1.5; }
.pay-facts .pill { font-variant-numeric: tabular-nums; }
.pay-ledger { font-size: 13px; line-height: 1.45; }
`;

export function PaymentFlowSim() {
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [running, setRunning] = useState(true);
  const [s, reset] = useFixedStep<Sim>(() => initSim(), step, running && inView && !reduce);
  const width = useBoxWidth(ref);
  const L = width && width < 520 ? TALL : WIDE;
  const t = s.t;
  const go = (a: Action, run = false) => {
    reset(act(s, a));
    if (run) setRunning(true);
  };

  const recent = (at: number | undefined, ms = HIT_MS) => at !== undefined && t - at >= 0 && t - at < ms;
  const flashFor = (node: Flash["node"]) => s.flashes.filter((f) => f.node === node && t - f.at >= 0 && t - f.at < FLASH_MS).at(-1);
  const waits = Object.entries(s.waiting).sort((a, b) => a[1] - b[1]);
  const lastPay = s.payments.at(-1);
  const svcFlash = flashFor("svc");
  const apiFlash = flashFor("api");
  const svcSub = svcFlash
    ? { text: svcFlash.text, tone: svcFlash.tone }
    : waits.length
      ? { text: `waiting for PSP ${Math.max(0, (waits[0][1] - t) / 1000).toFixed(1)} s`, tone: "warn" as const }
      : { text: lastPay ? `${lastPay.id}: ${lastPay.status}` : "idle", tone: undefined };
  const row = s.idem[KEY];
  const keysSub = !s.keysOn ? "off" : !row ? "empty" : row.state === "done" ? `${KEY} → ${row.response?.code}` : `${KEY}: started`;
  const hookTimer = s.timers.filter((tm) => tm.msg.k === "sendWebhook").sort((a, b) => a.at - b.at)[0];
  const coinsLeft = s.coins.filter((c) => t >= c).length;
  const coinsLanded = s.coins.filter((c) => t >= c + COIN_MS).length;
  const screen = screenOf(s);
  const charged = s.charges.length;
  const merchantOwed = -balanceOf(s.ledger, "Merchant payable");
  const cashAtPsp = balanceOf(s.ledger, "Cash at PSP");
  const balanced = s.ledger.every((p) => postingSum(p) === 0);
  const settled = s.started && s.packets.length === 0 && s.timers.length === 0;
  const matches = cashAtPsp === charged * AMOUNT;

  const said = useThrottled<LogLine | null>(s.log[0] ?? null, 700);
  const { phone: ph, wallet: wl, merchant: mc, psp } = L;

  return (
    <WidgetFrame title="Payment flow: exactly-once on a bad day" sub="One $50 checkout: a timeout, a second tap, a duplicate webhook.">
      <style href="w-payment-flow" precedence="widgets">
        {CSS}
      </style>
      <div className="controls">
        <button type="button" className="wbtn primary" onClick={() => go("pay", true)}>
          <CreditCard size={14} aria-hidden /> Pay $50
        </button>
        <button type="button" className="wbtn" onClick={() => go("badDay", true)}>
          <CloudLightning size={14} aria-hidden /> Play the bad day
        </button>
        <SimButtons
          running={running && !reduce}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(stepToNext(s))}
          stepHint="Jump to the next message"
          onReset={() => go("reset")}
        />
      </div>
      <div className="controls" style={{ marginTop: 0, alignItems: "center" }}>
        <Seg<"on" | "off"> labelMode="inline" className="pay-seg" label="Idempotency keys" value={s.keysOn ? "on" : "off"} onChange={(v) => go({ keys: v === "on" })} options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />
        <Seg<"on" | "off"> labelMode="inline" className="pay-seg" label="Webhook dedupe" value={s.dedupeOn ? "on" : "off"} onChange={(v) => go({ dedupe: v === "on" })} options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} />
      </div>

      <div ref={ref}>
        <svg
          viewBox={`0 0 ${L.W} ${L.H}`}
          className="sim-svg"
          style={{ maxWidth: L.wide ? 640 : 420, margin: "0 auto" }}
          role="img"
          aria-label={`Payment flow. Customer charged ${charged} time${charged === 1 ? "" : "s"}. ${s.payments.map((p) => `${p.id} ${p.status}`).join(", ") || "No payment yet"}. ${s.ledger.length} ledger posting${s.ledger.length === 1 ? "" : "s"}. ${s.packets.length} message${s.packets.length === 1 ? "" : "s"} in flight.`}
        >
          {/* wires */}
          <g stroke="var(--border-strong)" strokeWidth={1.4}>
            {L.wires.map((w, i) => (
              <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} strokeDasharray={w.dashed ? "4 3" : undefined} />
            ))}
          </g>
          <path d={`M${L.hook.map((p) => `${p.x},${p.y}`).join(" L")}`} fill="none" stroke="var(--series-2)" strokeWidth={1.6} strokeDasharray="5 4" />
          {L.wide ? (
            <polygon points={`${L.hook[3].x},${L.hook[3].y - 2} ${L.hook[3].x - 5},${L.hook[3].y + 7} ${L.hook[3].x + 5},${L.hook[3].y + 7}`} fill="var(--series-2)" />
          ) : (
            <polygon points={`${L.hook[3].x},${L.hook[3].y} ${L.hook[3].x + 9},${L.hook[3].y - 5} ${L.hook[3].x + 9},${L.hook[3].y + 5}`} fill="var(--series-2)" />
          )}
          <text transform={`translate(${L.hookLabel.x} ${L.hookLabel.y}) rotate(${L.hookLabel.rotate})`} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 650, fill: "var(--warning-ink)" }}>
            webhooks
          </text>
          <text x={L.ledger.caption.x} y={L.ledger.caption.y} textAnchor={L.ledger.anchor} className="muted-text" style={{ fontSize: 9 }}>
            posts
          </text>

          {/* customer, phone, merchant */}
          <g>
            <rect x={wl.x} y={wl.y} width={52} height={34} rx={6} fill="var(--card-2)" stroke="var(--series-2)" strokeWidth={1.6} />
            <rect x={wl.x + 32} y={wl.y + 9} width={20} height={15} rx={4} fill="var(--card)" stroke="var(--series-2)" strokeWidth={1.4} />
            <circle cx={wl.x + 40} cy={wl.y + 16.5} r={2.3} fill="var(--series-2)" />
            <text x={wl.x + 16} y={wl.y + 22} textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fill: "var(--warning-ink)" }}>
              $
            </text>
            <text x={wl.label.x} y={L.wide ? wl.y + 14 : wl.label.y} textAnchor={wl.anchor} style={{ fontWeight: 700 }}>
              Customer
            </text>
            <text x={wl.label.x} y={L.wide ? wl.y + 29 : wl.label.y + 14} textAnchor={wl.anchor} className="muted-text">
              {fmt(WALLET - coinsLeft * AMOUNT)}
            </text>
          </g>
          <g>
            <rect x={ph.x} y={ph.y} width={60} height={86} rx={10} fill="var(--fg)" />
            <rect x={ph.x + 4} y={ph.y + 8} width={52} height={68} rx={4} fill="var(--card)" />
            <rect x={ph.x + 23} y={ph.y + 3} width={14} height={2.5} rx={1.2} fill="var(--card-2)" />
            <circle cx={ph.x + 30} cy={ph.y + 81} r={2.2} fill="var(--card-2)" />
            <text x={ph.x + 30} y={ph.y + 22} textAnchor="middle" className="muted-text" style={{ fontSize: 8.5 }}>
              Order #1
            </text>
            <text x={ph.x + 30} y={ph.y + 38} textAnchor="middle" style={{ fontSize: 12, fontWeight: 750 }}>
              $50.00
            </text>
            {s.started ? (
              <text x={ph.x + 30} y={ph.y + 61} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 750, fill: screen.ink }}>
                {screen.text}
              </text>
            ) : (
              <g>
                <rect x={ph.x + 8} y={ph.y + 49} width={44} height={17} rx={4} fill="var(--accent)" />
                <text x={ph.x + 30} y={ph.y + 61} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "var(--accent-ink)" }}>
                  Pay $50
                </text>
              </g>
            )}
            {!reduce &&
              s.taps
                .filter((at) => t - at >= 0 && t - at < TAP_MS)
                .map((at) => {
                  const f = (t - at) / TAP_MS;
                  return <circle key={at} cx={ph.x + 30} cy={ph.y + 57} r={6 + 22 * f} fill="none" stroke="var(--accent)" strokeWidth={2} opacity={1 - f} />;
                })}
          </g>
          <g>
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={mc.x + i * 11.2} y={mc.y} width={11.2} height={12} fill={i % 2 ? "var(--card)" : "var(--series-1)"} stroke="var(--series-1)" strokeWidth={0.8} />
            ))}
            <rect x={mc.x + 3} y={mc.y + 12} width={50} height={31} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={1.3} />
            <rect x={mc.x + 7} y={mc.y + 18} width={12} height={10} fill="var(--card)" stroke="var(--border-strong)" />
            <rect x={mc.x + 24} y={mc.y + 23} width={11} height={20} fill="var(--border)" />
            <text x={mc.label.x} y={L.wide ? mc.y + 20 : mc.label.y} textAnchor={mc.anchor} style={{ fontWeight: 700 }}>
              Merchant
            </text>
            <text x={mc.label.x} y={L.wide ? mc.y + 35 : mc.label.y + 14} textAnchor={mc.anchor} className="muted-text">
              +{fmt(coinsLanded * AMOUNT)}
            </text>
          </g>
          {charged > 1 && (
            <g>
              <rect x={L.badge.x - 51} y={L.badge.y - 9} width={102} height={18} rx={9} fill="var(--card)" stroke="var(--critical)" strokeWidth={1.4} />
              <text x={L.badge.x} y={L.badge.y + 4} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--critical-ink)" }}>
                ✕ charged {charged}×
              </text>
            </g>
          )}

          {/* API + idempotency store, payment service + ledger, PSP */}
          <Box r={L.api} title="API" sub={apiFlash?.text ?? "POST /payments"} subTone={apiFlash?.tone} hit={recent(s.hits.api)} stroke="var(--k-gateway)" />
          <Drum x={L.keys.x} y={L.keys.y} title="keys" sub={keysSub} hit={recent(s.hits.keys)} />
          <text x={L.keys.caption.x} y={L.keys.caption.y} textAnchor={L.keys.anchor} className="muted-text" style={{ fontSize: 9 }}>
            idempotency
          </text>
          <Box r={L.svc} title="Payment service" sub={svcSub.text} subTone={svcSub.tone} hit={recent(s.hits.svc)} stroke="var(--k-service)" />
          {waits.length > 0 && <rect x={L.svc.x} y={L.svc.y + BOX_H + 3} width={Math.max(0, (L.svc.w * (waits[0][1] - t)) / TIMEOUT_MS)} height={3} rx={1.5} fill="var(--warning)" />}
          <Drum x={L.ledger.x} y={L.ledger.y} title="ledger" sub={`${s.ledger.length} posting${s.ledger.length === 1 ? "" : "s"}`} hit={recent(s.hits.ledger, 700)} />
          <g>
            <path d={`M${psp.x - 57},${psp.y + 28} L${psp.x},${psp.y} L${psp.x + 57},${psp.y + 28} Z`} fill="var(--card-2)" stroke={recent(s.hits.psp) ? "var(--accent)" : "var(--k-external)"} strokeWidth={recent(s.hits.psp) ? 2.4 : 1.6} />
            <text x={psp.x} y={psp.y + 22} textAnchor="middle" style={{ fontWeight: 750 }}>
              PSP
            </text>
            <rect x={psp.x - 53} y={psp.y + 28} width={106} height={5} fill="var(--k-external)" />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={psp.x - 47 + i * 20} y={psp.y + 35} width={10} height={24} fill="var(--card-2)" stroke="var(--k-external)" strokeWidth={1.2} />
            ))}
            <rect x={psp.x - 59} y={psp.y + 60} width={118} height={7} rx={1.5} fill="var(--k-external)" />
            <text x={L.pspText.x} y={L.pspText.y} textAnchor={L.pspText.anchor} className="muted-text">
              {L.wide ? "" : "bank side · "}
              {s.pspCalls} call{s.pspCalls === 1 ? "" : "s"}, {charged} charge{charged === 1 ? "" : "s"}
            </text>
            {hookTimer && hookTimer.msg.k === "sendWebhook" && (
              <text x={L.pspText.x} y={L.pspText.y + 15} textAnchor={L.pspText.anchor} style={{ fontSize: 10.5, fill: "var(--warning-ink)" }}>
                webhook {L.wide ? "" : `${hookTimer.msg.evt} `}in {Math.max(0, (hookTimer.at - t) / 1000).toFixed(1)} s
              </text>
            )}
          </g>

          {/* traffic */}
          {s.packets.map((p) => (
            <PacketG key={p.id} L={L} p={p} t={t} reduce={reduce} />
          ))}
          {s.coins
            .filter((c) => t >= c && t < c + COIN_MS)
            .map((c) => {
              const pt = coinAt(L, (t - c) / COIN_MS);
              const coin = (
                <>
                  <circle r={9} fill="var(--k-database)" stroke="var(--card)" strokeWidth={1.6} />
                  <text y={4} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: "var(--card)" }}>
                    $
                  </text>
                </>
              );
              return reduce ? (
                <g key={c} transform={`translate(${pt.x} ${pt.y})`}>
                  {coin}
                </g>
              ) : (
                <m.g key={c} initial={false} animate={{ x: pt.x, y: pt.y }} transition={{ duration: 0.06, ease: "linear" }}>
                  {coin}
                </m.g>
              );
            })}
        </svg>
      </div>

      <div className="pay-facts">
        <span className={`pill ${charged > 1 ? "bad-ink" : charged === 1 ? "ok-ink" : ""}`}>
          Charged {charged}× {fmt(charged * AMOUNT)} {charged > 1 ? "✕ double charge" : charged === 1 ? "✓" : ""}
        </span>
        <span className={`pill ${balanced ? "" : "bad-ink"}`}>
          Ledger: {s.ledger.length} posting{s.ledger.length === 1 ? "" : "s"}, {balanced ? "✓ balanced" : "✕ unbalanced"}
        </span>
        {settled && <span className={`pill ${matches ? "ok-ink" : "bad-ink"}`}>{matches ? "✓ reconciles with PSP" : `✕ ledger ${fmt(cashAtPsp)} ≠ PSP ${fmt(charged * AMOUNT)}`}</span>}
        {s.payments.map((p) => (
          <span key={p.id}>
            <b>{p.id}</b>{" "}
            {p.history.map((st, i) => (
              <span key={i}>
                {i > 0 && <span className="muted"> → </span>}
                <span className={i === p.history.length - 1 ? STATUS_INK[st] : `muted ${STATUS_INK[st]}`} style={i === p.history.length - 1 ? { fontWeight: 650 } : undefined}>
                  {STATUS_WORD[st]}
                </span>
              </span>
            ))}
          </span>
        ))}
      </div>
      <p className="readout" aria-live="polite">
        {said?.tone === "bad" && (
          <span className="pill bad-ink" style={{ marginRight: 6 }}>
            ✕ problem
          </span>
        )}
        {said?.tone === "ok" && (
          <span className="pill ok-ink" style={{ marginRight: 6 }}>
            ✓ safe
          </span>
        )}{" "}
        {said?.text ?? INTRO}
        <ReducedNote reduce={reduce} what="Animation paused (reduced motion): use Step to jump from message to message." />
      </p>

      <More label="Inject one failure at a time">
        <div className="controls" role="group" aria-label="Inject a failure" style={{ margin: 0 }}>
          <button type="button" className="wbtn" aria-pressed={s.armTimeout} onClick={() => go("armTimeout")} style={s.armTimeout ? ARMED : undefined}>
            <TimerOff size={14} aria-hidden /> PSP times out on next call<span aria-hidden>{s.armTimeout ? " (armed)" : ""}</span>
          </button>
          <button type="button" className="wbtn" onClick={() => go("retry", true)}>
            <Repeat size={14} aria-hidden /> Customer taps Pay again (retry)
          </button>
          <button type="button" className="wbtn" aria-pressed={s.armDupHook} onClick={() => go("dupWebhook", true)} style={s.armDupHook ? ARMED : undefined}>
            <Webhook size={14} aria-hidden /> PSP sends the webhook twice<span aria-hidden>{s.armDupHook ? " (armed)" : ""}</span>
          </button>
        </div>
      </More>
      <More label="Ledger and history">
        <div className="pay-ledger" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
            <b>Ledger (append-only)</b>
            <span className={balanced ? "ok-ink" : "bad-ink"}>
              Σ every transaction = {fmt(s.ledger.reduce((a, p) => a + postingSum(p), 0))} {balanced ? "✓ balanced" : "✕ unbalanced"}
            </span>
          </div>
          {s.ledger.length === 0 && <p className="muted" style={{ margin: 0 }}>No entries yet. A capture is posted when a payment succeeds.</p>}
          <ol aria-label="Ledger transactions, newest first" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {[...s.ledger].reverse().map((p) => {
              const dup = s.ledger.filter((q) => q.payId === p.payId).length > 1;
              return (
                <li key={p.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.id} · {p.payId} captured ({p.evt}) {dup && <span className="bad-ink">· ✕ duplicate posting</span>}
                  </div>
                  {p.lines.map((l) => (
                    <div key={l.account} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontVariantNumeric: "tabular-nums" }}>
                      <span>
                        {l.amount > 0 ? "DR" : "CR"} {l.account}
                      </span>
                      <span>{fmt(Math.abs(l.amount))}</span>
                    </div>
                  ))}
                  <div className="ok-ink" style={{ fontSize: 12, textAlign: "right" }}>
                    Σ {fmt(postingSum(p))} ✓
                  </div>
                </li>
              );
            })}
          </ol>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, display: "grid", gap: 2 }}>
            <span>
              Merchant payable: {fmt(merchantOwed)} · PSP calls: {s.pspCalls}
            </span>
            {settled ? (
              <span className={matches ? "ok-ink" : "bad-ink"}>
                {matches
                  ? `✓ Reconciliation: ledger ${fmt(cashAtPsp)} matches the PSP's report (${charged} charge${charged === 1 ? "" : "s"}).`
                  : `✕ Reconciliation: the ledger says the PSP holds ${fmt(cashAtPsp)}, its report says ${fmt(charged * AMOUNT)}.`}
              </span>
            ) : (
              <span className="muted">Reconciliation runs once the traffic settles.</span>
            )}
          </div>
          <div>
            <b>What happened, newest first</b>
            <ol aria-label="What happened, newest first" style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5, display: "grid", gap: 3 }} className="muted">
              {s.log.length === 0 && <li>Nothing yet.</li>}
              {s.log.map((l) => (
                <li key={`${l.t}-${l.text}`}>{l.text}</li>
              ))}
            </ol>
          </div>
        </div>
      </More>
    </WidgetFrame>
  );
}

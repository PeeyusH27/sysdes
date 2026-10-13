import { describe, test, expect } from "vitest";
import {
  AMOUNT,
  KEY,
  TIMEOUT_MS,
  act,
  balanceOf,
  canMove,
  capturePosting,
  idemCheck,
  idemFinish,
  initSim,
  isIdle,
  postingSum,
  runUntilIdle,
  step,
  stepToNext,
  type Sim,
} from "../PaymentFlowSim";

const run = (s: Sim, ms: number) => {
  let x = s;
  for (let t = 0; t < ms; t += 50) x = step(x, 50);
  return x;
};
const statuses = (s: Sim) => s.payments.map((p) => p.history.join(" → "));

describe("happy path", () => {
  test("one PSP call, one charge, one balanced posting", () => {
    const s = runUntilIdle(act(initSim(), "pay"));
    expect(s.pspCalls).toBe(1);
    expect(s.charges).toHaveLength(1);
    expect(statuses(s)).toEqual(["created → processing → succeeded"]);
    expect(s.ledger).toHaveLength(1);
    expect(s.ledger[0].lines).toEqual([
      { account: "Cash at PSP", amount: 5000 },
      { account: "Merchant payable", amount: -5000 },
    ]);
    expect(s.idem[KEY]).toMatchObject({ state: "done", response: { code: 202, payId: "pay_1" } });
    expect(s.seenEvents).toEqual(["evt_9"]);
    expect(isIdle(runUntilIdle(s))).toBe(false); // visuals may still be fading…
    expect(isIdle(stepToNext(s))).toBe(true); // …and one more step settles them
  });
});

describe("idempotency keys", () => {
  test("a PSP timeout makes the payment unknown, then the webhook resolves it", () => {
    const s = runUntilIdle(act(act(initSim(), "armTimeout"), "pay"));
    expect(statuses(s)).toEqual(["created → processing → unknown → succeeded"]);
    expect(s.charges).toHaveLength(1);
    expect(s.ledger).toHaveLength(1);
  });

  test("keys on: any number of retries, at any moment, charge the card exactly once", () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      for (const gap of [150, 400, 900]) {
        let s = act(act(initSim({ seed }), "armTimeout"), "pay");
        for (let i = 0; i < 12; i++) s = act(run(s, gap), "retry");
        s = runUntilIdle(s);
        expect(s.charges, `seed ${seed}, a retry every ${gap} ms`).toHaveLength(1);
        expect(s.pspCalls).toBe(1);
        expect(s.payments).toHaveLength(1);
        expect(s.ledger).toHaveLength(1);
      }
    }
  });

  test("keys on: a retry while the first request is in flight gets 409; after it, the stored 202 is replayed", () => {
    let s = act(initSim(), "pay");
    s = run(s, 1500); // the first request has claimed k1 and is waiting on the PSP
    expect(s.idem[KEY].state).toBe("started");
    s = runUntilIdle(act(s, "retry"));
    expect(s.log.some((l) => l.text.includes("409 Conflict"))).toBe(true);
    s = runUntilIdle(act(s, "retry"));
    expect(s.log.some((l) => l.text.includes("replays the stored 202 for pay_1"))).toBe(true);
    expect(s.charges).toHaveLength(1);
    expect(s.log[0]).toMatchObject({ tone: "ok", text: expect.stringContaining("Exactly-once effect") });
  });

  test("keys off: a retry after a timeout creates a second payment and charges twice", () => {
    let s = act(act(act(initSim(), { keys: false }), "armTimeout"), "pay");
    s = run(s, 6000); // the timeout has answered the client with 202 pending
    expect(s.payments[0].status).not.toBe("processing");
    s = runUntilIdle(act(s, "retry"));
    expect(s.charges).toHaveLength(2);
    expect(s.payments.map((p) => p.id)).toEqual(["pay_1", "pay_2"]);
    // the books are right: the customer really paid twice, so the ledger and the PSP agree
    expect(balanceOf(s.ledger, "Cash at PSP")).toBe(2 * AMOUNT);
  });

  test("the store follows the SQL rules: replay, in flight (409), different body (422)", () => {
    let rows = {};
    let r = idemCheck(rows, "k1", "h1");
    expect(r.result).toEqual({ kind: "new" });
    rows = r.rows;
    expect(idemCheck(rows, "k1", "h1").result).toEqual({ kind: "in_flight" });
    expect(idemCheck(rows, "k1", "h2").result).toEqual({ kind: "mismatch" });
    rows = idemFinish(rows, "k1", { code: 202, payId: "pay_1" });
    r = idemCheck(rows, "k1", "h1");
    expect(r.result).toEqual({ kind: "replay", response: { code: 202, payId: "pay_1" } });
    expect(idemCheck(rows, "k1", "h2").result).toEqual({ kind: "mismatch" });
    expect(idemCheck(rows, "k2", "h1").result).toEqual({ kind: "new" });
  });
});

describe("webhooks", () => {
  test("dedupe on: a duplicate webhook is ignored and the ledger is posted once", () => {
    const s = runUntilIdle(act(act(initSim(), "dupWebhook"), "pay"));
    expect(s.log.some((l) => l.text.startsWith("The PSP delivers evt_9 again"))).toBe(true);
    expect(s.ledger).toHaveLength(1);
    expect(s.log.some((l) => l.text.startsWith("evt_9 was already processed"))).toBe(true);
  });

  test("dedupe off: the duplicate posts the capture twice and reconciliation sees it", () => {
    const s = runUntilIdle(act(act(act(initSim(), { dedupe: false }), "dupWebhook"), "pay"));
    expect(s.charges).toHaveLength(1);
    expect(s.ledger).toHaveLength(2);
    expect(balanceOf(s.ledger, "Cash at PSP")).toBe(2 * AMOUNT); // the PSP's report says 1 × $50
  });

  test("redelivering an event that was already handled is also a no-op", () => {
    let s = runUntilIdle(act(initSim(), "pay"));
    s = runUntilIdle(act(s, "dupWebhook"));
    expect(s.ledger).toHaveLength(1);
    expect(s.payments[0].status).toBe("succeeded");
  });
});

describe("the bad day", () => {
  test("with both protections: one charge, one posting, the retry replayed, the duplicate ignored", () => {
    const s = runUntilIdle(act(initSim(), "badDay"));
    expect(s.charges).toHaveLength(1);
    expect(s.ledger).toHaveLength(1);
    expect(statuses(s)).toEqual(["created → processing → unknown → succeeded"]);
    expect(s.log.some((l) => l.text.includes("replays the stored 202"))).toBe(true);
    expect(s.log.some((l) => l.text.startsWith("evt_9 was already processed"))).toBe(true);
  });

  test("with neither: charged twice and pay_1 posted twice", () => {
    let s = act(act(initSim(), { keys: false }), { dedupe: false });
    s = runUntilIdle(act(s, "badDay"));
    expect(s.charges).toHaveLength(2);
    expect(s.ledger.filter((p) => p.payId === "pay_1")).toHaveLength(2);
    expect(s.ledger).toHaveLength(3);
    expect(balanceOf(s.ledger, "Cash at PSP")).toBe(3 * AMOUNT);
    expect(s.log[0]).toMatchObject({ tone: "bad", text: expect.stringContaining("the customer paid 2× for one order") });
  });

  test("is deterministic on a seed", () => {
    const a = runUntilIdle(act(initSim({ seed: 5 }), "badDay"));
    const b = runUntilIdle(act(initSim({ seed: 5 }), "badDay"));
    expect(a).toEqual(b);
    const c = runUntilIdle(act(initSim({ seed: 6 }), "badDay"));
    expect(c.t).not.toBe(a.t); // different network jitter, same outcome
    expect(c.charges).toHaveLength(1);
  });
});

describe("ledger and state machine", () => {
  test("every posting sums to zero, in every scenario", () => {
    for (const keys of [true, false])
      for (const dedupe of [true, false]) {
        const s = runUntilIdle(act(act(act(initSim(), { keys }), { dedupe }), "badDay"));
        expect(s.ledger.length).toBeGreaterThan(0);
        for (const p of s.ledger) expect(postingSum(p)).toBe(0);
        expect(balanceOf(s.ledger, "Cash at PSP") + balanceOf(s.ledger, "Merchant payable")).toBe(0);
      }
    expect(postingSum(capturePosting("tx_1", "pay_1", "evt_9", 1234))).toBe(0);
  });

  test("illegal transitions are rejected", () => {
    expect(canMove("created", "processing")).toBe(true);
    expect(canMove("processing", "unknown")).toBe(true);
    expect(canMove("unknown", "succeeded")).toBe(true);
    expect(canMove("created", "succeeded")).toBe(false); // must be processing first
    expect(canMove("succeeded", "processing")).toBe(false); // no going back
    expect(canMove("succeeded", "succeeded")).toBe(false); // a second success is a no-op, not a move
    expect(canMove("failed", "succeeded")).toBe(false);
    expect(canMove("unknown", "processing")).toBe(false);
  });

  test("the timeout fires only when the PSP stays silent", () => {
    // the PSP call leaves the payment service about 2.1 s after the tap (four hops)
    const s = runUntilIdle(act(initSim(), "pay"));
    expect(s.payments[0].history).not.toContain("unknown");
    const late = run(act(act(initSim(), "armTimeout"), "pay"), 2400 + TIMEOUT_MS + 200);
    expect(late.payments[0].status).toBe("unknown");
  });
});

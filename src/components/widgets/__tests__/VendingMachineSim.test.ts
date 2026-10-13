import { test, expect } from "vitest";
import { mulberry32 } from "@/lib/rng";
import {
  act,
  autoAct,
  balanced,
  boxTotal,
  busy,
  exactChangeOnly,
  greedyChange,
  initMachine,
  initWorld,
  machine,
  makeChange,
  PRESETS,
  settle,
  stepWorld,
  sum,
  type Machine,
  type VEvent,
  type VState,
} from "../VendingMachineSim";

const run = (vm: Machine, events: VEvent[]) => events.reduce((m, e) => machine(m, e).state, vm);
const stock = (vm: Machine) => sum(vm.slots.map((s) => s.count));
const count = (vm: Machine, code: string) => vm.slots.find((s) => s.code === code)!.count;

/** A machine in each state, reached through real events. */
const IN: Record<VState, Machine> = {
  idle: initMachine(),
  hasMoney: run(initMachine(), [{ type: "coin", coin: 25 }]),
  dispensing: run(initMachine(), [{ type: "coin", coin: 100 }, { type: "select", code: "B2" }]),
  outOfService: run(initMachine(), [{ type: "service" }]),
};
const ALL: VEvent[] = [
  { type: "coin", coin: 25 },
  { type: "coin", coin: 25, fake: true },
  { type: "coin", coin: 1 },
  { type: "select", code: "B2" },
  { type: "cancel" },
  { type: "dropped" },
  { type: "dropFailed" },
  { type: "service" },
  { type: "restock" },
  { type: "refill", preset: "low" },
];
/** The transition table: which event types each state accepts. */
const ACCEPTS: Record<VState, VEvent["type"][]> = {
  idle: ["coin", "service", "restock", "refill"],
  hasMoney: ["coin", "select", "cancel", "service"],
  dispensing: ["dropped", "dropFailed"],
  outOfService: ["service", "restock", "refill"],
};

test("the reached machines really are in the states they claim", () => {
  for (const [s, vm] of Object.entries(IN)) expect(vm.state).toBe(s);
});

test("happy path: 100¢ for a 65¢ cola gives 25¢ + 10¢ and takes one can, once", () => {
  const vm = run(initMachine(), [{ type: "coin", coin: 100 }]);
  const sel = machine(vm, { type: "select", code: "B2" });
  expect(sel.to).toBe("dispensing");
  expect(sel.state.pending?.change).toEqual([25, 10]);
  expect(count(sel.state, "B2")).toBe(3); // reserved, not taken
  const done = machine(sel.state, { type: "dropped" });
  expect(done.text).toBe("Dispensed B2 Cola for 65¢ from 100¢; change 35¢ = 25¢ + 10¢.");
  expect(done.effects).toEqual([
    { kind: "drop", code: "B2" },
    { kind: "return", coins: [25, 10], why: "change" },
  ]);
  expect(count(done.state, "B2")).toBe(2);
  expect(done.state.ledger).toMatchObject({ sales: 1, revenue: 65, paidOut: 35 });
  expect(boxTotal(done.state.box)).toBe(boxTotal(PRESETS.plenty) + 65);
  expect(done.state.state).toBe("idle");
  expect(balanced(done.state)).toBe(true);
  // A second dropped is rejected: the sale can't be committed twice.
  expect(machine(done.state, { type: "dropped" }).ok).toBe(false);
});

test("every event a state doesn't accept is rejected and returns the very same machine", () => {
  let rejected = 0;
  for (const [s, vm] of Object.entries(IN) as [VState, Machine][]) {
    for (const e of ALL) {
      const fakeCoin = e.type === "coin" && (e.fake || e.coin === 1);
      if (ACCEPTS[s].includes(e.type) && !fakeCoin) continue;
      const r = machine(vm, e);
      expect(r.ok, `${s} + ${e.type}`).toBe(false);
      expect(r.state).toBe(vm); // same object: no money, stock or state changed
      expect(r.from).toBe(s);
      expect(r.to).toBe(s);
      if (e.type === "coin") expect(r.effects).toEqual([{ kind: "return", coins: [e.coin], why: "refused" }]);
      else expect(r.effects).toEqual([]);
      rejected++;
    }
  }
  expect(rejected).toBe(27); // 40 (state, event) pairs, 13 accepted: fake coins are refused in every state
});

test("the rejection messages say what was ignored and why", () => {
  expect(machine(IN.idle, { type: "select", code: "B2" }).text).toBe("Select ignored: insert money first (state Idle).");
  expect(machine(IN.dispensing, { type: "cancel" }).text).toMatch(/too late/);
  expect(machine(IN.outOfService, { type: "coin", coin: 25 }).text).toMatch(/out of service/);
});

test("sold out and short credit keep the credit and change nothing", () => {
  const vm = run(initMachine(), [{ type: "coin", coin: 25 }, { type: "coin", coin: 25 }]);
  const sold = machine(vm, { type: "select", code: "A3" });
  expect(sold.ok).toBe(false);
  expect(sold.state).toBe(vm);
  expect(sold.text).toMatch(/A3 Iced tea is SOLD OUT/);
  expect(sold.lcd).toBe("SOLD OUT");
  const short = machine(vm, { type: "select", code: "B3" });
  expect(short.ok).toBe(false);
  expect(short.state).toBe(vm);
  expect(short.lcd).toBe("INSERT 20¢");
});

test("cancel returns exactly the coins that went in", () => {
  const vm = run(initMachine(), [{ type: "coin", coin: 25 }, { type: "coin", coin: 10 }, { type: "coin", coin: 100 }]);
  const r = machine(vm, { type: "cancel" });
  expect(r.to).toBe("idle");
  expect(r.effects).toEqual([{ kind: "return", coins: [25, 10, 100], why: "refund" }]);
  expect(r.state.box).toEqual(PRESETS.plenty);
  expect(balanced(r.state)).toBe(true);
});

test("greedy fails with limited coins; the DP finds change, and the machine says so", () => {
  const tubes = { 100: 0, 25: 1, 10: 3, 5: 0 };
  expect(greedyChange(30, tubes)).toBeNull();
  expect(makeChange(30, tubes)).toEqual([10, 10, 10]);
  // Low tubes, $1 for the 70¢ orange: owe 30¢
  const vm = run(initMachine("low"), [{ type: "coin", coin: 100 }, { type: "select", code: "B3" }]);
  expect(vm.state).toBe("dispensing");
  expect(vm.pending?.change).toEqual([10, 10, 10]);
  const done = machine(vm, { type: "dropped" });
  expect(done.text).toMatch(/change 30¢ = 10¢ \+ 10¢ \+ 10¢\. Greedy would have grabbed a 25¢ first/);
  expect(done.state.box).toEqual({ 100: 1, 25: 1, 10: 0, 5: 0 });
});

test("change is minimal and respects the tubes (brute force)", () => {
  const tubes = { 100: 2, 25: 3, 10: 2, 5: 4 };
  for (let a = 0; a <= 360; a += 5) {
    let fewest = Infinity;
    for (let h = 0; h <= 2; h++) for (let q = 0; q <= 3; q++) for (let d = 0; d <= 2; d++) for (let n = 0; n <= 4; n++) if (100 * h + 25 * q + 10 * d + 5 * n === a) fewest = Math.min(fewest, h + q + d + n);
    const coins = makeChange(a, tubes);
    if (fewest === Infinity) expect(coins).toBeNull();
    else {
      expect(sum(coins!)).toBe(a);
      expect(coins!.length).toBe(fewest);
      for (const c of [100, 25, 10, 5] as const) expect(coins!.filter((x) => x === c).length).toBeLessThanOrEqual(tubes[c]);
    }
  }
});

test("can't make change: refund everything, dispense nothing, go back to Idle", () => {
  const vm = run(initMachine("low"), [{ type: "coin", coin: 100 }]);
  const r = machine(vm, { type: "select", code: "C2" }); // owe 15¢ from 100 + 25 + 10 + 10 + 10
  expect(r.ok).toBe(true);
  expect(r.to).toBe("idle");
  expect(r.effects).toEqual([{ kind: "return", coins: [100], why: "refund" }]);
  expect(r.state.slots).toEqual(vm.slots);
  expect(r.state.box).toEqual(vm.box);
  expect(r.state.pending).toBeNull();
  expect(balanced(r.state)).toBe(true);
  expect(exactChangeOnly(PRESETS.low)).toBe(true);
  expect(exactChangeOnly(PRESETS.plenty)).toBe(false);
});

test("a failed drop refunds and takes no stock; service with credit refunds first", () => {
  const failed = machine(IN.dispensing, { type: "dropFailed" });
  expect(failed.to).toBe("idle");
  expect(failed.effects).toEqual([{ kind: "return", coins: [100], why: "refund" }]);
  expect(stock(failed.state)).toBe(stock(IN.dispensing));
  const svc = machine(IN.hasMoney, { type: "service" });
  expect(svc.to).toBe("outOfService");
  expect(svc.effects).toEqual([{ kind: "return", coins: [25], why: "refund" }]);
  expect(svc.state.escrow).toEqual([]);
});

test("money is conserved and stock drops once per sale over 20,000 random events", () => {
  const rnd = mulberry32(99);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  let vm = initMachine("low");
  let restocked = 0;
  const startStock = stock(vm);
  for (let i = 0; i < 20000; i++) {
    const e = pick<VEvent>([
      { type: "coin", coin: pick([100, 25, 10, 5]) },
      { type: "coin", coin: pick([25, 10, 5]) },
      { type: "coin", coin: 25, fake: true },
      { type: "select", code: pick(initMachine().slots.map((s) => s.code)) },
      { type: "select", code: pick(["B1", "B2", "B3", "C3"]) },
      { type: "cancel" },
      { type: "dropped" },
      { type: "dropped" },
      { type: "dropFailed" },
      { type: "service" },
      { type: "restock" },
      { type: "refill", preset: pick(["plenty", "low"] as const) },
    ]);
    const before = stock(vm);
    const sales = vm.ledger.sales;
    const r = machine(vm, e);
    if (r.ok && e.type === "restock") restocked += stock(r.state) - before;
    if (e.type === "dropped" && r.ok) expect(stock(r.state)).toBe(before - 1);
    else if (e.type !== "restock") expect(stock(r.state)).toBe(before);
    expect(r.state.ledger.sales - sales).toBe(e.type === "dropped" && r.ok ? 1 : 0);
    vm = r.state;
    expect(balanced(vm)).toBe(true);
    expect(Object.values(vm.box).every((n) => n >= 0)).toBe(true);
    expect(vm.slots.every((s) => s.count >= 0)).toBe(true);
    if (vm.state !== "hasMoney" && vm.state !== "dispensing") expect(vm.escrow).toEqual([]);
  }
  expect(stock(vm)).toBe(startStock + restocked - vm.ledger.sales);
  expect(vm.ledger.sales).toBeGreaterThan(30);
});

test("the world: a vend animates, then the drop sensor commits the sale", () => {
  let w = act(initWorld(), { type: "coin", coin: 100 });
  expect(w.coinsIn).toHaveLength(1);
  w = act(w, { type: "select", code: "B2" });
  expect(w.vend?.code).toBe("B2");
  for (let i = 0; i < 20; i++) w = stepWorld(w, 50); // 1 s: still turning and falling
  expect(w.vm.state).toBe("dispensing");
  for (let i = 0; i < 10; i++) w = stepWorld(w, 50);
  expect(w.vm.state).toBe("idle");
  expect(w.tray.map((x) => x.code)).toEqual(["B2"]);
  expect(w.coinsOut.length + w.cup.length).toBe(2);
  for (let i = 0; i < 200; i++) w = stepWorld(w, 50);
  expect(busy(w)).toBe(false); // tray emptied, coins collected, the clock can stop
});

test("the world: a jammed item times out into a refund", () => {
  let w = { ...initWorld(), jamNext: true };
  w = act(act(w, { type: "coin", coin: 100 }), { type: "select", code: "C1" });
  expect(w.vend?.jam).toBe(true);
  expect(w.jamNext).toBe(false);
  for (let i = 0; i < 60; i++) w = stepWorld(w, 50);
  expect(w.vm.state).toBe("idle");
  expect(w.msg).toMatch(/stuck in the spiral/);
  expect(w.vm.slots.find((s) => s.code === "C1")!.count).toBe(5);
});

test("settle finishes everything at once (reduced motion)", () => {
  const w = settle(act(act(initWorld(), { type: "coin", coin: 100 }), { type: "select", code: "B2" }));
  expect(w.vm.state).toBe("idle");
  expect(w.vend).toBeNull();
  expect(w.coinsIn).toEqual([]);
  expect(w.cup.map((c) => c.coin)).toEqual([25, 10]);
});

test("auto mode plays deterministic customers who keep the books balanced", () => {
  const play = () => {
    let w = { ...initWorld(), auto: true };
    for (let i = 0; i < 4000; i++) w = stepWorld(w, 50); // 200 simulated seconds
    return w;
  };
  const a = play();
  const b = play();
  expect(a.vm).toEqual(b.vm);
  expect(a.vm.ledger.sales).toBeGreaterThan(10);
  expect(balanced(a.vm)).toBe(true);
  // Step works without the clock too
  let w = initWorld();
  for (let i = 0; i < 30; i++) w = settle(autoAct(w));
  expect(w.vm.ledger.inserted).toBeGreaterThan(0);
  expect(balanced(w.vm)).toBe(true);
});

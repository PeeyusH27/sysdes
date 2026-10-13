import { test, expect } from 'vitest';
import { Slot, sum } from './models.js';
import { greedyChange, makeChange } from './change.js';
import { STATES } from './states.js';
import { VendingMachine } from './vending-machine.js';

const TUBES = { 25: 10, 10: 10, 5: 10 };                                 // 250 + 100 + 50 = 400¢

function make(coins = TUBES) {
  const m = new VendingMachine({ slots: [new Slot('B2', 'Cola', 65, 2), new Slot('C2', 'Pretzels', 85, 0)], coins });
  const out = { returned: [], paidOut: 0, rejected: [], sales: [] };
  m.on('returned', (coins, why) => {
    out.returned.push(...coins);
    if (why !== 'refused') out.paidOut += sum(coins);                    // a refused coin never entered the machine
  });
  m.on('rejected', r => out.rejected.push(r.reason));
  m.on('sale', s => out.sales.push(s.code));
  return { m, out };
}
const snapshot = m => JSON.stringify({
  state: m.state, escrow: m.escrow, pending: m.pending, box: m.box.counts,
  stock: [...m.inventory.slots.values()].map(s => s.count),
});

test('greedy fails with limited tubes; the bounded DP still finds change', () => {
  const tubes = { 100: 0, 25: 1, 10: 3, 5: 0 };
  expect(greedyChange(30, tubes)).toBeNull();                            // takes the 25¢, then needs a 5¢
  expect(makeChange(30, tubes)).toEqual([10, 10, 10]);
  expect(makeChange(15, tubes)).toBeNull();                              // truly impossible
  expect(makeChange(0, tubes)).toEqual([]);
});

test('with plenty of coins, greedy is already optimal', () => {
  const plenty = { 100: 9, 25: 9, 10: 9, 5: 9 };
  for (let a = 0; a <= 300; a += 5) {
    const dp = makeChange(a, plenty);
    expect(sum(dp)).toBe(a);
    expect(dp.length).toBe(greedyChange(a, plenty).length);
  }
});

test('the DP returns the fewest coins and respects the tube counts (brute force check)', () => {
  const tubes = { 100: 1, 25: 2, 10: 4, 5: 3 };                         // 205¢ in total
  const fewest = a => {
    let best = Infinity;
    for (let h = 0; h <= 1; h++) for (let q = 0; q <= 2; q++) for (let d = 0; d <= 4; d++) for (let n = 0; n <= 3; n++)
      if (100 * h + 25 * q + 10 * d + 5 * n === a) best = Math.min(best, h + q + d + n);
    return best;
  };
  for (let a = 0; a <= 230; a += 5) {
    const coins = makeChange(a, tubes);
    if (fewest(a) === Infinity) { expect(coins).toBeNull(); continue; }
    expect(sum(coins)).toBe(a);
    expect(coins.length).toBe(fewest(a));
    for (const c of [100, 25, 10, 5]) expect(coins.filter(x => x === c).length).toBeLessThanOrEqual(tubes[c]);
  }
});

test('a sale commits only after the drop sensor: 100¢ for a 65¢ cola returns 25¢ + 10¢', () => {
  const { m, out } = make();
  m.send({ type: 'coin', coin: 100 });
  expect(m.state).toBe('hasMoney');
  expect(m.send({ type: 'select', code: 'B2' })).toEqual({ ok: true, state: 'dispensing' });
  expect(m.pending.change).toEqual([25, 10]);
  expect(m.inventory.get('B2').count).toBe(2);                          // nothing taken yet
  m.send({ type: 'dropped' });
  expect(m.state).toBe('idle');
  expect(out.returned).toEqual([25, 10]);
  expect(out.sales).toEqual(['B2']);
  expect(m.inventory.get('B2').count).toBe(1);
  expect(m.box.total()).toBe(400 + 100 - 35);
});

test('every event a state does not list is rejected and changes nothing', () => {
  const events = [
    { type: 'coin', coin: 25 }, { type: 'select', code: 'B2' }, { type: 'cancel' }, { type: 'dropped' },
    { type: 'dropFailed' }, { type: 'service' }, { type: 'restock', code: 'B2', n: 1 }, { type: 'refill', coins: [5] },
  ];
  const reach = {
    idle: [],
    hasMoney: [{ type: 'coin', coin: 25 }],
    dispensing: [{ type: 'coin', coin: 100 }, { type: 'select', code: 'B2' }],
    outOfService: [{ type: 'service' }],
  };
  let checked = 0;
  for (const [state, path] of Object.entries(reach)) {
    for (const e of events) {
      if (STATES[state][e.type]) continue;
      const { m, out } = make();
      path.forEach(p => m.send(p));
      expect(m.state).toBe(state);
      const before = snapshot(m);
      expect(m.send(e).ok).toBe(false);
      expect(snapshot(m)).toBe(before);
      if (e.type === 'coin') expect(out.returned.at(-1)).toBe(25);      // the refused coin drops to the cup
      checked++;
    }
  }
  expect(checked).toBe(19);                                             // 32 pairs, 13 accepted
});

test('sold out and short credit keep the credit; cancel returns the same coins', () => {
  const { m, out } = make();
  m.send({ type: 'coin', coin: 25 });
  m.send({ type: 'coin', coin: 25 });
  expect(m.send({ type: 'select', code: 'C2' })).toEqual({ ok: false, reason: 'C2 is sold out' });
  expect(m.send({ type: 'select', code: 'B2' })).toEqual({ ok: false, reason: 'Insert 15¢ more' });
  expect(m.credit).toBe(50);
  m.send({ type: 'cancel' });
  expect(m.state).toBe('idle');
  expect(out.returned).toEqual([25, 25]);
});

test('no change possible: refuse the sale, refund everything, take no stock', () => {
  const { m, out } = make({ 25: 4 });                                   // only quarters: 35¢ can't be paid
  m.send({ type: 'coin', coin: 100 });
  expect(m.send({ type: 'select', code: 'B2' })).toEqual({ ok: true, state: 'idle' });
  expect(out.returned).toEqual([100]);
  expect(out.sales).toEqual([]);
  expect(m.inventory.get('B2').count).toBe(2);
  expect(m.box.total()).toBe(100);
});

test('a failed drop refunds the escrow and takes no stock', () => {
  const { m, out } = make();
  m.send({ type: 'coin', coin: 100 });
  m.send({ type: 'select', code: 'B2' });
  m.send({ type: 'dropFailed' });
  expect(m.state).toBe('idle');
  expect(out.returned).toEqual([100]);
  expect(m.inventory.get('B2').count).toBe(2);
  expect(m.box.total()).toBe(400);
});

test('money is conserved and stock drops once per sale over 5,000 random events', () => {
  let seed = 7;
  const rand = () => {                                                  // mulberry32: deterministic
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = xs => xs[Math.floor(rand() * xs.length)];
  const { m, out } = make({ 25: 2, 10: 2, 5: 1 });
  const opening = m.box.total();
  const stock = () => [...m.inventory.slots.values()].reduce((n, s) => n + s.count, 0);
  let inserted = 0;
  let refilled = 0;
  let restocked = 0;
  for (let i = 0; i < 5000; i++) {
    const e = pick([
      { type: 'coin', coin: pick([100, 25, 10, 5, 1]) }, { type: 'coin', coin: pick([25, 10]) },
      { type: 'select', code: pick(['B2', 'C2']) }, { type: 'cancel' }, { type: 'dropped' }, { type: 'dropFailed' },
      { type: 'service' }, { type: 'restock', code: pick(['B2', 'C2']), n: 2 }, { type: 'refill', coins: [5, 10] },
    ]);
    const before = stock();
    const r = m.send(e);
    if (r.ok && e.type === 'coin') inserted += e.coin;
    if (r.ok && e.type === 'refill') refilled += sum(e.coins);
    if (r.ok && e.type === 'restock') restocked += stock() - before;
    expect(m.credit + m.box.total() + out.paidOut).toBe(opening + inserted + refilled);
    expect(stock()).toBe(2 + restocked - out.sales.length);
    expect(Object.values(m.box.counts).every(n => n >= 0)).toBe(true);
  }
  expect(out.sales.length).toBeGreaterThan(0);
});

test('a listener that sends mid-transition is queued, not run inside the transition', () => {
  const { m, out } = make();
  m.on('transition', t => { if (t.to === 'dispensing') m.send({ type: 'dropped' }); });   // an instant sensor
  m.send({ type: 'coin', coin: 100 });
  expect(m.send({ type: 'select', code: 'B2' })).toEqual({ ok: true, state: 'dispensing' });
  expect(m.state).toBe('idle');                                         // dropped ran right after, not inside
  expect(out.sales).toEqual(['B2']);
});

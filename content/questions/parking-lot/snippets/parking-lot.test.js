import { test, expect } from 'vitest';
import { Spot, FITS } from './models.js';
import { Floor } from './floor.js';
import { LowestFloorFirst, HourlyPricing, DailyCap } from './strategies.js';
import { ParkingLot } from './parking-lot.js';

const makeLot = clock => {
  const floors = [
    new Floor(0, [new Spot('0-C1', 'compact', 0), new Spot('0-L1', 'large', 0)]),
    new Floor(1, [new Spot('1-B1', 'bike', 1)]),
  ];
  return { floors, lot: new ParkingLot({ floors, selector: new LowestFloorFirst(), pricing: new HourlyPricing(), clock }) };
};

test('trucks only take large spots; fees round up per started hour', () => {
  let now = 0;
  const { lot, floors } = makeLot(() => now);
  const t = lot.park({ type: 'truck', plate: 'KA01AB1234' });
  expect(t.spot.id).toBe('0-L1');
  expect(() => lot.park({ type: 'truck', plate: 'KA02' })).toThrow(/Lot full/);
  now = 61 * 60_000;                                                  // 61 minutes = 2 started hours × 40
  expect(lot.exit(t.id, { amount: 100 })).toEqual({ fee: 80, change: 20 });
  expect(floors[0].available('large')).toBe(1);
});

test('grace period and daily cap', () => {
  const pricing = new DailyCap(new HourlyPricing(), 150);
  expect(pricing.fee(5 * 60_000, { type: 'car' })).toBe(0);
  expect(pricing.fee(23 * 3_600_000, { type: 'car' })).toBe(150);
  expect(pricing.fee(26 * 3_600_000, { type: 'car' })).toBe(190);    // 1 day capped + 2 hours
});

test('display boards hear about every change', () => {
  const { lot } = makeLot(() => 0);
  const changed = [];
  lot.on('changed', floor => changed.push(floor));
  lot.exit(lot.park({ type: 'car' }).id, { amount: 0 });
  expect(changed).toEqual([0, 0]);
});

test('exact hour boundaries: 60 minutes is one hour, one more millisecond is two', () => {
  const pricing = new HourlyPricing();
  expect(pricing.fee(10 * 60_000, { type: 'car' })).toBe(0);         // the grace period is inclusive
  expect(pricing.fee(10 * 60_000 + 1, { type: 'car' })).toBe(20);
  expect(pricing.fee(60 * 60_000, { type: 'car' })).toBe(20);
  expect(pricing.fee(60 * 60_000 + 1, { type: 'car' })).toBe(40);
});

test('unknown tickets, short payments and double exits are rejected', () => {
  let now = 0;
  const { lot, floors } = makeLot(() => now);
  expect(() => lot.quote('nope')).toThrow('Unknown ticket');
  const t = lot.park({ type: 'car', plate: 'KA03' });
  now = 2 * 3_600_000;                                                 // 2 hours × 20
  expect(lot.quote(t.id)).toBe(40);
  expect(() => lot.exit(t.id, { amount: 30 })).toThrow('Payment of 40 required');
  expect(floors[0].available('compact')).toBe(0);                     // a failed payment keeps the spot taken
  expect(lot.exit(t.id, { amount: 40 })).toEqual({ fee: 40, change: 0 });
  expect(() => lot.exit(t.id, { amount: 40 })).toThrow('Unknown ticket');
});

test('smallest fitting type first, then the next floor; EV filter', () => {
  const ev = new Spot('1-C1', 'compact', 1);
  ev.features.add('ev');
  const floors = [
    new Floor(0, [new Spot('0-C1', 'compact', 0), new Spot('0-L1', 'large', 0)]),
    new Floor(1, [ev, new Spot('1-B1', 'bike', 1)]),
  ];
  const selector = new LowestFloorFirst();
  expect(selector.choose(floors, { type: 'car', needsCharger: true }, FITS).id).toBe('1-C1');   // skips floor 0: no charger
  expect(selector.choose(floors, { type: 'bike' }, FITS).id).toBe('0-C1');   // no bike spot on floor 0: a compact one fits
  expect(selector.choose(floors, { type: 'car' }, FITS).id).toBe('0-L1');    // compact gone: a car may use a large spot
  expect(selector.choose(floors, { type: 'car' }, FITS)).toBeNull();         // floor 1 has no compact or large left
});

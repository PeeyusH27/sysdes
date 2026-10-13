import { test, expect } from 'vitest';
import { encode, haversineM, neighbours } from './geohash.js';
import { GeoIndex, nearby, ringCells } from './nearby.js';

const NOW = 1_760_000_000_000;
const rider = { lat: 37.7749, lon: -122.41 };                  // cell 9q8yyk, about 29 m from its east edge

test('rings hold 1, 8, 16 and 24 cells, and ring 1 is exactly the 8 neighbours', () => {
  expect([0, 1, 2, 3].map(k => ringCells('9q8yyk', k).length)).toEqual([1, 8, 16, 24]);
  expect(new Set(ringCells('9q8yyk', 1))).toEqual(new Set(Object.values(neighbours('9q8yyk'))));
});

test('a driver across the cell edge is found and ranked first', () => {
  const index = new GeoIndex(6);
  index.upsert('across', 37.7749, -122.4093, NOW);             // next cell east, ~62 m away
  index.upsert('same-cell', 37.7749, -122.42, NOW);            // rider's own cell, ~880 m away
  expect(encode(37.7749, -122.4093, 6)).not.toBe(encode(rider.lat, rider.lon, 6));
  const r = nearby(index, rider, { want: 2, now: NOW });
  expect(r.candidates.map(c => c.id)).toEqual(['across', 'same-cell']);
  expect(r.candidates[0].distanceM).toBe(62);
});

test('busy and stale drivers are examined but never returned', () => {
  const index = new GeoIndex(6);
  index.upsert('busy', 37.775, -122.4101, NOW);
  index.upsert('stale', 37.775, -122.4102, NOW - 60_000);      // app went quiet a minute ago
  index.upsert('free', 37.776, -122.411, NOW);
  const r = nearby(index, rider, { want: 1, now: NOW, isAvailable: id => id !== 'busy' });
  expect(r.candidates.map(c => c.id)).toEqual(['free']);
  expect(r.examined).toBe(3);
});

test('moving to another cell leaves the old one; an out-of-order fix is ignored', () => {
  const index = new GeoIndex(6);
  index.upsert('d1', 37.7749, -122.41, NOW);
  const before = index.drivers.get('d1').cell;
  index.upsert('d1', 37.7749, -122.4093, NOW + 4_000);        // crossed the edge eastwards
  const after = index.drivers.get('d1').cell;
  expect(after).not.toBe(before);
  expect(index.inCell(before)).toEqual([]);
  expect(index.inCell(after).map(d => d.id)).toEqual(['d1']);
  expect(index.upsert('d1', 37.7749, -122.41, NOW + 2_000)).toBe(false);   // older than what we have
  expect(index.drivers.get('d1').cell).toBe(after);
});

test('stops after the 3×3 block when the nearest drivers are close, expands when they are not', () => {
  const near = new GeoIndex(6);
  near.upsert('a', 37.7752, -122.4105, NOW);                   // a few dozen metres away
  expect(nearby(near, rider, { want: 1, now: NOW })).toMatchObject({ rings: 2, cellsSearched: 9 });

  const far = new GeoIndex(6);
  far.upsert('b', 37.7749 + 0.0115, -122.41, NOW);             // ~1.3 km north: two rows up
  const r = nearby(far, rider, { want: 1, now: NOW });
  expect(r.candidates[0].id).toBe('b');
  expect(r.cellsSearched).toBeGreaterThanOrEqual(25);
});

test('ring search returns the same nearest drivers as checking every driver', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
  for (let round = 0; round < 20; round++) {
    const index = new GeoIndex(6);
    const all = [];
    for (let i = 0; i < 60; i++) {
      const d = { id: `d${i}`, lat: rider.lat + (rand() - 0.5) * 0.04, lon: rider.lon + (rand() - 0.5) * 0.05 };
      index.upsert(d.id, d.lat, d.lon, NOW);
      all.push(d);
    }
    const brute = all.map(d => ({ id: d.id, distanceM: Math.round(haversineM(rider, d)) })).sort((a, b) => a.distanceM - b.distanceM);
    const r = nearby(index, rider, { want: 3, maxRings: 10, now: NOW });
    expect(r.candidates.map(c => c.distanceM)).toEqual(brute.slice(0, 3).map(c => c.distanceM));
    expect(r.examined).toBeLessThan(all.length);                 // and it read only part of the city
  }
});

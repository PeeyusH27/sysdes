import { test, expect } from 'vitest';
import { GeohashIndex, cellDegrees, coveringCells, encode, precisionFor } from './geohash-index.js';
import { haversineKm } from './distance.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('encode matches known geohashes', () => {
  expect(encode(37.7749, -122.4194, 6)).toBe('9q8yyk');          // downtown San Francisco
  expect(encode(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
});

test('cell sizes in degrees: precision 5 is 0.0439 degrees square, precision 6 is 0.0110 by 0.0055', () => {
  expect(cellDegrees(5).lat).toBeCloseTo(0.04395, 4);
  expect(cellDegrees(5).lon).toBeCloseTo(0.04395, 4);
  expect(cellDegrees(6).lon).toBeCloseTo(0.010986, 5);
  expect(cellDegrees(6).lat).toBeCloseTo(0.005493, 5);
});

test('radius to precision in San Francisco: 0.5 km uses 6, 1 and 2 km use 5, 5 km uses 4, 20 km uses 3', () => {
  const p = (r) => precisionFor(r, 37.77);
  expect([0.5, 1, 2, 5, 20].map(p)).toEqual([6, 5, 5, 4, 3]);
});

test('a circle is always covered by at most 9 cells', () => {
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    const lat = -60 + r() * 120;
    const lon = -170 + r() * 340;
    const radius = [0.5, 1, 2, 5, 20][Math.floor(r() * 5)];
    expect(coveringCells(lat, lon, radius).cells.length).toBeLessThanOrEqual(9);
  }
});

// 20,000 businesses: a dense downtown plus a thinner spread across the metro area.
function makeBusinesses() {
  const r = rng(11);
  const out = [];
  for (let i = 0; i < 12_000; i++) out.push({ id: i, lat: 37.77 + (r() - 0.5) * 0.04, lon: -122.42 + (r() - 0.5) * 0.05 });   // about 4 km x 4.4 km
  for (let i = 12_000; i < 20_000; i++) out.push({ id: i, lat: 37.4 + r() * 0.7, lon: -122.7 + r() * 0.8 });
  return out;
}

test('the geohash index returns exactly what a brute-force scan returns, for 5 radii and 100 queries', () => {
  const biz = makeBusinesses();
  const index = new GeohashIndex(biz);
  const r = rng(99);
  for (let q = 0; q < 100; q++) {
    const lat = 37.4 + r() * 0.7;
    const lon = -122.7 + r() * 0.8;
    const radius = [0.5, 1, 2, 5, 20][q % 5];
    const expected = biz.filter((b) => haversineKm({ lat, lon }, b) <= radius).map((b) => b.id).sort((a, b) => a - b);
    const got = index.nearby(lat, lon, radius, Infinity).results.map((b) => b.id).sort((a, b) => a - b);
    expect(got, `query ${q} r=${radius}`).toEqual(expected);
  }
});

test('results come back nearest first and are limited', () => {
  const index = new GeohashIndex(makeBusinesses());
  const { results } = index.nearby(37.77, -122.42, 2, 20);
  expect(results).toHaveLength(20);
  expect(results.every((b, i) => i === 0 || b.distKm >= results[i - 1].distKm)).toBe(true);
});

test('the index scans far fewer rows than the whole table', () => {
  const index = new GeohashIndex(makeBusinesses());
  const { scanned } = index.nearby(37.55, -122.3, 1, 20);       // a thin suburban spot
  expect(scanned).toBeLessThan(500);
});

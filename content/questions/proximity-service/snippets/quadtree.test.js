import { test, expect } from 'vitest';
import { QuadTree, memoryEstimate } from './quadtree.js';
import { haversineKm } from './distance.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

// 12,000 businesses packed into a ~4 km downtown, 8,000 spread over a metro area about 80 km across.
function makeBusinesses() {
  const r = rng(11);
  const out = [];
  for (let i = 0; i < 12_000; i++) out.push({ id: i, lat: 37.77 + (r() - 0.5) * 0.04, lon: -122.42 + (r() - 0.5) * 0.05 });
  for (let i = 12_000; i < 20_000; i++) out.push({ id: i, lat: 37.4 + r() * 0.7, lon: -122.7 + r() * 0.8 });
  return out;
}

test('no leaf holds more than the capacity, and every business is in the tree', () => {
  const t = new QuadTree({ capacity: 100 });
  const biz = makeBusinesses();
  biz.forEach((b) => t.insert(b));
  expect(t.size).toBe(20_000);
  expect(t.stats().biggestLeaf).toBeLessThanOrEqual(100);
});

test('the tree is deeper downtown than in the suburbs: it adapts to density', () => {
  const t = new QuadTree({ capacity: 100 });
  makeBusinesses().forEach((b) => t.insert(b));
  const suburb = t.nearby(37.5, -122.5, 1, Infinity).visited;
  const downtown = t.nearby(37.77, -122.42, 1, Infinity).visited;
  expect(downtown).toBeGreaterThan(suburb);
  expect(t.stats().depth).toBeGreaterThan(10);
});

test('nearby() equals a brute-force scan for 100 queries at five radii', () => {
  const t = new QuadTree({ capacity: 100 });
  const biz = makeBusinesses();
  biz.forEach((b) => t.insert(b));
  const r = rng(99);
  for (let q = 0; q < 100; q++) {
    const lat = 37.4 + r() * 0.7;
    const lon = -122.7 + r() * 0.8;
    const radius = [0.5, 1, 2, 5, 20][q % 5];
    const expected = biz.filter((b) => haversineKm({ lat, lon }, b) <= radius).map((b) => b.id).sort((a, b) => a - b);
    const got = t.nearby(lat, lon, radius, Infinity).results.map((b) => b.id).sort((a, b) => a - b);
    expect(got, `query ${q}`).toEqual(expected);
  }
});

test('a search touches a small fraction of the tree', () => {
  const t = new QuadTree({ capacity: 100 });
  makeBusinesses().forEach((b) => t.insert(b));
  expect(t.nearby(37.77, -122.42, 0.5, 20).visited).toBeLessThan(t.stats().nodes / 4);
});

test('remove() takes a business out of search results', () => {
  const t = new QuadTree({ capacity: 4 });
  const pts = [{ id: 1, lat: 10, lon: 10 }, { id: 2, lat: 10.001, lon: 10 }];
  pts.forEach((p) => t.insert(p));
  expect(t.nearby(10, 10, 1).results.map((p) => p.id)).toEqual([1, 2]);
  expect(t.remove(1, 10, 10)).toBe(true);
  expect(t.nearby(10, 10, 1).results.map((p) => p.id)).toEqual([2]);
});

test('identical points cannot split a leaf forever (maxDepth stops it)', () => {
  const t = new QuadTree({ capacity: 2, maxDepth: 10 });
  for (let i = 0; i < 50; i++) t.insert({ id: i, lat: 1, lon: 1 });
  expect(t.stats().depth).toBeLessThanOrEqual(10);
  expect(t.nearby(1, 1, 1, Infinity).results).toHaveLength(50);
});

test('the memory sum: 200 million businesses at 100 per leaf is about 2 million leaves and 2 GB', () => {
  const m = memoryEstimate(200_000_000, 100);
  expect(m.leaves).toBe(2_000_000);
  expect(m.nodes).toBe(2_666_667);
  expect(m.bytes / 1e9).toBeCloseTo(1.87, 2);
});

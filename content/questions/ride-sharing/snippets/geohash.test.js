import { test, expect } from 'vitest';
import { bounds, cellSizeM, encode, haversineM, neighbours, offset } from './geohash.js';

test('known geohashes', () => {
  expect(encode(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');   // the classic example in Jutland, Denmark
  expect(encode(42.6, -5.6, 5)).toBe('ezs42');
  expect(encode(37.7749, -122.4194, 6)).toBe('9q8yyk');         // downtown San Francisco
});

test('a point lies inside its own cell, and a longer hash is a cell inside the shorter one', () => {
  const p = { lat: 12.9716, lon: 77.5946 };                       // Bengaluru
  const b = bounds(encode(p.lat, p.lon, 7));
  expect(p.lat).toBeGreaterThanOrEqual(b.latLo);
  expect(p.lat).toBeLessThan(b.latHi);
  expect(p.lon).toBeGreaterThanOrEqual(b.lonLo);
  expect(p.lon).toBeLessThan(b.lonHi);
  expect(encode(p.lat, p.lon, 7).startsWith(encode(p.lat, p.lon, 5))).toBe(true);
});

test('cell sizes at the equator: precision 5 ≈ 4.9 km, 6 ≈ 1.2 × 0.6 km, 7 ≈ 153 m', () => {
  const size = p => cellSizeM(encode(0.01, 0.01, p));
  expect(size(5).widthM).toBeCloseTo(4886, -1);
  expect(size(6).widthM).toBeCloseTo(1222, -1);
  expect(size(6).heightM).toBeCloseTo(611, -1);
  expect(size(7).widthM).toBeCloseTo(153, 0);
  // In San Francisco (37.8° N) a precision-6 cell is narrower: 1.22 km × cos(37.8°) ≈ 0.97 km
  expect(cellSizeM('9q8yyk').widthM).toBeCloseTo(966, -1);
});

test('neighbours of a one-character cell', () => {
  expect(neighbours('s')).toEqual({ n: 'u', ne: 'v', e: 't', se: 'm', s: 'k', sw: '7', w: 'e', nw: 'g' });
});

test('neighbours cross a prefix boundary and wrap across the antimeridian', () => {
  expect(neighbours('ezs42')).toEqual({
    n: 'ezs48', ne: 'ezs49', e: 'ezs43', se: 'ezs41', s: 'ezs40', sw: 'ezefp', w: 'ezefr', nw: 'ezefx',
  });
  expect(offset('b', 0, -1)).toBe('z');                            // west of -180° is +180°
  expect(neighbours('u').n).toBeNull();                            // nothing north of the pole
});

test('edge effect: two points 31 m apart share no prefix at all', () => {
  const a = { lat: 0.0001, lon: 0.0001 }, b = { lat: -0.0001, lon: -0.0001 };
  expect(Math.round(haversineM(a, b))).toBe(31);
  expect(encode(a.lat, a.lon, 6)).toBe('s00000');
  expect(encode(b.lat, b.lon, 6)).toBe('7zzzzz');
  // …which is why a search always includes the 8 neighbours
  expect(Object.values(neighbours('s00000'))).toContain('7zzzzz');
});

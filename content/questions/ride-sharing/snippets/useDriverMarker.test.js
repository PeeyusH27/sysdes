import { test, expect } from 'vitest';
import { lerpHeading, markerAt, planGlide } from './useDriverMarker.js';

const fix = (lat, lon, ts, heading = 90) => ({ lat, lon, ts, heading });

test('the first fix places the car; the next one glides there over one update interval', () => {
  const g1 = planGlide(null, fix(12.97, 77.59, 1_000), 0);
  expect(markerAt(g1, 0)).toEqual({ lat: 12.97, lon: 77.59, heading: 90 });

  const g2 = planGlide(g1, fix(12.97, 77.594, 5_000), 100);    // ~430 m east
  expect(markerAt(g2, 100).lon).toBeCloseTo(77.59, 6);          // no jump when the fix lands
  expect(markerAt(g2, 2_100).lon).toBeCloseTo(77.592, 6);       // halfway after 2 of 4 s
  expect(markerAt(g2, 9_000).lon).toBeCloseTo(77.594, 6);       // arrived, and stays there
});

test('a fix that lands mid-glide continues from where the marker is drawn', () => {
  const g1 = planGlide(null, fix(0, 0, 0), 0);
  const g2 = planGlide(g1, fix(0, 0.002, 4_000), 0);
  const drawn = markerAt(g2, 1_000);                            // a quarter of the way
  const g3 = planGlide(g2, fix(0, 0.003, 8_000), 1_000);
  expect(markerAt(g3, 1_000)).toEqual(drawn);
});

test('out-of-order and duplicate fixes are ignored', () => {
  const g1 = planGlide(planGlide(null, fix(0, 0, 0), 0), fix(0, 0.001, 8_000), 0);
  expect(planGlide(g1, fix(0, 0.0005, 4_000), 10)).toBe(g1);
  expect(planGlide(g1, fix(0, 0.001, 8_000), 10)).toBe(g1);
});

test('a big jump (reconnect after a gap) snaps instead of sliding through buildings', () => {
  const g1 = planGlide(null, fix(0, 0, 0), 0);
  const g2 = planGlide(g1, fix(0, 0.01, 60_000), 60_000);      // ~1.1 km away
  expect(g2.duration).toBe(0);
  expect(markerAt(g2, 60_000).lon).toBe(0.01);
});

test('headings turn the short way round', () => {
  expect(lerpHeading(350, 10, 0.5)).toBeCloseTo(0, 9);
  expect(lerpHeading(10, 350, 0.5)).toBeCloseTo(0, 9);
  expect(lerpHeading(0, 90, 0.5)).toBe(45);
  expect(lerpHeading(270, 0, 1)).toBe(0);
});

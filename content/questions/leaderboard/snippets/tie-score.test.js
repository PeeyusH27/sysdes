import { test, expect } from 'vitest';
import { encode, decode, addPoints, seasonSeconds, MAX_POINTS, MAX_TS, TIME_SPAN } from './tie-score.js';

test('round-trips points and time', () => {
  expect(decode(encode(1250, 3_600))).toEqual({ points: 1250, tsSec: 3_600 });
  expect(decode(encode(0, 0))).toEqual({ points: 0, tsSec: 0 });
});

test('equal points: whoever got there first sorts higher', () => {
  const leo = encode(950, 100);    // reached 950 at t = 100 s
  const maya = encode(950, 4_000); // reached 950 later
  expect(leo).toBeGreaterThan(maya);
});

test('more points always win, whatever the time', () => {
  expect(encode(951, MAX_TS)).toBeGreaterThan(encode(950, 0));
});

test('the limits fill exactly 53 bits', () => {
  expect(MAX_POINTS).toBe(33_554_431);
  expect(TIME_SPAN).toBe(268_435_456);
  expect(encode(MAX_POINTS, 0)).toBe(Number.MAX_SAFE_INTEGER); // 2^53 − 1
  expect(() => encode(MAX_POINTS + 1, 0)).toThrow(RangeError);
  expect(() => encode(10.5, 0)).toThrow(RangeError);
  expect(() => encode(10, MAX_TS + 1)).toThrow(RangeError);
});

test('past 2^53 a double silently rounds and the decode is wrong', () => {
  expect(2 ** 53 + 1).toBe(2 ** 53);
  const unsafe = (MAX_POINTS + 1) * TIME_SPAN + MAX_TS; // what encode refuses to build
  expect(decode(unsafe)).toEqual({ points: MAX_POINTS + 2, tsSec: MAX_TS }); // one point too many, wrong time
});

test('the "score + fraction" trick collides once scores grow', () => {
  const at = ms => 1_000_000 + (1 - ms / 1e13);
  expect(at(1_700_000_000_001)).toBe(at(1_700_000_000_002)); // two different times, one double
});

test('adding points moves the time forward too', () => {
  const c = addPoints(encode(1200, 50), 50, 90);
  expect(decode(c)).toEqual({ points: 1250, tsSec: 90 });
  expect(seasonSeconds(Date.UTC(2026, 9, 13, 0, 1), Date.UTC(2026, 9, 13))).toBe(60);
});

import { test, expect } from 'vitest';
import { boardKeys, isoWeek, dailyKeysOfWeek } from './periods.js';

const at = iso => Date.parse(iso);

test('a match lands on the all-time, daily and weekly boards', () => {
  expect(boardKeys('g1', at('2026-10-13T20:14:07Z'))).toEqual({
    all: 'lb:{g1}:all',
    daily: 'lb:{g1}:daily:2026-10-13',
    weekly: 'lb:{g1}:weekly:2026-W42',
  });
});

test('a late event still counts for the day it was played', () => {
  expect(boardKeys('g1', at('2026-10-13T23:59:59.900Z')).daily).toBe('lb:{g1}:daily:2026-10-13');
  expect(boardKeys('g1', at('2026-10-14T00:00:00Z')).daily).toBe('lb:{g1}:daily:2026-10-14');
});

test('ISO weeks at year boundaries', () => {
  expect(isoWeek(at('2026-01-01T12:00:00Z'))).toBe('2026-W01');   // a Thursday
  expect(isoWeek(at('2025-12-29T12:00:00Z'))).toBe('2026-W01');   // Monday of that week
  expect(isoWeek(at('2027-01-01T12:00:00Z'))).toBe('2026-W53');   // 2026 has 53 weeks
  expect(isoWeek(at('2026-10-19T00:00:00Z'))).toBe('2026-W43');   // Monday starts a new week
});

test('the seven daily keys of a week, Monday first', () => {
  const keys = dailyKeysOfWeek('g1', at('2026-10-13T08:00:00Z'));
  expect(keys[0]).toBe('lb:{g1}:daily:2026-10-12');
  expect(keys[6]).toBe('lb:{g1}:daily:2026-10-18');
  expect(dailyKeysOfWeek('g1', at('2026-10-18T23:00:00Z'))).toEqual(keys);  // Sunday: same week
});

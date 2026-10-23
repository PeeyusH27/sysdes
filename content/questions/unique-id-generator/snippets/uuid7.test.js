import { test, expect } from 'vitest';
import { uuid7 } from './uuid7.js';

test('format: version 7, variant 10', () => {
  const id = uuid7(1_767_225_600_000);
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('the first 48 bits are the millisecond timestamp', () => {
  const ms = 1_767_225_600_000;                         // 2026-01-01T00:00:00Z
  const id = uuid7(ms);
  const hex = id.replace(/-/g, '').slice(0, 12);
  expect(parseInt(hex, 16)).toBe(ms);
});

test('ids made at later milliseconds sort after earlier ones as plain strings', () => {
  const ids = [1000, 1001, 5000, 90_000_000_000].map((t) => uuid7(t));
  expect([...ids].sort()).toEqual(ids);
});

test('two ids in the same millisecond differ (random bits)', () => {
  expect(uuid7(1234)).not.toBe(uuid7(1234));
});

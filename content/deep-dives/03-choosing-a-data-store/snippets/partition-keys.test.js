import { expect, test } from 'vitest';
import { dayBucket, readKeys, spreadKey } from './partition-keys.js';

test('dayBucket makes one partition per chat per UTC day', () => {
  expect(dayBucket('chat55', new Date('2026-10-24T23:59:59Z'))).toBe('chat55#2026-10-24');
  expect(dayBucket('chat55', new Date('2026-10-25T00:00:00Z'))).toBe('chat55#2026-10-25');
});

test('spreadKey stays inside 0..n-1', () => {
  expect(spreadKey('likes:p9', 4, () => 0)).toBe('likes:p9#0');
  expect(spreadKey('likes:p9', 4, () => 0.999999)).toBe('likes:p9#3');
});

test('every key a write can pick is one a read asks for', () => {
  const all = new Set(readKeys('likes:p9', 4));
  for (const r of [0, 0.3, 0.6, 0.99]) expect(all.has(spreadKey('likes:p9', 4, () => r))).toBe(true);
  expect(all.size).toBe(4);
});

test('rejects a bad n', () => {
  expect(() => spreadKey('k', 0)).toThrow(RangeError);
  expect(() => readKeys('k', 1.5)).toThrow(RangeError);
});

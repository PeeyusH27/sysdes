import { test, expect } from 'vitest';
import { RoomHolds } from './hold.js';

test('a hold lasts exactly ten minutes, with no waiting', () => {
  let t = 0;
  const holds = new RoomHolds(() => t);
  expect(holds.hold('A')).toBe(true);
  t = 599_999;
  expect(holds.isHeld('A')).toBe(true);
  expect(holds.hold('A')).toBe(false);
  t = 600_000;
  expect(holds.isHeld('A')).toBe(false);
  expect(holds.hold('A')).toBe(true);
});

test('holds are per room', () => {
  const holds = new RoomHolds(() => 0);
  holds.hold('A');
  expect(holds.isHeld('B')).toBe(false);
});

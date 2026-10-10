import { expect, test } from 'vitest';
import { inQuietHours, nextAllowedSendTime } from './quiet-hours.js';

const mumbai = { tz: 'Asia/Kolkata', quietHours: { start: 22, end: 8 } };   // IST is UTC+5:30

test('documented example: 21:30 UTC is 03:00 in Kolkata, inside 22–8', () => {
  expect(inQuietHours(new Date('2026-10-10T21:30:00Z'), mumbai)).toBe(true);
});

test('windows that cross midnight', () => {
  expect(inQuietHours(new Date('2026-10-10T06:30:00Z'), mumbai)).toBe(false);   // 12:00 IST
  expect(inQuietHours(new Date('2026-10-10T16:30:00Z'), mumbai)).toBe(true);    // 22:00 IST, start is inclusive
  expect(inQuietHours(new Date('2026-10-10T18:30:00Z'), mumbai)).toBe(true);    // 00:00 IST (hour 0, not 24)
  expect(inQuietHours(new Date('2026-10-10T02:30:00Z'), mumbai)).toBe(false);   // 08:00 IST, end is exclusive
});

test('windows inside one day', () => {
  const siesta = { tz: 'Europe/Madrid', quietHours: { start: 14, end: 16 } };
  expect(inQuietHours(new Date('2026-07-01T12:30:00Z'), siesta)).toBe(true);    // 14:30 CEST
  expect(inQuietHours(new Date('2026-07-01T14:30:00Z'), siesta)).toBe(false);   // 16:30 CEST
});

test('the same instant can be quiet for one user and not another', () => {
  const now = new Date('2026-10-10T21:30:00Z');
  expect(inQuietHours(now, mumbai)).toBe(true);                                   // 03:00 in Kolkata
  expect(inQuietHours(now, { tz: 'America/New_York', quietHours: { start: 22, end: 8 } })).toBe(false);   // 17:30 in New York
});

test('next allowed send time is the end of the quiet window, in local time', () => {
  // 23:30 IST → 08:00 IST the next day
  expect(new Date(nextAllowedSendTime(mumbai, new Date('2026-10-10T18:00:00Z'))).toISOString()).toBe('2026-10-11T02:30:00.000Z');
  // 03:00 IST → 08:00 IST the same day
  expect(new Date(nextAllowedSendTime(mumbai, new Date('2026-10-10T21:30:00Z'))).toISOString()).toBe('2026-10-11T02:30:00.000Z');
});

test('outside quiet hours (or without them) a message can go now', () => {
  const noon = new Date('2026-10-10T06:30:00Z');
  expect(nextAllowedSendTime(mumbai, noon)).toBe(noon.getTime());
  expect(nextAllowedSendTime({ tz: 'Asia/Kolkata' }, noon)).toBe(noon.getTime());
});

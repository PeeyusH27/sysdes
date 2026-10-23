import { test, expect } from 'vitest';
import { RoomsRacy } from './race-before.js';
import { Rooms } from './race-after.js';

test('before: check then act lets two callers book the same room', async () => {
  const rooms = new RoomsRacy();
  const results = await Promise.all([rooms.book('A', 'ann'), rooms.book('A', 'bob')]);
  expect(results).toEqual([true, true]);
});

test('after: exactly one of several callers gets the room', async () => {
  const rooms = new Rooms();
  const results = await Promise.all(['ann', 'bob', 'cy'].map((who) => rooms.book('A', who)));
  expect(results).toEqual([true, false, false]);
  expect(rooms.owner('A')).toBe('ann');
});

test('after: other rooms are unaffected', async () => {
  const rooms = new Rooms();
  const results = await Promise.all([rooms.book('A', 'ann'), rooms.book('B', 'bob')]);
  expect(results).toEqual([true, true]);
});

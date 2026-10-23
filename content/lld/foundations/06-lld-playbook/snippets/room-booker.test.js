import { test, expect } from 'vitest';
import { RoomBooker, overlaps } from './room-booker.js';

test('back-to-back meetings do not clash, overlapping ones do', () => {
  expect(overlaps({ start: 9, end: 10 }, { start: 10, end: 11 })).toBe(false);
  expect(overlaps({ start: 9, end: 11 }, { start: 10, end: 12 })).toBe(true);
  expect(overlaps({ start: 9, end: 12 }, { start: 10, end: 11 })).toBe(true);
});

test('a booking blocks the room only for its own slot', () => {
  const booker = new RoomBooker(['A', 'B']);
  expect(booker.book('A', 9, 10, 'ann')).toBe(true);
  expect(booker.book('A', 9, 10, 'bob')).toBe(false);
  expect(booker.book('A', 10, 11, 'bob')).toBe(true);
  expect(booker.book('B', 9, 10, 'bob')).toBe(true);
});

test('freeRooms lists rooms with no clash in the slot', () => {
  const booker = new RoomBooker(['A', 'B', 'C']);
  booker.book('A', 9, 11, 'ann');
  booker.book('B', 10, 12, 'bob');
  expect(booker.freeRooms(9, 10)).toEqual(['B', 'C']);
  expect(booker.freeRooms(10, 11)).toEqual(['C']);
});

test('rejects an empty or backwards slot and an unknown room', () => {
  const booker = new RoomBooker(['A']);
  expect(() => booker.book('A', 10, 10, 'ann')).toThrow('start must be before end');
  expect(() => booker.book('A', 11, 10, 'ann')).toThrow('start must be before end');
  expect(() => booker.isFree('Z', 9, 10)).toThrow('unknown room: Z');
});

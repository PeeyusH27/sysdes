import { test, expect } from 'vitest';
import { Door } from './door-flags.js';

test('the happy path works', () => {
  const door = new Door();
  door.open();
  door.close();
  door.lock();
  expect([door.isOpen, door.isLocked]).toEqual([false, true]);
});

test('the flags allow a door that is open and locked at once', () => {
  const door = new Door();
  door.open();
  door.lock();
  expect([door.isOpen, door.isLocked]).toEqual([true, true]); // impossible, and nothing said no
});

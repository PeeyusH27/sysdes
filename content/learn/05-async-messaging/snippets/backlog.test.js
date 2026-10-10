import { expect, test } from 'vitest';
import { backlogAfter, drainSeconds, inFlight, waitSeconds, workersNeeded } from './backlog.js';

test('1,000 msg/s in, 800 msg/s out: +200/s, 720K after an hour', () => {
  expect(backlogAfter(1000, 800, 1)).toBe(200);
  expect(backlogAfter(1000, 800, 3600)).toBe(720_000);
  expect(backlogAfter(800, 1000, 3600)).toBe(0);          // consumers keep up: no backlog
});

test('a message behind a 720K backlog waits 15 minutes', () => {
  expect(waitSeconds(720_000, 800)).toBe(900);
  expect(waitSeconds(720_000, 800) / 60).toBe(15);
});

test("Little's law sizes the worker pool", () => {
  expect(inFlight(1000, 0.2)).toBe(200);
  expect(workersNeeded(1000, 200)).toBe(286);
  expect(workersNeeded(1000, 200, 1)).toBe(200);
});

test('draining needs spare capacity', () => {
  expect(drainSeconds(720_000, 1000, 1200)).toBe(3600);
  expect(drainSeconds(720_000, 1000, 1000)).toBe(Infinity);
});

import { test, expect } from 'vitest';
import { fcfs, sjf, roundRobin } from './scheduler.js';

const jobs = [{ name: 'A', burst: 24 }, { name: 'B', burst: 3 }, { name: 'C', burst: 3 }];

test('FCFS: a long job in front makes the short ones wait (average wait 17)', () => {
  const r = fcfs(jobs);
  expect(r.finish).toEqual({ A: 24, B: 27, C: 30 });
  expect(r.avgWait).toBe(17);
  expect(r.avgTurnaround).toBe(27);
});

test('SJF has the lowest average wait (3), because short jobs stop blocking', () => {
  const r = sjf(jobs);
  expect(r.finish).toEqual({ B: 3, C: 6, A: 30 });
  expect(r.avgWait).toBe(3);
  expect(r.avgTurnaround).toBe(13);
});

test('round robin with a 4 ms quantum sits between them and keeps everyone moving', () => {
  const r = roundRobin(jobs, 4);
  expect(r.finish).toEqual({ B: 7, C: 10, A: 30 });
  expect(r.avgWait).toBeCloseTo(17 / 3, 5);
  expect(r.avgTurnaround).toBeCloseTo(47 / 3, 5);
});

test('round robin with a huge quantum is just FCFS', () => {
  expect(roundRobin(jobs, 1000).avgWait).toBe(fcfs(jobs).avgWait);
});

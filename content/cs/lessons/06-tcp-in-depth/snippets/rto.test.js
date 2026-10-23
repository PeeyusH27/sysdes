import { test, expect } from 'vitest';
import { makeRto } from './rto.js';

test('first sample: srtt = 100, rttvar = 50, so the timeout is 100 + 4 x 50 = 300 ms', () => {
  expect(makeRto()(100)).toEqual({ srtt: 100, rttvar: 50, rto: 300 });
});

test('second sample of 120 ms: srtt 102.5, rttvar 42.5, timeout 272.5 ms', () => {
  const sample = makeRto({ minMs: 0 });
  sample(100);
  expect(sample(120)).toEqual({ srtt: 102.5, rttvar: 42.5, rto: 272.5 });
});

test('a steady link drives the variation toward zero, so the timeout approaches the round trip (down to the floor)', () => {
  const sample = makeRto({ minMs: 0 });
  let last;
  for (let i = 0; i < 60; i++) last = sample(40);
  expect(last.rto).toBeCloseTo(40, 0);
  expect(makeRto({ minMs: 200 })(40).rto).toBe(200);
});

test('a jittery link keeps the timeout well above the average round trip', () => {
  const sample = makeRto({ minMs: 0 });
  let last;
  for (let i = 0; i < 40; i++) last = sample(i % 2 ? 40 : 160);
  expect(last.rto).toBeGreaterThan(200);
});

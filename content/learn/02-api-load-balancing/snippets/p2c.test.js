import { expect, test } from 'vitest';
import { pickP2C } from './p2c.js';

// Small seeded generator so the test is repeatable
const seeded = (seed) => () => {
  seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32;
  return seed / 2 ** 32;
};

test('never picks the busiest server, because its partner is always a different, less loaded one', () => {
  const servers = [
    { id: 'a', active: 0, healthy: true },
    { id: 'b', active: 1, healthy: true },
    { id: 'c', active: 2, healthy: true },
  ];
  const rand = seeded(42);
  const counts = { a: 0, b: 0, c: 0 };
  const N = 30_000;
  for (let i = 0; i < N; i++) counts[pickP2C(servers, rand).id]++;
  expect(counts.c).toBe(0);
  expect(counts.a / N).toBeCloseTo(2 / 3, 1);   // a is in 2 of the 3 possible pairs
  expect(counts.b / N).toBeCloseTo(1 / 3, 1);
});

test('ignores unhealthy servers', () => {
  const servers = [
    { id: 'a', active: 0, healthy: false },
    { id: 'b', active: 9, healthy: true },
    { id: 'c', active: 5, healthy: true },
  ];
  expect(pickP2C(servers, seeded(1)).id).toBe('c');
  servers[2].healthy = false;
  expect(pickP2C(servers).id).toBe('b');        // only one left
  servers[1].healthy = false;
  expect(pickP2C(servers)).toBeUndefined();     // none left: the caller returns 503
});

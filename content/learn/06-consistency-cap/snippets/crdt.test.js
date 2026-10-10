import { expect, test } from 'vitest';
import { increment, merge, mergeLWW, value } from './crdt.js';

test('LWW keeps the newer write and silently drops the other', () => {
  const alice = { value: ['book'], ts: 100, node: 'eu' };
  const bob = { value: ['pen'], ts: 101, node: 'us' };
  expect(mergeLWW(alice, bob)).toBe(bob);
  expect(mergeLWW(bob, alice)).toBe(bob);                 // same answer in either order
  const tie = { value: ['cup'], ts: 101, node: 'ap' };
  expect(mergeLWW(bob, tie)).toBe(bob);                   // equal timestamps: the higher node id wins
});

test('G-Counter: replicas converge without coordination', () => {
  const a = increment({}, 'a');
  const b = increment(increment({}, 'b'), 'b');
  expect(merge(a, b)).toEqual({ a: 1, b: 2 });
  expect(value(merge(a, b))).toBe(3);
  expect(merge(a, b)).toEqual(merge(b, a));               // commutative
  expect(merge(merge(a, b), b)).toEqual(merge(a, b));     // idempotent: re-delivering a state is harmless
});

test('concurrent increments are never lost (unlike LWW on a number)', () => {
  let eu = {}, us = {};
  for (let i = 0; i < 5; i++) eu = increment(eu, 'eu');   // 5 likes during a partition
  for (let i = 0; i < 3; i++) us = increment(us, 'us');   // 3 likes on the other side
  expect(value(merge(eu, us))).toBe(8);
});

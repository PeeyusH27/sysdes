import { test, expect } from 'vitest';
import { compare, increment, merge, siblings } from './vector-clock.js';

test('a later write by the same chain of nodes is after the earlier one', () => {
  const v1 = increment({}, 'A');             // A writes: { A: 1 }
  const v2 = increment(v1, 'A');             // A writes again, having seen v1
  expect(compare(v2, v1)).toBe('after');
  expect(compare(v1, v2)).toBe('before');
  expect(compare(v1, { A: 1 })).toBe('equal');
});

test('two nodes that wrote without seeing each other are concurrent', () => {
  const base = increment({}, 'A');           // { A: 1 }
  const viaB = increment(base, 'B');         // { A: 1, B: 1 }
  const viaC = increment(base, 'C');         // { A: 1, C: 1 }
  expect(compare(viaB, viaC)).toBe('concurrent');
  expect(compare(base, viaB)).toBe('before');
});

test('the classic shopping-cart story: a partition makes two versions, the client merges them', () => {
  const cart0 = { value: ['book'], clock: increment({}, 'A') };
  const cartB = { value: ['book', 'pen'], clock: increment(cart0.clock, 'B') };       // written during a partition
  const cartC = { value: ['book', 'mug'], clock: increment(cart0.clock, 'C') };       // written on the other side
  // a read after the partition heals returns both, and drops the ancestor
  const found = siblings([cart0, cartB, cartC]);
  expect(found.map((v) => v.value)).toEqual([['book', 'pen'], ['book', 'mug']]);
  // the client merges (union) and writes back with the merged clock
  const mergedClock = increment(merge(cartB.clock, cartC.clock), 'A');
  const mergedCart = { value: ['book', 'pen', 'mug'], clock: mergedClock };
  expect(siblings([cartB, cartC, mergedCart])).toEqual([mergedCart]);
});

test('exact duplicates collapse to one sibling', () => {
  const v = { value: 1, clock: { A: 1 } };
  expect(siblings([v, { ...v }])).toHaveLength(1);
});

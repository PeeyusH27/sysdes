import { test, expect } from 'vitest';
import { findCycle, inLockOrder } from './deadlock.js';

test('two threads waiting on each other are a deadlock', () => {
  expect(findCycle({ t1: 't2', t2: 't1' })).toEqual(['t1', 't2']);
});

test('a chain of waiters is not a deadlock: the last thread is running', () => {
  expect(findCycle({ t1: 't2', t2: 't3' })).toBeNull();
});

test('a cycle of three is found even when another thread merely waits on it', () => {
  expect(findCycle({ t0: 't1', t1: 't2', t2: 't3', t3: 't1' })).toEqual(['t1', 't2', 't3']);
});

test('taking locks in id order gives both transfers the same first lock', () => {
  expect(inLockOrder(3, 7)).toEqual([3, 7]);
  expect(inLockOrder(7, 3)).toEqual([3, 7]);
});

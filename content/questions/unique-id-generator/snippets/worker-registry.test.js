import { test, expect } from 'vitest';
import { WorkerRegistry, mayIssue } from './worker-registry.js';

test('every live server gets a different worker id', () => {
  const r = new WorkerRegistry(1024, 30_000);
  const ids = ['a', 'b', 'c'].map((o) => r.acquire(o, 0).workerId);
  expect(ids).toEqual([0, 1, 2]);
});

test('a restarted server gets its own id back while its lease is live', () => {
  const r = new WorkerRegistry();
  r.acquire('a', 0);
  expect(r.acquire('a', 1000).workerId).toBe(0);
});

test('a dead server\'s id is reused only after its lease expires', () => {
  const r = new WorkerRegistry(1024, 30_000);
  r.acquire('a', 0);                                     // id 0 until t = 30,000
  expect(r.acquire('b', 10_000).workerId).toBe(1);       // still leased: b gets 1
  expect(r.acquire('c', 30_000).workerId).toBe(0);       // expired: c may take 0
});

test('a server that missed its renewal cannot renew an id someone else now holds', () => {
  const r = new WorkerRegistry(1024, 30_000);
  const a = r.acquire('a', 0);
  r.acquire('c', 40_000);                                // takes id 0 after a's lease lapsed
  expect(r.renew(a.workerId, 'a', 41_000)).toBeNull();
});

test('the generator stops a margin before its lease ends, so clock skew cannot create overlap', () => {
  const lease = { workerId: 0, expiresAt: 30_000 };
  expect(mayIssue(lease, 20_000)).toBe(true);
  expect(mayIssue(lease, 25_001)).toBe(false);           // inside the 5 s margin
});

test('the registry is full after 1,024 live servers', () => {
  const r = new WorkerRegistry(1024, 30_000);
  for (let i = 0; i < 1024; i++) r.acquire(`s${i}`, 0);
  expect(() => r.acquire('one-too-many', 1)).toThrow(/no free worker id/);
});

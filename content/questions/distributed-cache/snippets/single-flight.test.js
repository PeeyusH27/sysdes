import { test, expect } from 'vitest';
import { SingleFlight, getOrLoad, jitter } from './single-flight.js';
import { LruCache } from './lru-cache.js';

test('1,000 simultaneous misses cause exactly one database read', async () => {
  const flights = new SingleFlight();
  const cache = new LruCache(100);
  let dbReads = 0;
  const load = async () => { dbReads++; await new Promise((r) => setTimeout(r, 5)); return 'row'; };
  const results = await Promise.all(Array.from({ length: 1000 }, () => getOrLoad({ cache, flights, key: 'hot', load })));
  expect(dbReads).toBe(1);
  expect(results.every((v) => v === 'row')).toBe(true);
});

test('different keys load in parallel; the same key does not', async () => {
  const flights = new SingleFlight();
  const calls = [];
  const load = (k) => async () => { calls.push(k); await new Promise((r) => setTimeout(r, 2)); return k; };
  await Promise.all([flights.do('a', load('a')), flights.do('a', load('a')), flights.do('b', load('b'))]);
  expect(calls.sort()).toEqual(['a', 'b']);
});

test('a failed load is not cached or remembered: the next request tries again', async () => {
  const flights = new SingleFlight();
  let n = 0;
  const flaky = async () => { if (++n === 1) throw new Error('db down'); return 'ok'; };
  await expect(flights.do('k', flaky)).rejects.toThrow('db down');
  await expect(flights.do('k', flaky)).resolves.toBe('ok');
});

test('a missing row is cached briefly, so repeated requests for it skip the database', async () => {
  let t = 0;
  const cache = new LruCache(100, { now: () => t });
  const flights = new SingleFlight();
  let dbReads = 0;
  const load = async () => { dbReads++; return null; };
  for (let i = 0; i < 50; i++) expect(await getOrLoad({ cache, flights, key: 'ghost', load })).toBeNull();
  expect(dbReads).toBe(1);
  t += 6000;                                             // the 5 s negative entry has expired
  await getOrLoad({ cache, flights, key: 'ghost', load });
  expect(dbReads).toBe(2);
});

test('jittered TTLs spread expiry over a +/-10% window', () => {
  let s = 3;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const ttls = Array.from({ length: 1000 }, () => jitter(60_000, 0.1, rnd));
  expect(Math.min(...ttls)).toBeGreaterThanOrEqual(54_000);
  expect(Math.max(...ttls)).toBeLessThanOrEqual(66_000);
  expect(new Set(ttls).size).toBeGreaterThan(500);
});

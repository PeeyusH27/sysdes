import { afterEach, expect, test, vi } from 'vitest';
import { OFFER_TIMEOUT_MS, matchRide, memoryStore, rankByEta } from './match.js';

afterEach(() => vi.useRealTimers());

const ranked = ids => ids.map(id => ({ id }));
const answers = map => async id => map[id];                     // each driver's answer, immediately

test('the first candidate who accepts gets the ride', async () => {
  const store = memoryStore(['d1', 'd2']);
  const r = await matchRide({ id: 'r1' }, ranked(['d1', 'd2']), { store, offer: answers({ d1: 'accept' }) });
  expect(r).toEqual({ driverId: 'd1', tried: [{ id: 'd1', result: 'accepted' }] });
  expect(await store.get('d1')).toMatchObject({ state: 'ON_TRIP', rideId: 'r1' });
  expect(await store.get('d2')).toMatchObject({ state: 'AVAILABLE' });
});

test('a decline frees the driver and the offer moves to the next candidate', async () => {
  const store = memoryStore(['d1', 'd2']);
  const r = await matchRide({ id: 'r1' }, ranked(['d1', 'd2']), { store, offer: answers({ d1: 'decline', d2: 'accept' }) });
  expect(r.driverId).toBe('d2');
  expect(r.tried.map(t => t.result)).toEqual(['decline', 'accepted']);
  expect(await store.get('d1')).toMatchObject({ state: 'AVAILABLE', rideId: null });
});

test('no answer within 12 s counts as a decline', async () => {
  vi.useFakeTimers();
  const store = memoryStore(['d1', 'd2']);
  const offer = id => (id === 'd1' ? new Promise(() => {}) : Promise.resolve('accept'));   // d1's phone is in a tunnel
  const pending = matchRide({ id: 'r1' }, ranked(['d1', 'd2']), { store, offer });
  await vi.advanceTimersByTimeAsync(OFFER_TIMEOUT_MS - 1);
  expect(await store.get('d1')).toMatchObject({ state: 'OFFERED', rideId: 'r1' });   // still waiting
  await vi.advanceTimersByTimeAsync(1);
  const r = await pending;
  expect(r.tried).toEqual([{ id: 'd1', result: 'timeout' }, { id: 'd2', result: 'accepted' }]);
  expect(await store.get('d1')).toMatchObject({ state: 'AVAILABLE' });
});

test('two matchers racing for the same drivers never share one', async () => {
  for (let round = 0; round < 50; round++) {
    const store = memoryStore(['d1', 'd2', 'd3']);
    // each ride's answers take a different number of event-loop turns per round, so the matchers interleave differently
    const offer = async (_id, ride) => {
      for (let i = 0; i < (ride.id === 'A' ? round % 3 : (round * 7) % 5); i++) await Promise.resolve();
      return 'accept';
    };
    const [a, b] = await Promise.all([
      matchRide({ id: 'A' }, ranked(['d1', 'd2', 'd3']), { store, offer }),
      matchRide({ id: 'B' }, ranked(['d1', 'd2', 'd3']), { store, offer }),
    ]);
    expect(a.driverId).not.toBeNull();
    expect(b.driverId).not.toBeNull();
    expect(a.driverId).not.toBe(b.driverId);
    expect([...a.tried, ...b.tried].filter(t => t.result === 'taken')).toHaveLength(1);
    expect(await store.get(a.driverId)).toMatchObject({ state: 'ON_TRIP', rideId: 'A' });
    expect(await store.get(b.driverId)).toMatchObject({ state: 'ON_TRIP', rideId: 'B' });
  }
});

test('without compare-and-set, the same race double-assigns', async () => {
  const state = new Map([['d1', 'AVAILABLE']]);
  const naive = async rideId => {
    const s = await Promise.resolve(state.get('d1'));             // read…
    if (s !== 'AVAILABLE') return null;
    await Promise.resolve();                                     // …a network hop later…
    state.set('d1', `OFFERED:${rideId}`);                        // …write
    return 'd1';
  };
  expect(await Promise.all([naive('A'), naive('B')])).toEqual(['d1', 'd1']);   // both think they own d1
});

test('a matcher that crashes mid-offer strands the driver only until the reservation expires', async () => {
  let now = 0;
  const store = memoryStore(['d1'], () => now);
  expect(await store.cas('d1', { state: 'AVAILABLE' }, { state: 'OFFERED', rideId: 'r1', ttlMs: 15_000 })).toBe(true);
  // …the matcher process dies here and never releases d1
  now = 14_999;
  expect(await store.cas('d1', { state: 'AVAILABLE' }, { state: 'OFFERED', rideId: 'r2', ttlMs: 15_000 })).toBe(false);
  now = 15_000;
  expect(await store.cas('d1', { state: 'AVAILABLE' }, { state: 'OFFERED', rideId: 'r2', ttlMs: 15_000 })).toBe(true);
});

test('an accept that arrives after the reservation expired does not assign the driver', async () => {
  let now = 0;
  const store = memoryStore(['d1', 'd2'], () => now);
  const offer = async id => {
    if (id === 'd1') now += 20_000;                              // a stalled matcher sees d1's accept 20 s late
    return 'accept';
  };
  const r = await matchRide({ id: 'r1' }, ranked(['d1', 'd2']), { store, offer });
  // the reservation (12 s offer + 3 s grace) expired at 15 s, so the late accept can't claim d1
  expect(r.tried[0]).toEqual({ id: 'd1', result: 'expired' });
  expect(r.driverId).toBe('d2');
});

test('rankByEta keeps the quickest drivers, not the closest', async () => {
  const shortlist = [{ id: 'across-river', distanceM: 300 }, { id: 'same-side', distanceM: 900 }];
  const eta = async id => (id === 'across-river' ? 540 : 180);   // the bridge is 2 km away
  const best = await rankByEta(shortlist, { lat: 0, lon: 0 }, eta, 1);
  expect(best).toEqual([{ id: 'same-side', distanceM: 900, etaS: 180 }]);
});

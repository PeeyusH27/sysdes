// Offer a ride to one driver at a time. A driver's state changes only through compare-and-set,
// so two matchers racing for the same driver can't both win:
//   AVAILABLE → OFFERED (reserve) → ON_TRIP (accepted), or OFFERED → AVAILABLE (declined, timed out).
// store.cas(driverId, expected, next) must be atomic: a Lua script in Redis, or in SQL
//   UPDATE drivers SET state = 'OFFERED', ride_id = $1 WHERE id = $2 AND state = 'AVAILABLE'.

export const OFFER_TIMEOUT_MS = 12_000;
const OFFER_GRACE_MS = 3_000;                                   // the reservation outlives the offer a little

// Shortlist by straight-line distance (nearby.js), then rank by ETA from the routing service:
// across a river or a one-way grid, the closest car is often not the quickest.
export async function rankByEta(candidates, rider, eta, keep = 3) {
  const timed = await Promise.all(candidates.map(async c => ({ ...c, etaS: await eta(c.id, rider) })));
  return timed.sort((a, b) => a.etaS - b.etaS).slice(0, keep);
}

export async function matchRide(ride, ranked, { store, offer, timeoutMs = OFFER_TIMEOUT_MS }) {
  const tried = [];
  for (const { id } of ranked) {
    // Reserve first. If another matcher reserved this driver a moment ago, this fails and we move on.
    const reserved = await store.cas(id, { state: 'AVAILABLE' }, { state: 'OFFERED', rideId: ride.id, ttlMs: timeoutMs + OFFER_GRACE_MS });
    if (!reserved) {
      tried.push({ id, result: 'taken' });
      continue;
    }
    const answer = await answerWithin(offer(id, ride), timeoutMs);   // 'accept' | 'decline' | 'timeout'
    if (answer === 'accept' && (await store.cas(id, { state: 'OFFERED', rideId: ride.id }, { state: 'ON_TRIP', rideId: ride.id }))) {
      tried.push({ id, result: 'accepted' });
      return { driverId: id, tried };
    }
    // Declined, no answer, or the accept came after our reservation expired: free the driver, if still ours.
    await store.cas(id, { state: 'OFFERED', rideId: ride.id }, { state: 'AVAILABLE' });
    tried.push({ id, result: answer === 'accept' ? 'expired' : answer });
  }
  return { driverId: null, tried };                             // nobody took it: widen the search or tell the rider
}

function answerWithin(promise, ms) {
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(resolve, ms, 'timeout'); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// In-memory store with the same contract as the Redis one: the check and the write happen with no await
// in between. OFFERED carries a TTL, so a matcher that crashes mid-offer can't strand the driver.
export function memoryStore(ids, now = Date.now) {
  const free = { state: 'AVAILABLE', rideId: null, expiresAt: Infinity };
  const rows = new Map(ids.map(id => [id, free]));
  const read = id => (rows.get(id).expiresAt <= now() ? free : rows.get(id));
  return {
    async get(id) {
      return { ...read(id) };
    },
    async cas(id, expected, next) {
      const cur = read(id);
      if (cur.state !== expected.state) return false;
      if (expected.rideId !== undefined && cur.rideId !== expected.rideId) return false;
      rows.set(id, { state: next.state, rideId: next.rideId ?? null, expiresAt: next.ttlMs ? now() + next.ttlMs : Infinity });
      return true;
    },
  };
}

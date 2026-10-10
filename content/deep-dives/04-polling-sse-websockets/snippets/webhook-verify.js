import { createHmac, timingSafeEqual } from 'node:crypto';

// Verify a webhook: the provider signs `${timestamp}.${rawBody}` with a shared secret (HMAC-SHA256, hex).
// Signing the timestamp too means an attacker can't replay an old body with a fresh timestamp.
export function verifyWebhook({ rawBody, timestamp, signature, secret, nowSec = Date.now() / 1000, toleranceSec = 300 }) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > toleranceSec) return false;   // missing or stale: a replay?
  const expected = createHmac('sha256', secret).update(`${ts}.`).update(rawBody).digest();
  const given = Buffer.from(signature ?? '', 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);      // constant time: no timing leak
}

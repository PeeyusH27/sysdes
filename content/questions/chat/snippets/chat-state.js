// Pure client-side helpers used by useChat.js. No React, no sockets: easy to test.

// Messages without a seq (still sending) sort last. Infinity − Infinity is NaN, so `|| 0` keeps their send order.
const bySeq = (a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity) || 0;

// Insert or merge one message and return a new, sorted array.
// Matching by clientId collapses our optimistic bubble, the server's ack, our own echo and a sync replay into one entry.
export function upsertMessage(list, m) {
  const i = list.findIndex(x => (m.clientId ? x.clientId === m.clientId : x.seq === m.seq));
  const next = i >= 0 ? list.with(i, { ...list[i], ...m }) : [...list, m];
  return next.sort(bySeq);                                        // `next` is already a copy, so sorting it is safe
}

// Full-jitter backoff: a random wait in [0, min(cap, base × 2^attempt)), so a crowd of clients
// that lost the same gateway doesn't reconnect in lockstep.
export function reconnectDelay(attempt, random = Math.random, { baseMs = 1_000, capMs = 30_000 } = {}) {
  return random() * Math.min(capMs, baseMs * 2 ** attempt);
}

// Typing indicators are throttled: at most one `typing` event per conversation every `everyMs`.
export function typingThrottle(send, { everyMs = 3_000, now = Date.now } = {}) {
  let last = -Infinity;
  return () => {
    const t = now();
    if (t - last < everyMs) return false;                         // sent one recently: drop this keystroke
    last = t;
    send();
    return true;
  };
}

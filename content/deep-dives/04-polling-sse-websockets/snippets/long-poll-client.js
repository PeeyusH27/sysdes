import { backoffDelay } from './backoff.js';

// Long polling client. The source re-polled instantly on errors, so a down server caused a tight loop.
export async function longPoll(onEvents, signal) {
  let since = 0, failures = 0;
  while (!signal.aborted) {
    try {
      const r = await fetch(`/events?since=${since}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]) });
      if (r.status === 204) continue;                         // the server waited 30 s with no news: ask again
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { events, cursor } = await r.json();
      since = cursor; failures = 0;
      onEvents(events);
    } catch {
      if (signal.aborted) return;
      failures++;
      await new Promise(res => setTimeout(res, backoffDelay(failures)));   // 0–2 s, 0–4 s, … capped at 30 s
    }
  }
}

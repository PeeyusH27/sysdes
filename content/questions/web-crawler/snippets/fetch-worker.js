// @display-only: needs the network, a frontier service and an object store
// One fetcher worker. Many of these run in parallel; the frontier is what keeps them polite.
import { normalize, hostOf } from './normalize.js';
import { parseRobots } from './robots.js';

const UA = 'mycrawler/1.0 (+https://example.com/bot)';

export async function runWorker({ frontier, robotsCache, store, parseQueue }) {
  for (;;) {
    const { url, waitMs } = await frontier.next();             // blocks until some host is ready
    if (!url) { await sleep(Math.min(waitMs, 1000)); continue; }
    const host = hostOf(url);
    const started = Date.now();
    try {
      const robots = await robotsCache.get(host);              // cached 24 h; a failed fetch of robots.txt means "retry later"
      if (!robots.allowed(new URL(url).pathname)) { await frontier.done(url, { dropped: 'robots' }); continue; }

      const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 60_000;
        await frontier.done(url, { delayMs: retryAfter, retry: true });   // back off this host, try the URL again later
        continue;
      }
      if (res.status >= 300 && res.status < 400) {                         // follow redirects through the frontier, not inline
        const target = normalize(res.headers.get('location') ?? '', url);
        if (target) await parseQueue.publish({ type: 'link', url: target, from: url });
        await frontier.done(url, {});
        continue;
      }
      const html = await res.text();
      const key = await store.put(url, html);                              // object storage, keyed by content hash
      await parseQueue.publish({ type: 'page', url, key, fetchedAt: Date.now() });
      // Wait ten times as long as the fetch took, but at least Crawl-delay, so a slow site is not hammered.
      const delayMs = Math.max((robots.crawlDelaySec ?? 1) * 1000, 10 * (Date.now() - started));
      await frontier.done(url, { delayMs });
    } catch {
      await frontier.done(url, { delayMs: 30_000, retry: true });          // DNS failure, timeout, reset
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

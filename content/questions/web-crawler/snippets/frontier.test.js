import { test, expect } from 'vitest';
import { Frontier, hostsNeeded } from './frontier.js';

test('one host is never handed out twice inside its delay, and never to two workers at once', () => {
  const f = new Frontier({ defaultDelayMs: 1000 });
  for (const p of ['a1', 'a2', 'a3']) f.add(`https://a.example/${p}`);
  expect(f.next(0).url).toBe('https://a.example/a1');
  expect(f.next(0)).toEqual({ url: null, waitMs: Infinity });      // a1 is in flight
  f.done('https://a.example/a1', 100);                             // next turn at 1100
  expect(f.next(500)).toEqual({ url: null, waitMs: 600 });
  expect(f.next(1100).url).toBe('https://a.example/a2');
});

test('while one host waits, other hosts are served', () => {
  const f = new Frontier({ defaultDelayMs: 1000 });
  f.add('https://a.example/1');
  f.add('https://a.example/2');
  f.add('https://b.example/1');
  const order = [];
  for (let now = 0; order.length < 3; now += 100) {
    for (let r = f.next(now); r.url; r = f.next(now)) {      // take everything that is ready at this instant
      order.push([now, r.url]);
      f.done(r.url, now);
    }
  }
  expect(order).toEqual([
    [0, 'https://a.example/1'],
    [0, 'https://b.example/1'],
    [1000, 'https://a.example/2'],
  ]);
});

test('urgent URLs of a host come first', () => {
  const f = new Frontier({ defaultDelayMs: 0 });
  f.add('https://a.example/low', 2);
  f.add('https://a.example/urgent', 0);
  f.add('https://a.example/normal', 1);
  const got = [];
  for (let i = 0; i < 3; i++) {
    const { url } = f.next(0);
    got.push(url.split('/').pop());
    f.done(url, 0);
  }
  expect(got).toEqual(['urgent', 'normal', 'low']);
});

test('a host that publishes Crawl-delay gets it', () => {
  const f = new Frontier({ defaultDelayMs: 1000 });
  f.add('https://slow.example/1');
  f.add('https://slow.example/2');
  const { url } = f.next(0);
  f.done(url, 0, { delayMs: 10_000 });
  expect(f.next(9_999).url).toBeNull();
  expect(f.next(10_000).url).toBe('https://slow.example/2');
});

test('the per-host budget stops a trap from filling the frontier', () => {
  const f = new Frontier({ maxPerHost: 3 });
  const results = [1, 2, 3, 4, 5].map((i) => f.add(`https://trap.example/cal/${i}`));
  expect(results).toEqual([true, true, true, false, false]);
  expect(f.add('https://fine.example/')).toBe(true);
});

test('the sum behind per-host queues: 386 pages/s at a 10 s gap needs 3,860 hosts in play', () => {
  expect(hostsNeeded(386, 10)).toBe(3860);
  expect(Math.round((1e9 / (30 * 86_400)))).toBe(386);              // 1B pages a month is 386 a second
});

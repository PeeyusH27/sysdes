import { test, expect } from 'vitest';
import { HotKeyGuard } from './hot-keys.js';

function clock() {
  let t = 0;
  const f = () => t;
  f.advance = (ms) => { t += ms; };
  return f;
}

test('a key below the threshold always goes to the cache node', () => {
  const now = clock();
  const g = new HotKeyGuard({ threshold: 100, now });
  for (let i = 0; i < 50; i++) {
    expect(g.lookup('quiet')).toBeUndefined();
    g.remember('quiet', 'v');
  }
});

test('once a key crosses the threshold it is served locally, so the node sees far fewer requests', () => {
  const now = clock();
  const g = new HotKeyGuard({ threshold: 100, localTtlMs: 1000, now });
  let nodeReads = 0;
  const read = (key) => {
    const local = g.lookup(key);
    if (local !== undefined) return local;
    nodeReads++;
    g.remember(key, 'celebrity-profile');
    return 'celebrity-profile';
  };
  for (let i = 0; i < 5000; i++) { read('star'); if (i % 10 === 0) now.advance(1); }   // 5,000 reads over ~500 ms
  expect(nodeReads).toBeLessThan(150);                     // about 100 before it was noticed, then almost none
  expect(nodeReads).toBeGreaterThanOrEqual(100);
});

test('the local copy expires after its TTL so the value cannot stay stale for long', () => {
  const now = clock();
  const g = new HotKeyGuard({ threshold: 2, localTtlMs: 1000, now });
  g.lookup('k'); g.lookup('k');                            // now hot
  g.remember('k', 'v1');
  expect(g.lookup('k')).toBe('v1');
  now.advance(1001);
  expect(g.lookup('k')).toBeUndefined();                   // expired: re-fetch from the node
});

test('counts reset every second, so a key that cools down stops being treated as hot', () => {
  const now = clock();
  const g = new HotKeyGuard({ threshold: 3, now });
  g.lookup('k'); g.lookup('k'); g.lookup('k');
  expect(g.isHot('k')).toBe(true);
  now.advance(1000);
  g.lookup('other');
  expect(g.isHot('k')).toBe(false);
});

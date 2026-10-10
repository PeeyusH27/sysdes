import { expect, test } from 'vitest';
import { LeastConnections } from './least-connections.js';

test('stops sending to a slow server while it is still busy', async () => {
  const lb = new LeastConnections(['a', 'b', 'c']);
  const hits = [];
  let releaseC;
  const send = (url) => {
    hits.push(url);
    if (url === 'c') return new Promise((resolve) => { releaseC = resolve; });   // c is slow
    return Promise.resolve(`ok from ${url}`);
  };

  const first = [lb.handle(1, send), lb.handle(2, send), lb.handle(3, send)];   // a, b, c
  await Promise.all(first.slice(0, 2));                                          // a and b finish fast
  await Promise.all([4, 5, 6, 7].map((r) => lb.handle(r, send)));               // c still has 1 in flight
  expect(hits).toEqual(['a', 'b', 'c', 'a', 'b', 'a', 'b']);

  releaseC('ok from c');
  await first[2];
  expect(lb.servers.map((s) => s.active)).toEqual([0, 0, 0]);
});

test('frees the slot even when the request fails', async () => {
  const lb = new LeastConnections(['a']);
  await expect(lb.handle(1, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  expect(lb.servers[0].active).toBe(0);
});

test('skips unhealthy servers and fails when none are left', async () => {
  const lb = new LeastConnections(['a', 'b']);
  lb.servers[0].healthy = false;
  expect(await lb.handle(1, async (url) => url)).toBe('b');
  lb.servers[1].healthy = false;
  await expect(lb.handle(2, async (url) => url)).rejects.toThrow('no healthy servers');
});

import { expect, test, vi } from 'vitest';
import { swr } from './swr.js';

test('serves stale values while refreshing in the background', async () => {
  let t = 0;
  let version = 1;
  const load = vi.fn(async () => `v${version}`);
  const get = swr(load, { ttlMs: 10, staleMs: 100, now: () => t });

  expect(await get('k')).toBe('v1');      // miss: waits for the load
  t = 5;
  expect(await get('k')).toBe('v1');      // fresh: no load
  expect(load).toHaveBeenCalledTimes(1);

  version = 2;
  t = 50;
  expect(await get('k')).toBe('v1');      // stale: old value now, refresh in background
  await new Promise((r) => setTimeout(r, 0));   // let the background refresh finish
  expect(load).toHaveBeenCalledTimes(2);
  expect(await get('k')).toBe('v2');      // refreshed copy is fresh again
});

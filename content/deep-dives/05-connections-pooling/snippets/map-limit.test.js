import { expect, test } from 'vitest';
import { mapLimit } from './map-limit.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('never runs more than `limit` calls at once', async () => {
  let active = 0, peak = 0;
  const items = Array.from({ length: 40 }, (_, k) => k);
  await mapLimit(items, 4, async (x) => {
    active++;
    peak = Math.max(peak, active);
    await sleep((x * 7) % 5);                       // uneven durations
    active--;
    return x;
  });
  expect(peak).toBe(4);
});

test('keeps results in input order even when calls finish out of order', async () => {
  const items = [30, 5, 20, 1, 10, 0];
  const out = await mapLimit(items, 3, async (ms) => {
    await sleep(ms);
    return `done ${ms}`;
  });
  expect(out).toEqual(items.map((ms) => `done ${ms}`));
});

test('processes every item exactly once, also when limit > items', async () => {
  const seen = [];
  const out = await mapLimit(['a', 'b'], 10, async (x) => { seen.push(x); return x.toUpperCase(); });
  expect(out).toEqual(['A', 'B']);
  expect(seen.sort()).toEqual(['a', 'b']);
  expect(await mapLimit([], 3, async (x) => x)).toEqual([]);
});

test('rejects when a call fails', async () => {
  await expect(mapLimit([1, 2, 3], 2, async (x) => { if (x === 2) throw new Error('boom'); return x; })).rejects.toThrow('boom');
});

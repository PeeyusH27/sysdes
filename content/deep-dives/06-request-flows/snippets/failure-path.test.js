import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { recommendationsFor } from './failure-path.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const popular = ['top-1', 'top-2'];
const popularFromCache = async () => popular;

test('returns personal recommendations when the service answers in time', async () => {
  const recommend = (id) => new Promise((r) => setTimeout(() => r([`for-${id}`]), 120));
  const p = recommendationsFor(7, { recommend, popularFromCache });
  await vi.advanceTimersByTimeAsync(120);
  await expect(p).resolves.toEqual(['for-7']);
});

test('falls back to popular items after 300 ms', async () => {
  const recommend = () => new Promise(() => {});    // hangs forever
  const p = recommendationsFor(7, { recommend, popularFromCache });
  await vi.advanceTimersByTimeAsync(300);
  await expect(p).resolves.toEqual(popular);
});

test('falls back when the service fails', async () => {
  const recommend = async () => { throw new Error('503'); };
  await expect(recommendationsFor(7, { recommend, popularFromCache })).resolves.toEqual(popular);
});

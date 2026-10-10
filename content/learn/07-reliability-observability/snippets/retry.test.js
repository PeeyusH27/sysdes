import { afterEach, expect, test, vi } from 'vitest';
import { retry } from './retry.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('retries transient failures until one succeeds', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);           // no waiting in the test
  let calls = 0;
  const fn = async () => {
    if (++calls < 3) throw new Error('timeout');
    return 'ok';
  };
  expect(await retry(fn)).toBe('ok');
  expect(calls).toBe(3);
});

test('does not retry errors marked as not retryable', async () => {
  const fn = vi.fn(async () => { throw Object.assign(new Error('400 bad input'), { retryable: false }); });
  await expect(retry(fn)).rejects.toThrow('400 bad input');
  expect(fn).toHaveBeenCalledTimes(1);
});

test('gives up after `tries` attempts; waits are random in [0, base·2^i)', async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.999);      // the longest possible waits
  const waits = [];
  const realSetTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((cb, ms) => {
    waits.push(Math.round(ms));
    return realSetTimeout(cb, ms);
  });
  const fn = vi.fn(async () => { throw new Error('503'); });
  const done = expect(retry(fn, { tries: 4, baseMs: 100 })).rejects.toThrow('503');
  await vi.runAllTimersAsync();
  await done;
  expect(fn).toHaveBeenCalledTimes(4);
  expect(waits).toEqual([100, 200, 400]);                // just under 100, 200 and 400 ms
});

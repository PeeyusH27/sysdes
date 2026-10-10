import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startPolling } from './short-polling.js';

let doc;
beforeEach(() => {
  vi.useFakeTimers();
  doc = { hidden: false };
  vi.stubGlobal('document', doc);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('polls every interval and skips while the tab is hidden', async () => {
  const fn = vi.fn(async () => {});
  const stop = startPolling(fn, 1_000);
  await vi.advanceTimersByTimeAsync(0);
  expect(fn).toHaveBeenCalledTimes(1);          // first poll is immediate
  await vi.advanceTimersByTimeAsync(1_000);
  expect(fn).toHaveBeenCalledTimes(2);

  doc.hidden = true;
  await vi.advanceTimersByTimeAsync(3_000);
  expect(fn).toHaveBeenCalledTimes(2);          // hidden: no requests

  doc.hidden = false;
  await vi.advanceTimersByTimeAsync(1_000);
  expect(fn).toHaveBeenCalledTimes(3);

  stop();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(fn).toHaveBeenCalledTimes(3);
});

test('a failed poll does not stop polling', async () => {
  const fn = vi.fn(async () => { throw new Error('503'); });
  const stop = startPolling(fn, 1_000);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(fn).toHaveBeenCalledTimes(3);
  stop();
});

test('stop() during an in-flight poll prevents the next one', async () => {
  let release;
  const fn = vi.fn(() => new Promise((r) => { release = r; }));
  const stop = startPolling(fn, 1_000);
  await vi.advanceTimersByTimeAsync(0);
  expect(fn).toHaveBeenCalledTimes(1);
  stop();                                       // the request is still pending
  release();
  await vi.advanceTimersByTimeAsync(5_000);
  expect(fn).toHaveBeenCalledTimes(1);
});

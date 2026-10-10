import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { withTimeout } from './with-timeout.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const after = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

test('resolves with the value when the promise wins', async () => {
  const p = withTimeout(after(100, 'ok'), 300);
  await vi.advanceTimersByTimeAsync(100);
  await expect(p).resolves.toBe('ok');
  expect(vi.getTimerCount()).toBe(0);              // the timeout timer was cleared
});

test('rejects once the timeout passes', async () => {
  const p = withTimeout(after(1_000, 'late'), 300);
  const settled = vi.fn();
  p.catch(settled);
  await vi.advanceTimersByTimeAsync(299);
  expect(settled).not.toHaveBeenCalled();         // not yet
  await vi.advanceTimersByTimeAsync(1);
  await expect(p).rejects.toThrow('timeout after 300 ms');
});

test('passes through the original rejection', async () => {
  const p = withTimeout(Promise.reject(new Error('ECONNRESET')), 300);
  await expect(p).rejects.toThrow('ECONNRESET');
  expect(vi.getTimerCount()).toBe(0);
});

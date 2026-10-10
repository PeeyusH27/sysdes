import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { debounce } from './debounce.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('5 quick keystrokes collapse into 1 call with the latest value', () => {
  const fn = vi.fn();
  const search = debounce(fn, 250);
  for (const q of ['r', 're', 'rea', 'reac', 'react']) {
    search(q);
    vi.advanceTimersByTime(80);                                       // typing speed: one key every 80 ms
  }
  vi.advanceTimersByTime(169);                                        // 249 ms since the last key
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);                                          // 250 ms of silence
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith('react');
});

test('pauses longer than the delay fire separately', () => {
  const fn = vi.fn();
  const search = debounce(fn, 250);
  search('re');
  vi.advanceTimersByTime(300);
  search('rea');
  vi.advanceTimersByTime(300);
  expect(fn.mock.calls).toEqual([['re'], ['rea']]);
});

test('cancel drops the pending call', () => {
  const fn = vi.fn();
  const search = debounce(fn, 250);
  search('react');
  search.cancel();
  vi.advanceTimersByTime(1000);
  expect(fn).not.toHaveBeenCalled();
});

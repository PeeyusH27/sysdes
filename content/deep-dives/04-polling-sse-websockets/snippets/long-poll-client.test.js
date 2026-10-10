import { afterEach, expect, test, vi } from 'vitest';
import { longPoll } from './long-poll-client.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const json = (body) => ({ status: 200, ok: true, json: async () => body });

test('follows the cursor, re-polls on 204 and backs off after errors', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);    // zero jitter keeps the test fast
  const ctrl = new AbortController();
  const replies = [
    json({ events: ['a', 'b'], cursor: 2 }),
    { status: 204, ok: true },
    new Error('ECONNREFUSED'),
    { status: 503, ok: false },
    json({ events: ['c'], cursor: 3 }),
  ];
  const urls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, { signal }) => {
    expect(signal).toBeInstanceOf(AbortSignal);
    urls.push(url);
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next;
  }));

  const seen = [];
  await longPoll((events) => {
    seen.push(...events);
    if (seen.length === 3) ctrl.abort();
  }, ctrl.signal);

  expect(seen).toEqual(['a', 'b', 'c']);
  expect(urls).toEqual(['/events?since=0', '/events?since=2', '/events?since=2', '/events?since=2', '/events?since=2']);
});

test('waits before retrying a failing server instead of looping', async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  const ctrl = new AbortController();
  const fetchMock = vi.fn(async () => { throw new Error('down'); });
  vi.stubGlobal('fetch', fetchMock);

  const done = longPoll(() => {}, ctrl.signal);
  await vi.advanceTimersByTimeAsync(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(999);         // 1st backoff: 0.5 × 2 s = 1 s
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1_999);       // 2nd backoff: 0.5 × 4 s = 2 s
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(3);

  ctrl.abort();
  await vi.advanceTimersByTimeAsync(10_000);
  await done;
  expect(fetchMock).toHaveBeenCalledTimes(3);
  vi.useRealTimers();
});

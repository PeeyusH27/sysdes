// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useInfiniteFeed } from './useInfiniteFeed.js';

const page = (ids, nextCursor) => ({ ok: true, status: 200, json: async () => ({ data: ids.map(id => ({ id })), nextCursor }) });

afterEach(() => vi.unstubAllGlobals());

test('follows the cursor, then stops at the end', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(page([1, 2], 'c2')).mockResolvedValueOnce(page([3], null));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useInfiniteFeed('/api/feed', 2));

  await act(() => result.current.loadMore());
  expect(fetchMock.mock.calls[0][0]).toBe('/api/feed?limit=2');
  await act(() => result.current.loadMore());
  expect(fetchMock.mock.calls[1][0]).toBe('/api/feed?limit=2&cursor=c2');
  expect(result.current.items.map(p => p.id)).toEqual([1, 2, 3]);
  expect(result.current.status).toBe('done');

  await act(() => result.current.loadMore());                         // past the end: no request
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('a failed request resets busy, so Retry works (source bug #6)', async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce(page([1], null));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useInfiniteFeed('/api/feed'));

  await act(() => result.current.loadMore());
  expect(result.current.status).toBe('error');
  await act(() => result.current.loadMore());                         // Retry
  expect(result.current.status).toBe('error');
  await act(() => result.current.loadMore());                         // Retry again
  expect(result.current.items).toEqual([{ id: 1 }]);
  expect(result.current.status).toBe('done');
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('keeps one request in flight', async () => {
  let respond;
  const fetchMock = vi.fn(() => new Promise(resolve => { respond = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useInfiniteFeed('/api/feed'));

  let first;
  act(() => { first = result.current.loadMore(); result.current.loadMore(); result.current.loadMore(); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe('loading');
  await act(async () => { respond(page([1], 'c1')); await first; });
  expect(result.current.items).toEqual([{ id: 1 }]);
  expect(result.current.status).toBe('idle');
});

test('unmounting aborts the request in flight', () => {
  const fetchMock = vi.fn((url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  vi.stubGlobal('fetch', fetchMock);
  const { result, unmount } = renderHook(() => useInfiniteFeed('/api/feed'));
  act(() => { result.current.loadMore(); });
  unmount();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

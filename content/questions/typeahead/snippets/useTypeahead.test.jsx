// @vitest-environment jsdom
// useTypeahead.test.jsx
import { renderHook, act } from '@testing-library/react';
import { afterEach, test, expect, vi } from 'vitest';
import { useTypeahead } from './useTypeahead.js';

afterEach(() => vi.useRealTimers());

test('debounces keystrokes into one request for the latest query', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(q => new Promise(resolve => setTimeout(() => resolve([{ id: q, label: q }]), 100)));
  const { result, unmount } = renderHook(() => useTypeahead(fetcher, { delay: 250 }));
  act(() => result.current.setQuery('re'));
  act(() => result.current.setQuery('rea'));
  act(() => result.current.setQuery('reac'));
  await act(() => vi.advanceTimersByTimeAsync(400));                 // 250 ms debounce + 100 ms response
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith('reac', expect.any(AbortSignal));
  expect(result.current.items).toEqual([{ id: 'reac', label: 'reac' }]);
  unmount();
});

test('backspace to a cached query renders at once, with no request', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async q => [{ id: q, label: q }]);
  const { result, unmount } = renderHook(() => useTypeahead(fetcher));
  act(() => result.current.setQuery('react'));
  await act(() => vi.advanceTimersByTimeAsync(250));
  act(() => result.current.setQuery('reactj'));
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(fetcher).toHaveBeenCalledTimes(2);

  act(() => result.current.setQuery('react'));                       // backspace: no timer, no request
  expect(result.current.status).toBe('success');
  expect(result.current.items).toEqual([{ id: 'react', label: 'react' }]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  unmount();
});

test('a newer query aborts the slow request, and its late answer is ignored', async () => {
  vi.useFakeTimers();
  const signals = [];
  const fetcher = vi.fn((q, signal) => {
    signals.push(signal);                                             // this fake ignores the signal, like a non-abortable client
    return new Promise(resolve => setTimeout(() => resolve([{ id: q, label: q }]), q === 'rea' ? 1000 : 50));
  });
  const { result, unmount } = renderHook(() => useTypeahead(fetcher));
  act(() => result.current.setQuery('rea'));
  await act(() => vi.advanceTimersByTimeAsync(300));                 // rea's request is in flight (slow server)
  act(() => result.current.setQuery('reac'));                        // effect cleanup aborts it
  expect(signals[0].aborted).toBe(true);

  await act(() => vi.advanceTimersByTimeAsync(1000));                // reac answers at 600 ms, rea's late answer at 1250 ms
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current.items).toEqual([{ id: 'reac', label: 'reac' }]);
  unmount();
});

test('an API failure becomes a quiet error state', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async () => { throw new Error('HTTP 503'); });
  const { result, unmount } = renderHook(() => useTypeahead(fetcher));
  act(() => result.current.setQuery('rea'));
  await act(() => vi.advanceTimersByTimeAsync(250));
  expect(result.current.status).toBe('error');
  expect(result.current.items).toEqual([]);
  unmount();
});

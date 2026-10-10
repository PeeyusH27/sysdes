// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Feed } from './Feed.jsx';

// A fake IntersectionObserver. Like the real one, observe() reports the current state asynchronously.
class FakeObserver {
  static visible = true;                                              // is the sentinel inside viewport + rootMargin?
  static created = 0;
  constructor(callback) { this.callback = callback; this.live = true; FakeObserver.created++; }
  observe() { queueMicrotask(() => this.live && this.callback([{ isIntersecting: FakeObserver.visible }])); }
  disconnect() { this.live = false; }
}

const posts = (from, n) => Array.from({ length: n }, (_, i) => ({ id: from + i, title: `Post ${from + i}`, width: 600, height: 400 }));
const page = (data, nextCursor) => ({ ok: true, status: 200, json: async () => ({ data, nextCursor }) });

beforeEach(() => {
  FakeObserver.visible = true;
  FakeObserver.created = 0;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

test('short pages keep loading until the end, then announce it', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(page(posts(1, 3), 'c3'))
    .mockResolvedValueOnce(page(posts(4, 3), 'c6'))
    .mockResolvedValueOnce(page(posts(7, 2), null));
  vi.stubGlobal('fetch', fetchMock);
  const { unmount } = render(<Feed />);

  await screen.findByText('You’re all caught up.');                  // the sentinel never left the screen
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(FakeObserver.created).toBe(3);                               // a fresh observer per page re-checks visibility
  const articles = screen.getAllByRole('article');
  expect(articles).toHaveLength(8);
  expect(articles[7].getAttribute('aria-posinset')).toBe('8');
  expect(articles[7].getAttribute('aria-setsize')).toBe('8');        // the total is known now
  expect(screen.getByRole('feed').getAttribute('aria-busy')).toBe('false');
  unmount();
});

test('an error shows Retry instead of looping', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(page(posts(1, 2), 'c2'))
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce(page(posts(3, 2), 'c4'));
  vi.stubGlobal('fetch', fetchMock);
  const { unmount } = render(<Feed />);

  const retry = await screen.findByRole('button', { name: /Retry/ });
  expect(screen.getAllByRole('article')[0].getAttribute('aria-setsize')).toBe('-1');   // more may load: total unknown
  await new Promise(r => setTimeout(r, 20));                          // give a retry loop time to show itself
  expect(fetchMock).toHaveBeenCalledTimes(2);                         // page 1, then the failed page 2, nothing more

  FakeObserver.visible = false;                                       // after Retry, the next sentinel is below the fold
  fireEvent.click(retry);
  await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4));
  expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  unmount();
});

import { expect, test } from 'vitest';
import { likeInFeed } from './optimistic-like.js';

const feed = () => ({
  pageParams: [null, 1700],
  pages: [
    { posts: [{ id: 'a', likes: 3, liked: false }, { id: 'b', likes: 0, liked: false }], nextCursor: 1700 },
    { posts: [{ id: 'c', likes: 9, liked: false }], nextCursor: null },
  ],
});

test('likes exactly one post, on whichever page it lives', () => {
  const next = likeInFeed(feed(), 'c');
  expect(next.pages[1].posts[0]).toEqual({ id: 'c', likes: 10, liked: true });
  expect(next.pages[0].posts.map(p => p.likes)).toEqual([3, 0]);
  expect(next.pageParams).toEqual([null, 1700]);
});

test('a double tap counts once', () => {
  const once = likeInFeed(feed(), 'a');
  const twice = likeInFeed(once, 'a');
  expect(twice.pages[0].posts[0]).toEqual({ id: 'a', likes: 4, liked: true });
});

test('never mutates the cached data and leaves untouched posts as the same objects', () => {
  const data = feed();
  const snapshot = structuredClone(data);
  const next = likeInFeed(data, 'a');
  expect(data).toEqual(snapshot);
  expect(next).not.toBe(data);
  expect(next.pages[0].posts[1]).toBe(data.pages[0].posts[1]);   // React can skip re-rendering it
});

test('does nothing before the feed has loaded', () => {
  expect(likeInFeed(undefined, 'a')).toBeUndefined();
});

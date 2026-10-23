import { test, expect } from 'vitest';
import { makeLoader } from './dataloader.js';

const users = { 1: 'Ada', 2: 'Grace', 3: 'Linus' };
const posts = [{ id: 'a', authorId: 1 }, { id: 'b', authorId: 2 }, { id: 'c', authorId: 1 }, { id: 'd', authorId: 3 }];

test('without a loader, four posts cost four author queries (N+1)', async () => {
  let queries = 0;
  const fetchUser = async (id) => { queries += 1; return users[id]; };
  const names = await Promise.all(posts.map((p) => fetchUser(p.authorId)));
  expect(names).toEqual(['Ada', 'Grace', 'Ada', 'Linus']);
  expect(queries).toBe(4);
});

test('with a loader, the same four posts cost one batched query, with duplicates removed', async () => {
  const calls = [];
  const load = makeLoader(async (ids) => { calls.push(ids); return ids.map((id) => users[id]); });
  const names = await Promise.all(posts.map((p) => load(p.authorId)));
  expect(names).toEqual(['Ada', 'Grace', 'Ada', 'Linus']);
  expect(calls).toEqual([[1, 2, 3]]);
});

test('a failing batch rejects every waiter', async () => {
  const load = makeLoader(async () => { throw new Error('db down'); });
  await expect(Promise.all([load(1), load(2)])).rejects.toThrow('db down');
});

test('loads in a later tick form a new batch', async () => {
  const calls = [];
  const load = makeLoader(async (ids) => { calls.push(ids); return ids.map((id) => users[id]); });
  await load(1);
  await load(2);
  expect(calls).toEqual([[1], [2]]);
});

import { expect, test } from 'vitest';
import { ArrayTrie } from './trie-array.js';

test('array-of-26 trie stores and finds words', () => {
  const t = new ArrayTrie();
  for (const w of ['apple', 'app', 'zebra']) t.insert(w);
  expect(t.search('app')).toBe(true);
  expect(t.search('apple')).toBe(true);
  expect(t.search('appl')).toBe(false);
  expect(t.search('zeb')).toBe(false);
  expect(t.search('zebra')).toBe(true);
  expect(t.search('b')).toBe(false);
});

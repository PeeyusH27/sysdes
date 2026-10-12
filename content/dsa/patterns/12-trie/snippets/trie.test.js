import { expect, test } from 'vitest';
import { Trie } from './trie.js';

test('search needs a whole word, startsWith any prefix', () => {
  const t = new Trie();
  for (const w of ['car', 'cat', 'cart', 'dog']) t.insert(w);
  expect(t.search('car')).toBe(true);
  expect(t.search('cart')).toBe(true);
  expect(t.search('ca')).toBe(false);
  expect(t.startsWith('ca')).toBe(true);
  expect(t.search('cow')).toBe(false);
  expect(t.startsWith('cow')).toBe(false);
  expect(t.startsWith('')).toBe(true);
});

test('wordsWithPrefix lists completions', () => {
  const t = new Trie();
  for (const w of ['car', 'cat', 'cart', 'dog', 'do']) t.insert(w);
  expect(t.wordsWithPrefix('ca').sort()).toEqual(['car', 'cart', 'cat']);
  expect(t.wordsWithPrefix('do').sort()).toEqual(['do', 'dog']);
  expect(t.wordsWithPrefix('x')).toEqual([]);
});

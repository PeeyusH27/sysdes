import { expect, test } from 'vitest';
import { Trie } from './trie.js';
import { findAllMatches } from './scan.js';

test('finds overlapping dictionary words', () => {
  const trie = new Trie();
  for (const w of ['he', 'her', 'hers', 'she']) trie.insert(w);
  expect(findAllMatches('ushers', trie)).toEqual([[1, 'she'], [2, 'he'], [2, 'her'], [2, 'hers']]);
});

test('no matches and empty text', () => {
  const trie = new Trie();
  trie.insert('cat');
  expect(findAllMatches('dog', trie)).toEqual([]);
  expect(findAllMatches('', trie)).toEqual([]);
  expect(findAllMatches('catcat', trie)).toEqual([[0, 'cat'], [3, 'cat']]);
});

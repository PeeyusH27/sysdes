import { expect, test } from 'vitest';
import { Trie } from './trie.js';
import { matchesPattern } from './wildcard.js';

const trie = new Trie();
for (const w of ['bad', 'bed', 'cat', 'cot']) trie.insert(w);

test('dots match any single character', () => {
  expect(matchesPattern(trie, '.at')).toBe(true);
  expect(matchesPattern(trie, 'b.d')).toBe(true);
  expect(matchesPattern(trie, 'c.t')).toBe(true);
  expect(matchesPattern(trie, '...')).toBe(true);
});

test('length and whole-word rules still apply', () => {
  expect(matchesPattern(trie, 'b.t')).toBe(false);
  expect(matchesPattern(trie, '..')).toBe(false);
  expect(matchesPattern(trie, '....')).toBe(false);
  expect(matchesPattern(trie, 'x..')).toBe(false);
});

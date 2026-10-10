import { expect, test } from 'vitest';
import { Trie } from './trie.js';

const build = (k) => {
  const t = new Trie(k);
  for (const [word, score] of [['react', 90], ['rust', 80], ['redux', 70], ['react native', 60], ['remix', 40], ['reason', 10]]) {
    t.insert(word, score);
  }
  return t;
};

test('keeps the top K completions per prefix, best first', () => {
  const t = build(3);
  expect(t.suggest('r')).toEqual(['react', 'rust', 'redux']);
  expect(t.suggest('re')).toEqual(['react', 'redux', 'react native']);
  expect(t.suggest('rea')).toEqual(['react', 'react native', 'reason']);
  expect(t.suggest('react ')).toEqual(['react native']);
});

test('lookups are case-insensitive and keep the original casing', () => {
  const t = new Trie(8);
  t.insert('React', 90);
  t.insert('Redis', 50);
  expect(t.suggest('RE')).toEqual(['React', 'Redis']);
  expect(t.suggest('rea')).toEqual(['React']);
});

test('re-inserting a word updates its score without duplicates', () => {
  const t = new Trie(8);
  t.insert('vue', 10);
  t.insert('vite', 20);
  t.insert('vue', 30);
  expect(t.suggest('v')).toEqual(['vue', 'vite']);
});

test('an unknown prefix returns nothing', () => {
  expect(build(8).suggest('xyz')).toEqual([]);
});

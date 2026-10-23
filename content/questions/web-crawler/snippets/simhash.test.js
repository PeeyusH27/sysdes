import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { simhash, hamming, isNearDuplicate } from './simhash.js';

const page = Array.from({ length: 300 }, (_, i) => `word${(i * 7919) % 503} term${i % 97} the quick ${i % 13} brown fox`).join(' ');
const withAd = `${page} buy now limited offer click here today only`;
const unrelated = Array.from({ length: 300 }, (_, i) => `alpha${(i * 104729) % 701} beta${i % 89} lorem ${i % 17} ipsum dolor`).join(' ');

test('a page and the same page with an ad added are near-duplicates; an exact hash cannot tell', () => {
  expect(isNearDuplicate(page, withAd)).toBe(true);
  const sha = (s) => createHash('sha256').update(s).digest('hex');
  expect(sha(page)).not.toBe(sha(withAd));
});

test('unrelated pages are far apart', () => {
  expect(hamming(simhash(page), simhash(unrelated))).toBeGreaterThan(16);
  expect(isNearDuplicate(page, unrelated)).toBe(false);
});

test('identical text has distance 0, and word case or punctuation does not matter', () => {
  expect(hamming(simhash(page), simhash(page))).toBe(0);
  expect(hamming(simhash('Hello, World! Hello again friend'), simhash('hello world hello again friend'))).toBe(0);
});

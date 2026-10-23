import { test, expect } from 'vitest';
import { BloomFilter, bloomSize } from './bloom.js';

test('sizing: 1% needs 9.585 bits and 7 hashes per item; 5 billion URLs fit in about 6 GB', () => {
  const { bitsPerItem, hashes } = bloomSize(1, 0.01);
  expect(bitsPerItem).toBeCloseTo(9.585, 3);
  expect(hashes).toBe(7);
  const { bits } = bloomSize(5e9, 0.01);
  expect(bits / 8 / 1e9).toBeCloseTo(5.99, 2);          // GB
  // storing an 8-byte hash of each of the same URLs would take 40 GB
  expect((5e9 * 8) / 1e9).toBe(40);
});

test('no false negatives: everything added is found', () => {
  const f = new BloomFilter(10_000, 0.01);
  const urls = Array.from({ length: 10_000 }, (_, i) => `https://example.com/page/${i}`);
  for (const u of urls) f.add(u);
  expect(urls.every((u) => f.has(u))).toBe(true);
});

test('false positives stay near the target rate', () => {
  const n = 20_000;
  const f = new BloomFilter(n, 0.01);
  for (let i = 0; i < n; i++) f.add(`https://a.example/p/${i}`);
  let wrong = 0;
  const trials = 20_000;
  for (let i = 0; i < trials; i++) if (f.has(`https://b.example/q/${i}`)) wrong++;
  expect(wrong / trials).toBeLessThan(0.02);            // about 1% expected; allow double
});

test('addIfNew is true once per item', () => {
  const f = new BloomFilter(100, 0.001);
  expect(f.addIfNew('https://example.com/')).toBe(true);
  expect(f.addIfNew('https://example.com/')).toBe(false);
});

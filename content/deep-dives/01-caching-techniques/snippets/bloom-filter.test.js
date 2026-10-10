import { expect, test } from 'vitest';
import { BloomFilter } from './bloom-filter.js';

const N = 100_000;

test('never gives a false negative', () => {
  const bf = new BloomFilter();
  for (let i = 0; i < N; i++) bf.add(`user:${i}`);
  for (let i = 0; i < N; i++) expect(bf.mightContain(`user:${i}`)).toBe(true);
});

test('false-positive rate stays below 1.5% with 100K keys in 1M bits (theory: ~0.65%)', () => {
  const bf = new BloomFilter(1 << 20, 7);
  for (let i = 0; i < N; i++) bf.add(`user:${i}`);
  let falsePositives = 0;
  for (let i = 0; i < N; i++) if (bf.mightContain(`ghost:${i}`)) falsePositives++;
  const rate = falsePositives / N;
  expect(rate).toBeLessThan(0.015);
  expect(rate).toBeGreaterThan(0);          // it is probabilistic: some false positives are expected
});

test('an empty filter rejects everything', () => {
  const bf = new BloomFilter();
  expect(bf.mightContain('anything')).toBe(false);
});

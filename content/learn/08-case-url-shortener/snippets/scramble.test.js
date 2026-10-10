import { expect, test } from 'vitest';
import { scramble, shortCode, unscramble } from './scramble.js';
import { fromBase62 } from './base62.js';

const M = 62n ** 7n;
const gcd = (a, b) => (b === 0n ? a : gcd(b, a % b));

test('documented example codes', () => {
  expect(shortCode(1)).toBe('CjIO2GV');
  expect(shortCode(2)).toBe('eDrC5nQ');
  expect(shortCode(3)).toBe('QXaq84L');
});

test('the multiplier is coprime with 62^7, so the map is a bijection', () => {
  expect(M).toBe(3_521_614_606_208n);
  expect(gcd(2_176_477_561_533n, M)).toBe(1n);
});

test('unscramble undoes scramble', () => {
  for (const id of [0, 1, 2, 41_000, 6_000_000_000, 3_521_614_606_207]) {
    expect(unscramble(scramble(id))).toBe(BigInt(id));
  }
});

test('a short code decodes back to its id', () => {
  for (const id of [1, 999, 41_000, 123_456_789]) {
    expect(unscramble(fromBase62(shortCode(id)))).toBe(BigInt(id));
  }
});

test('the first 10,000 codes are unique, 7 characters long and not sequential', () => {
  const codes = Array.from({ length: 10_000 }, (_, i) => shortCode(i + 1));
  expect(new Set(codes).size).toBe(10_000);
  for (const c of codes) expect(c).toMatch(/^[0-9a-zA-Z]{7}$/);
  expect(codes[0]).not.toBe('0000001');
});

test('the largest id still fits in 7 characters', () => {
  expect(shortCode(3_521_614_606_207)).toHaveLength(7);
});

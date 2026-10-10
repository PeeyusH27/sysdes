import { expect, test } from 'vitest';
import { fromBase62, toBase62 } from './base62.js';

test('documented examples', () => {
  expect(toBase62(125)).toBe('21');
  expect(fromBase62('21')).toBe(125);
  expect(toBase62(0)).toBe('0');
  expect(toBase62(61)).toBe('Z');
  expect(toBase62(62)).toBe('10');
});

test('7 characters cover 62^7 ≈ 3.5 trillion codes', () => {
  expect(62 ** 7).toBe(3_521_614_606_208);
  expect(toBase62(62 ** 7 - 1)).toBe('ZZZZZZZ');            // the largest 7-character code
  expect(toBase62(62 ** 7)).toBe('10000000');               // one more needs an 8th character
});

test('round-trips exactly up to 2^53', () => {
  for (const n of [1, 41, 999, 123_456_789, 3_521_614_606_207, Number.MAX_SAFE_INTEGER]) {
    expect(fromBase62(toBase62(n))).toBe(n);
  }
  for (let n = 0; n < 5_000; n++) expect(fromBase62(toBase62(n))).toBe(n);
});

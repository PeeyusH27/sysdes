import { expect, test } from 'vitest';
import { clearBit, getBit, reverseBits, setBit, toggleBit } from './bit-masks.js';

test('reads single bits', () => {
  expect([3, 2, 1, 0].map((i) => getBit(0b1010, i))).toEqual([1, 0, 1, 0]);
  expect(getBit(-1, 31)).toBe(1); // -1 is all ones in 32-bit two's complement
});

test('sets, clears and toggles one bit without touching the others', () => {
  expect(setBit(0b1000, 1)).toBe(0b1010);
  expect(setBit(0b1010, 1)).toBe(0b1010);
  expect(clearBit(0b1111, 2)).toBe(0b1011);
  expect(clearBit(0b1011, 2)).toBe(0b1011);
  expect(toggleBit(0b0101, 0)).toBe(0b0100);
  expect(toggleBit(0b0101, 1)).toBe(0b0111);
});

test('bit 31 makes a signed 32-bit result negative', () => {
  expect(setBit(0, 31)).toBe(-2147483648);
  expect(setBit(0, 31) >>> 0).toBe(2147483648);
});

test('reverses all 32 bits as an unsigned number', () => {
  expect(reverseBits(1)).toBe(2147483648);
  expect(reverseBits(6)).toBe(1610612736);
  expect(reverseBits(0)).toBe(0);
  expect(reverseBits(4294967295)).toBe(4294967295);
  expect(reverseBits(2147483648)).toBe(1);
});

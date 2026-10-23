import { test, expect } from 'vitest';
import { capThenDiscount, discountThenCap } from './order.js';

const night8h = { minutes: 480, enterHour: 23 }; // 8 hours at 20 = 160 before any rule
const day8h = { minutes: 480, enterHour: 12 };
const night2h = { minutes: 120, enterHour: 23 };

test('wrapping order changes the answer for a long night stay', () => {
  expect(capThenDiscount.fee(night8h)).toBe(50); // 160 -> cap 100 -> half 50
  expect(discountThenCap.fee(night8h)).toBe(80); // 160 -> half 80 -> cap leaves 80
});

test('the two orders agree when the rules do not overlap', () => {
  expect(capThenDiscount.fee(day8h)).toBe(100);
  expect(discountThenCap.fee(day8h)).toBe(100);
  expect(capThenDiscount.fee(night2h)).toBe(20);
  expect(discountThenCap.fee(night2h)).toBe(20);
});

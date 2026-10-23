import { expect, test } from 'vitest';
import { Pricing, percentOff } from './ocp-after.js';

const pricing = () => new Pricing().register('gold', percentOff(10)).register('employee', percentOff(30));

test('registered kinds get their discount and unknown kinds pay in full', () => {
  expect(pricing().price('gold', 2000)).toBe(1800);
  expect(pricing().price('employee', 2000)).toBe(1400);
  expect(pricing().price('guest', 2000)).toBe(2000);
});

test('a student rule is added without editing Pricing', () => {
  expect(pricing().register('student', percentOff(15)).price('student', 2000)).toBe(1700);
});

test('a rule need not be a percentage', () => {
  expect(pricing().register('promo', () => 500).price('promo', 2000)).toBe(1500);
});

import { expect, test } from 'vitest';
import { Member } from './tell-after.js';

test('the limit holds for every caller, and returning frees a slot', () => {
  const m = new Member(1);
  expect(m.borrow('a')).toBe(true);
  expect(m.borrow('b')).toBe(false);
  expect(m.giveBack('a')).toBe(true);
  expect(m.borrow('b')).toBe(true);
});

test('the list handed out is a copy', () => {
  const m = new Member(1);
  m.borrow('a');
  m.loans.push('sneaky');
  expect(m.loans).toEqual(['a']);
});

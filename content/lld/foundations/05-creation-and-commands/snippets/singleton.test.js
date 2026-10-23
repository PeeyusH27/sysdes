import { test, expect } from 'vitest';
import { TicketNumbers as GlobalNumbers, issueTicket } from './singleton-before.js';
import { TicketNumbers, TicketOffice } from './singleton-after.js';

test('before: every caller shares one counter', () => {
  expect(GlobalNumbers.get()).toBe(GlobalNumbers.get());
});

test('before: state leaks from one caller to the next, and cannot be reset', () => {
  const first = issueTicket('car').number;
  const second = GlobalNumbers.get().next();
  expect(second).toBe(first + 1);
});

test('after: each office starts from its own fresh counter', () => {
  const a = new TicketOffice(new TicketNumbers());
  const b = new TicketOffice(new TicketNumbers());
  expect(a.issue('car').number).toBe(1);
  expect(a.issue('bike').number).toBe(2);
  expect(b.issue('car').number).toBe(1);
});

test('after: a test can pass a fake in', () => {
  const office = new TicketOffice({ next: () => 99 });
  expect(office.issue('car')).toEqual({ vehicle: 'car', number: 99 });
});

test('after: sharing is still possible, on purpose', () => {
  const numbers = new TicketNumbers();
  const gateA = new TicketOffice(numbers);
  const gateB = new TicketOffice(numbers);
  expect(gateA.issue('car').number).toBe(1);
  expect(gateB.issue('car').number).toBe(2);
});

import { test, expect } from 'vitest';
import { inconsistentCustomers, normalize } from './normalize.js';

const flat = () => [
  { id: 1, customerId: 7, name: 'Ada', city: 'London', total: 10 },
  { id: 2, customerId: 7, name: 'Ada', city: 'London', total: 20 },
  { id: 3, customerId: 8, name: 'Grace', city: 'Boston', total: 5 },
];

test('normalizing stores each customer once and keeps only a reference on the order', () => {
  const { customers, orders } = normalize(flat());
  expect(customers.size).toBe(2);
  expect(orders[0]).toEqual({ id: 1, customerId: 7, total: 10 });
});

test('moving a customer means one update in the normalized design', () => {
  const { customers } = normalize(flat());
  customers.get(7).city = 'Paris';
  expect(customers.get(7).city).toBe('Paris');
});

test('in the denormalized design a half-finished update leaves the data disagreeing with itself', () => {
  const rows = flat();
  rows[0].city = 'Paris'; // the update reached one order and then failed
  expect(inconsistentCustomers(rows)).toEqual([7]);
});

test('consistent data reports no problems', () => {
  expect(inconsistentCustomers(flat())).toEqual([]);
});

import { expect, test } from 'vitest';
import { Order } from './srp-before.js';

function build(db) {
  const order = new Order(db);
  order.add('Tea', 500, 2);
  order.add('Cake', 250, 1);
  return order;
}

test('totals with tax and prints a receipt', () => {
  const order = build(null);
  expect(order.total()).toBe(1475);
  expect(order.receipt()).toBe('2 x Tea\n1 x Cake\nTotal: 14.75');
});

test('you cannot price an order without also being able to talk to a database', () => {
  const rows = [];
  const order = build({ insert: (table, row) => rows.push([table, row.total]) });
  order.save();
  expect(rows).toEqual([['orders', 1475]]);
  expect(() => build(null).save()).toThrow();
});

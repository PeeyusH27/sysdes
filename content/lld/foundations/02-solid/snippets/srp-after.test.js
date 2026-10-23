import { expect, test } from 'vitest';
import { Order, OrderStore, receiptText, withTax } from './srp-after.js';

function build() {
  const order = new Order();
  order.add('Tea', 500, 2);
  order.add('Cake', 250, 1);
  return order;
}

test('an order only knows its items, and tax is a separate rule', () => {
  const order = build();
  expect(order.subtotal()).toBe(1250);
  expect(withTax(order.subtotal(), 18)).toBe(1475);
  expect(withTax(order.subtotal(), 5)).toBe(1313); // 1312.5 rounds up
});

test('the receipt layout changes without touching pricing', () => {
  expect(receiptText(build(), 1475)).toBe('2 x Tea\n1 x Cake\nTotal: 14.75');
});

test('storage is its own class, so it is tested with a fake', () => {
  const rows = [];
  new OrderStore({ insert: (table, row) => rows.push([table, row.total]) }).save(build(), 1475);
  expect(rows).toEqual([['orders', 1475]]);
});

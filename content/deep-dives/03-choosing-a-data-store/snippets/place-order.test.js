import { expect, test } from 'vitest';
import { OutOfStockError, placeOrder } from './place-order.js';

// A fake pg pool: records every statement and lets the test decide how many stock rows the UPDATE matches
function fakePool(stockRowsMatched) {
  const log = [];
  let released = 0;
  const client = {
    async query(sql) {
      log.push(sql.split(' ')[0]);
      return { rowCount: sql.startsWith('UPDATE stock') ? stockRowsMatched : 1, rows: [] };
    },
    release() { released++; },
  };
  return { pool: { connect: async () => client }, log, released: () => released };
}

const order = { userId: 1, sku: 'a1', qty: 2, total: 998 };

test('enough stock: decrement, insert the order, commit', async () => {
  const f = fakePool(1);
  await placeOrder(f.pool, order);
  expect(f.log).toEqual(['BEGIN', 'UPDATE', 'INSERT', 'COMMIT']);
  expect(f.released()).toBe(1);
});

test('no stock (rowCount 0): roll back and never insert an order', async () => {
  const f = fakePool(0);
  await expect(placeOrder(f.pool, order)).rejects.toBeInstanceOf(OutOfStockError);
  expect(f.log).toEqual(['BEGIN', 'UPDATE', 'ROLLBACK']);
  expect(f.released()).toBe(1);
});

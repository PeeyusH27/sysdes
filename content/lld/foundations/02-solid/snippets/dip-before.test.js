import { expect, test } from 'vitest';
import { OrderService } from './dip-before.js';

test('placing an order cannot be tested without a mail server', () => {
  expect(() => new OrderService().place({ id: 7, email: 'ana@example.com' })).toThrow('no SMTP server');
});

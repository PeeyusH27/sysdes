import { expect, test } from 'vitest';
import { OrderService } from './dip-after.js';

class FakeMailer {
  sent = [];
  send(to, text) { this.sent.push({ to, text }); }
}

test('the service sends a confirmation through whatever mailer it was given', () => {
  const mailer = new FakeMailer();
  expect(new OrderService(mailer).place({ id: 7, email: 'ana@example.com' })).toBe(7);
  expect(mailer.sent).toEqual([{ to: 'ana@example.com', text: 'Order 7 confirmed' }]);
});

test('a failing mailer is easy to simulate too', () => {
  const broken = { send() { throw new Error('mail is down'); } };
  expect(() => new OrderService(broken).place({ id: 8, email: 'bo@example.com' })).toThrow('mail is down');
});

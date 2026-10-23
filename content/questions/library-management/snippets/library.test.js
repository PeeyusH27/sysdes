import { test, expect } from 'vitest';
import { Library } from './library.js';
import { CappedFine, GraceFine, PerDayFine } from './fines.js';
import { BookItem } from './models.js';

function make() {
  const lib = new Library();
  lib.addBook('111', 'Dune', 'Frank Herbert', 1);
  lib.addBook('222', 'Emma', 'Jane Austen', 3);
  for (const id of ['ann', 'bob', 'cy']) lib.join(id);
  lib.join('pia', 'PREMIUM');
  const events = [];
  lib.on(e => events.push(`${e.type}:${e.memberId}`));
  return { lib, events };
}

test('a loan is due after the member type\'s loan period', () => {
  const { lib } = make();
  expect(lib.borrow('ann', '222', 10).value.due).toBe(24);
  expect(lib.borrow('pia', '222', 10).value.due).toBe(31);
});

test('a standard member may hold 3 loans, a premium member 5', () => {
  const { lib } = make();
  lib.addBook('333', 'Ulysses', 'James Joyce', 9);
  const reasons = [1, 2, 3, 4].map(() => lib.borrow('ann', '333', 1).reason);
  expect(reasons).toEqual([undefined, undefined, undefined, 'LIMIT_REACHED']);
  const premium = [1, 2, 3, 4, 5, 6].map(() => lib.borrow('pia', '333', 1).ok);
  expect(premium).toEqual([true, true, true, true, true, false]);     // 9 copies, 3 taken by ann: 6 left, limit 5
});

test('with no free copy a borrow fails, and returning frees it', () => {
  const { lib } = make();
  const loan = lib.borrow('ann', '111', 1).value;
  expect(lib.borrow('bob', '111', 1).reason).toBe('NO_COPY');
  lib.returnItem(loan.id, 5);
  expect(lib.borrow('bob', '111', 5).ok).toBe(true);
});

test('fines: free on time, per day when late, capped, and cheaper for premium', () => {
  const { lib } = make();
  const a = lib.borrow('ann', '222', 0).value;
  const b = lib.borrow('ann', '222', 0).value;
  const c = lib.borrow('pia', '222', 0).value;
  expect(lib.returnItem(a.id, 14).value).toBe(0);          // due on day 14, returned on day 14
  expect(lib.returnItem(b.id, 18).value).toBe(100);        // 4 days late at 25 cents
  expect(lib.returnItem(c.id, 21 + 4).value).toBe(40);     // premium: 4 days at 10 cents
  const d = lib.borrow('ann', '222', 0).value;
  expect(lib.returnItem(d.id, 14 + 90).value).toBe(1000);  // the cap
});

test('fine policies compose: a grace period wrapped around a capped per-day fine', () => {
  const policy = new GraceFine(new CappedFine(new PerDayFine(50), 200), 2);
  expect([0, 2, 3, 5, 20].map(d => policy.fine(d))).toEqual([0, 0, 50, 150, 200]);
});

test('reservations are first come, first served, and the returned copy is held', () => {
  const { lib, events } = make();
  const loan = lib.borrow('ann', '111', 1).value;
  expect(lib.reserve('bob', '111').value).toBe(1);
  expect(lib.reserve('cy', '111').value).toBe(2);
  expect(lib.reserve('bob', '111').reason).toBe('ALREADY_WAITING');
  lib.returnItem(loan.id, 3);
  expect(events).toContain('ready:bob');
  expect(lib.borrow('cy', '111', 3).reason).toBe('NO_COPY');   // held for bob
  expect(lib.borrow('bob', '111', 3).ok).toBe(true);
});

test('you cannot reserve a title that has a free copy', () => {
  const { lib } = make();
  expect(lib.reserve('ann', '222').reason).toBe('COPY_AVAILABLE');
});

test('an unclaimed hold lapses after 3 days and passes to the next member', () => {
  const { lib, events } = make();
  const loan = lib.borrow('ann', '111', 1).value;
  lib.reserve('bob', '111');
  lib.reserve('cy', '111');
  lib.returnItem(loan.id, 2);                               // held for bob until day 5
  lib.sweep(5);
  expect(events).not.toContain('holdExpired:bob');
  lib.sweep(6);
  expect(events).toContain('holdExpired:bob');
  expect(events).toContain('ready:cy');
  expect(lib.borrow('cy', '111', 6).ok).toBe(true);
});

test('renewing: twice at most, never when overdue, never when someone is waiting', () => {
  const { lib } = make();
  const loan = lib.borrow('ann', '222', 0).value;
  expect(lib.renew(loan.id, 10).value).toBe(28);
  expect(lib.renew(loan.id, 20).value).toBe(42);
  expect(lib.renew(loan.id, 30).reason).toBe('RENEWAL_LIMIT');
  const late = lib.borrow('bob', '222', 0).value;
  expect(lib.renew(late.id, 15).reason).toBe('OVERDUE');
  const one = lib.borrow('cy', '111', 0).value;
  lib.reserve('bob', '111');
  expect(lib.renew(one.id, 5).reason).toBe('RESERVED_BY_OTHERS');
});

test('an overdue notice is sent once per loan', () => {
  const { lib, events } = make();
  lib.borrow('ann', '222', 0);
  lib.sweep(14);
  lib.sweep(15);
  lib.sweep(16);
  expect(events.filter(e => e.startsWith('overdue'))).toEqual(['overdue:ann']);
});

test('a copy cannot skip states: an available copy cannot be held or lost', () => {
  const item = new BookItem('x#1', 'x');
  expect(() => item.moveTo('HELD')).toThrow();
  expect(() => item.moveTo('LOST')).toThrow();
  item.moveTo('LOANED');
  item.moveTo('LOST');
  expect(() => item.moveTo('AVAILABLE')).toThrow();
});

test('search matches ISBN exactly and title or author in any case', () => {
  const { lib } = make();
  expect(lib.search('222')).toEqual(['222']);
  expect(lib.search('dune')).toEqual(['111']);
  expect(lib.search('AUSTEN')).toEqual(['222']);
  expect(lib.search('nothing')).toEqual([]);
});

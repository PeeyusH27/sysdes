import { expect, test } from 'vitest';
import { Library, Member } from './library-after.js';

function setup(member = new Member('ana', 'Ana')) {
  const lib = new Library();
  lib.addBook('b1', 'Dune', 2);
  lib.join(member);
  return lib;
}

test('a loan takes a copy and is due after the member loan period', () => {
  const lib = setup();
  const loan = lib.borrow('ana', 'b1', 3);
  expect(loan.dueDay).toBe(17);
  expect(lib.books.get('b1').copies).toBe(1);
});

test('refuses when the member is at the limit or the book is out of stock', () => {
  const lib = setup(new Member('ana', 'Ana', 1));
  expect(lib.borrow('ana', 'b1', 0)).not.toBeNull();
  expect(lib.borrow('ana', 'b1', 0)).toBeNull(); // limit of 1
  lib.join(new Member('bo', 'Bo'));
  expect(lib.borrow('bo', 'b1', 0)).not.toBeNull();
  lib.join(new Member('cy', 'Cy'));
  expect(lib.borrow('cy', 'b1', 0)).toBeNull(); // both copies are out
});

test('charges 0.5 a day after the due day, and a student rule needs no edit', () => {
  const lib = setup();
  lib.join(new Member('sam', 'Sam', 3, 7)); // students: 7 days
  lib.borrow('ana', 'b1', 0);
  lib.borrow('sam', 'b1', 0);
  expect(lib.giveBack('ana', 'b1', 20)).toBe(3);
  expect(lib.giveBack('sam', 'b1', 10)).toBe(1.5);
  expect(lib.books.get('b1').copies).toBe(2);
});

test('returns -1 for a book the member does not hold', () => {
  const lib = setup();
  expect(lib.giveBack('ana', 'b1', 5)).toBe(-1);
  expect(lib.giveBack('nobody', 'b1', 5)).toBe(-1);
});

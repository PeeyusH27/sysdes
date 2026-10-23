import { expect, test } from 'vitest';
import { Library } from './god-library-before.js';

function setup() {
  const lib = new Library();
  lib.addBook('b1', 'Dune', 5);
  lib.join('ana', 'Ana');
  return lib;
}

test('lends three books and refuses the fourth', () => {
  const lib = setup();
  expect([1, 2, 3, 4].map(() => lib.borrow('ana', 'b1', 0))).toEqual([true, true, true, false]);
});

test('the 14-day rule is baked into both the email and the fee', () => {
  const lib = setup();
  lib.borrow('ana', 'b1', 0);
  expect(lib.outbox).toEqual(['Ana: Dune is due on day 14']);
  expect(lib.giveBack('ana', 'b1', 14)).toBe(0);

  lib.borrow('ana', 'b1', 0);
  expect(lib.giveBack('ana', 'b1', 20)).toBe(3);
});

import { expect, test } from 'vitest';
import { Book, Library, Member } from './relationships.js';

test('composition: the library creates and holds its own books', () => {
  const lib = new Library();
  const book = lib.addBook('b1', 'Dune');
  expect(book).toBeInstanceOf(Book);
  expect(lib.books).toEqual([book]);
});

test('aggregation: a member can belong to two libraries and is not copied', () => {
  const ana = new Member('ana', 'Ana');
  const north = new Library();
  const south = new Library();
  north.join(ana);
  south.join(ana);
  expect(north.members[0]).toBe(south.members[0]);
});

test('dependency: the notifier is passed in, so a fake can stand in for it', () => {
  const sent = [];
  const fake = { send: (to, text) => { sent.push([to, text]); return 'ok'; } };
  const lib = new Library();
  const ana = new Member('ana', 'Ana');
  const book = lib.addBook('b1', 'Dune');
  expect(lib.lend(ana, book, 0, fake)).toBe('ok');
  expect(sent).toEqual([['Ana', 'borrowed Dune']]);
  expect(lib.loans).toHaveLength(1);
});

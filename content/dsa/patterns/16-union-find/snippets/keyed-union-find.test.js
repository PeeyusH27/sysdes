import { expect, test } from 'vitest';
import { KeyedUnionFind } from './keyed-union-find.js';

test('groups string keys and tracks group sizes', () => {
  const uf = new KeyedUnionFind();
  uf.union('ana@x.com', 'ana@work.com');
  uf.union('ana@work.com', 'a.dev@z.com');
  uf.union('ben@y.com', 'ben@y.com');
  expect(uf.find('ana@x.com')).toBe(uf.find('a.dev@z.com'));
  expect(uf.sizeOf('ana@x.com')).toBe(3);
  expect(uf.sizeOf('ben@y.com')).toBe(1);
  expect(uf.union('a.dev@z.com', 'ana@x.com')).toBe(false);
  const groups = uf.groups().map((g) => g.sort()).sort((a, b) => b.length - a.length);
  expect(groups).toEqual([['a.dev@z.com', 'ana@work.com', 'ana@x.com'], ['ben@y.com']]);
});

test('the smaller group joins the larger one', () => {
  const uf = new KeyedUnionFind();
  uf.union('a', 'b');
  uf.union('a', 'c');            // group of 3 rooted at a
  uf.union('z', 'a');            // z (size 1) must go under a (size 3)
  expect(uf.find('z')).toBe('a');
  expect(uf.sizeOf('z')).toBe(4);
});

test('works with grid cells encoded as strings', () => {
  const uf = new KeyedUnionFind();
  uf.union('0,0', '0,1');
  uf.union('1,1', '0,1');
  expect(uf.sizeOf('1,1')).toBe(3);
  expect(uf.find('2,2')).toBe('2,2'); // unseen keys become their own group
});

import { expect, test } from 'vitest';
import { pick, servers } from './round-robin.js';

test('rotates through healthy servers and skips the one that is down', () => {
  expect([pick(), pick(), pick(), pick()]).toEqual(['a:3000', 'b:3000', 'a:3000', 'b:3000']);
});

test('includes a server again once it is back up', () => {
  servers[2].up = true;
  const seen = new Set(Array.from({ length: 3 }, () => pick()));
  expect(seen).toEqual(new Set(['a:3000', 'b:3000', 'c:3000']));
});

test('throws when every server is down', () => {
  for (const s of servers) s.up = false;
  expect(() => pick()).toThrow('no healthy servers');
});

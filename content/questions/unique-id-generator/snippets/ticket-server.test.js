import { test, expect } from 'vitest';
import { BlockAllocator, TicketServer } from './ticket-server.js';

test('block allocation: 1 million ids cost 1,000 database round trips, not a million', () => {
  const db = new TicketServer();
  const app = new BlockAllocator([db], 1000);
  for (let i = 0; i < 1_000_000; i++) app.nextId();
  expect(db.roundTrips).toBe(1000);
});

test('two apps sharing one server never get the same id', () => {
  const db = new TicketServer();
  const a = new BlockAllocator([db], 100);
  const b = new BlockAllocator([db], 100);
  const seen = new Set();
  for (let i = 0; i < 1000; i++) { seen.add(a.nextId()); seen.add(b.nextId()); }
  expect(seen.size).toBe(2000);
});

test('odd and even servers: two machines, disjoint ids', () => {
  const odd = new TicketServer(1, 2);
  const even = new TicketServer(2, 2);
  const ids = [odd.allocate(3), even.allocate(3)].flatMap((b) => [0, 1, 2].map((i) => b.first + i * b.step));
  expect(ids).toEqual([1, 3, 5, 2, 4, 6]);
  expect(ids.filter((n) => n % 2 === 1)).toEqual([1, 3, 5]);
});

test('a crashed app leaves a gap, never a duplicate', () => {
  const db = new TicketServer();
  const a = new BlockAllocator([db], 1000);
  expect(a.nextId()).toBe(1);                       // block 1..1000 reserved, only 1 used
  const restarted = new BlockAllocator([db], 1000); // the app crashed and came back
  expect(restarted.nextId()).toBe(1001);            // ids 2..1000 are lost, which is fine
});

test('ids from alternating servers still never collide', () => {
  const odd = new TicketServer(1, 2);
  const even = new TicketServer(2, 2);
  const a = new BlockAllocator([odd, even], 10);
  const ids = Array.from({ length: 100 }, () => a.nextId());
  expect(new Set(ids).size).toBe(100);
});

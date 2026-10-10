import { expect, test } from 'vitest';
import { activeConnectionTarget, busyConnections, poolMaxPerInstance } from './pool-size.js';

test('max_connections 200, 20 reserved, 12 instances → 15 per instance', () => {
  expect(poolMaxPerInstance({ maxConnections: 200, reserved: 20, instances: 12 })).toBe(15);
  expect(15 * 12).toBeLessThanOrEqual(200 - 20);
});

test('more instances means smaller pools, and the total always fits', () => {
  for (const instances of [1, 7, 12, 30, 90]) {
    const per = poolMaxPerInstance({ maxConnections: 200, reserved: 20, instances });
    expect(per * instances).toBeLessThanOrEqual(180);
  }
  expect(poolMaxPerInstance({ maxConnections: 200, reserved: 20, instances: 30 })).toBe(6);
});

test('the numbers quoted on the page', () => {
  expect(12 * 20).toBeGreaterThan(200);           // quiz: 12 × 20 = 240 connections, over the limit
  expect(30 * 20).toBe(600);                      // 10 → 30 instances with pools of 20
  expect(24 * 10).toBe(240);                      // PgBouncer scenario: 240 client connections → 40 server ones
  expect(activeConnectionTarget({ cores: 8, spindles: 1 })).toBe(17);
  expect(busyConnections({ qps: 1_000, holdMs: 5 })).toBe(5);
  expect(busyConnections({ qps: 2_000, holdMs: 5 })).toBe(10);   // 10 connections at 5 ms → up to 2,000 queries/s
});

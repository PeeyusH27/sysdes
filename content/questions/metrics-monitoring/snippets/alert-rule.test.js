import { test, expect } from 'vitest';
import { AlertRule, Notifier } from './alert-rule.js';

const MIN = 60_000;
const rule = () => new AlertRule({ name: 'cpu-high', threshold: 90, forMs: 5 * MIN });

test('a blip shorter than the for-duration never fires', () => {
  const r = rule();
  expect(r.evaluate(95, 0)).toBeNull();
  expect(r.state).toBe('pending');
  expect(r.evaluate(95, 2 * MIN)).toBeNull();
  expect(r.evaluate(40, 3 * MIN)).toBeNull();            // recovered before 5 minutes
  expect(r.state).toBe('inactive');
});

test('a sustained breach fires once after 5 minutes, then resolves when it clears', () => {
  const r = rule();
  const events = [];
  for (let t = 0; t <= 8 * MIN; t += 30_000) events.push(r.evaluate(95, t));
  expect(events.filter(Boolean)).toEqual([{ type: 'fire', name: 'cpu-high', since: 0 }]);   // one fire, not one per evaluation
  expect(r.state).toBe('firing');
  expect(r.evaluate(50, 9 * MIN)).toEqual({ type: 'resolve', name: 'cpu-high' });
  expect(r.state).toBe('resolved');
});

test('a breach that returns after resolving starts a fresh pending period', () => {
  const r = rule();
  for (let t = 0; t <= 6 * MIN; t += MIN) r.evaluate(95, t);
  r.evaluate(10, 7 * MIN);
  expect(r.evaluate(95, 8 * MIN)).toBeNull();
  expect(r.state).toBe('pending');
});

test('missing data counts as bad by default, so a dead host cannot look healthy', () => {
  const r = rule();
  r.evaluate(null, 0);
  expect(r.state).toBe('pending');
  expect(r.evaluate(undefined, 5 * MIN)).toMatchObject({ type: 'fire' });
  const lenient = new AlertRule({ name: 'x', threshold: 1, forMs: MIN, missing: 'ok' });
  lenient.evaluate(null, 0);
  expect(lenient.state).toBe('inactive');
});

test('30 alerts in one cluster become one page, and are not repeated within 4 hours', () => {
  const n = new Notifier();
  const fire = (i, cluster) => ({ type: 'fire', name: `host-${i}-down`, labels: { cluster } });
  const events = [...Array.from({ length: 30 }, (_, i) => fire(i, 'eu-1')), fire(99, 'us-2')];
  const pages = n.page(events, 'cluster', 0);
  expect(pages).toHaveLength(2);
  expect(pages.find((p) => p.group === 'eu-1').alerts).toHaveLength(30);
  expect(n.page(events, 'cluster', 60 * MIN)).toEqual([]);                  // still firing, already paged
  expect(n.page(events, 'cluster', 4 * 60 * MIN)).toHaveLength(2);          // reminder after 4 hours
});

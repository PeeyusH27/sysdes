import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

const failing = () => vi.fn(async () => { throw new Error('timeout'); });

async function trip(breaker, n = 5) {
  for (let i = 0; i < n; i++) await breaker.call().catch(() => {});
}

test('opens after 5 consecutive failures, then fails fast without calling the dependency', async () => {
  const dep = failing();
  const breaker = new CircuitBreaker(dep);
  await trip(breaker, 4);
  expect(breaker.state).toBe('closed');
  await trip(breaker, 1);
  expect(breaker.state).toBe('open');
  await expect(breaker.call()).rejects.toBeInstanceOf(CircuitOpenError);
  expect(dep).toHaveBeenCalledTimes(5);                   // the 6th call never reached it
});

test('a success resets the failure count', async () => {
  let fail = true;
  const breaker = new CircuitBreaker(async () => { if (fail) throw new Error('x'); return 'ok'; });
  await trip(breaker, 4);
  fail = false;
  await breaker.call();
  fail = true;
  await trip(breaker, 4);
  expect(breaker.state).toBe('closed');                   // 4 + 4 failures, but never 5 in a row
});

test('after the cooldown, exactly one probe goes through; success closes the breaker', async () => {
  let healthy = false;
  let release;
  const dep = vi.fn(() => (healthy ? new Promise((r) => { release = r; }) : Promise.reject(new Error('down'))));
  const breaker = new CircuitBreaker(dep);
  await trip(breaker);
  expect(breaker.state).toBe('open');

  vi.setSystemTime(9_999);
  await expect(breaker.call()).rejects.toThrow('circuit open');

  vi.setSystemTime(10_000);                               // cooldown elapsed
  healthy = true;
  const probe = breaker.call();                           // the probe is in flight…
  expect(breaker.state).toBe('half-open');
  await expect(breaker.call()).rejects.toThrow('probe in flight');   // …so others still fail fast
  release('ok');
  expect(await probe).toBe('ok');
  expect(breaker.state).toBe('closed');
  expect(dep).toHaveBeenCalledTimes(6);                   // 5 failures + 1 probe
});

test('a failed probe reopens the breaker for another full cooldown', async () => {
  const breaker = new CircuitBreaker(failing());
  await trip(breaker);
  vi.setSystemTime(10_000);
  await expect(breaker.call()).rejects.toThrow('timeout');   // the probe fails
  expect(breaker.state).toBe('open');
  vi.setSystemTime(19_999);
  await expect(breaker.call()).rejects.toThrow('circuit open');
});

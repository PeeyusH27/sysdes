import { expect, test, vi } from 'vitest';
import { load } from './single-flight.js';

test('concurrent callers share one rebuild', async () => {
  const fn = vi.fn(async () => 'value');
  const results = await Promise.all([load('k', fn), load('k', fn), load('k', fn)]);
  expect(results).toEqual(['value', 'value', 'value']);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('the entry is forgotten once settled, so a later call loads again', async () => {
  const fn = vi.fn(async () => 'value');
  await load('k2', fn);
  await load('k2', fn);
  expect(fn).toHaveBeenCalledTimes(2);
});

test('a failure is shared by the waiters and not cached', async () => {
  const failing = vi.fn(async () => { throw new Error('db down'); });
  const a = load('k3', failing);
  const b = load('k3', failing);
  await expect(a).rejects.toThrow('db down');
  await expect(b).rejects.toThrow('db down');
  expect(failing).toHaveBeenCalledTimes(1);
  expect(await load('k3', async () => 'recovered')).toBe('recovered');
});

test('different keys load independently', async () => {
  const fn = vi.fn(async (k) => k);
  const [x, y] = await Promise.all([load('x', () => fn('x')), load('y', () => fn('y'))]);
  expect([x, y]).toEqual(['x', 'y']);
  expect(fn).toHaveBeenCalledTimes(2);
});

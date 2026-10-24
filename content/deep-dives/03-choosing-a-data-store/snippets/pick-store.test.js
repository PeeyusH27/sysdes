import { expect, test } from 'vitest';
import { LIMITS, pickStore } from './pick-store.js';

const base = { transactions: false, textSearch: false, writesPerSec: 100, scanRows: 0, fileBytes: 0, timeOrdered: false };

test('a file goes to object storage even if everything else says postgres', () => {
  expect(pickStore({ ...base, transactions: true, fileBytes: 3_000_000 }).store).toBe('object storage');
});

test('transactions stay in postgres until one primary is too small', () => {
  expect(pickStore({ ...base, transactions: true, writesPerSec: 20 }).store).toBe('postgres');
  expect(pickStore({ ...base, transactions: true, writesPerSec: LIMITS.writesPerSec }).store).toBe('postgres');
  expect(pickStore({ ...base, transactions: true, writesPerSec: LIMITS.writesPerSec + 1 }).store).toBe('sharded postgres');
});

test('search: small and plain stays in postgres, big or typo-tolerant gets an engine', () => {
  expect(pickStore({ ...base, textSearch: true, docs: 100_000, typos: false }).store).toBe('postgres');
  expect(pickStore({ ...base, textSearch: true, docs: 100_000, typos: true }).store).toBe('search engine');
  expect(pickStore({ ...base, textSearch: true, docs: 5_000_000, typos: false }).store).toBe('search engine');
});

test('100M-row scans go columnar', () => {
  expect(pickStore({ ...base, scanRows: 200_000_000 }).store).toBe('columnar');
});

test('a huge write rate picks by read shape', () => {
  expect(pickStore({ ...base, writesPerSec: 58_000, timeOrdered: true }).store).toBe('wide-column');
  expect(pickStore({ ...base, writesPerSec: 58_000 }).store).toBe('key-value');
});

test('the boring default', () => {
  expect(pickStore(base).store).toBe('postgres');
});

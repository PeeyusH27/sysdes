import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { cdcChunks } from './cdc.js';

function bytes(n, seed = 1) {
  const a = new Uint8Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; a[i] = s >>> 24; }
  return a;
}
const hashes = (data, cuts) => cuts.map((c) => createHash('sha256').update(data.subarray(c.start, c.end)).digest('hex'));
const fixed = (n, size) => Array.from({ length: Math.ceil(n / size) }, (_, i) => ({ start: i * size, end: Math.min((i + 1) * size, n) }));

test('chunks tile the file exactly and respect the size limits', () => {
  const data = bytes(1_000_000);
  const cuts = cdcChunks(data);
  expect(cuts[0].start).toBe(0);
  expect(cuts.at(-1).end).toBe(data.length);
  cuts.forEach((c, i) => {
    if (i > 0) expect(c.start).toBe(cuts[i - 1].end);
    expect(c.end - c.start).toBeLessThanOrEqual(65536);
    if (i < cuts.length - 1) expect(c.end - c.start).toBeGreaterThanOrEqual(2048);
  });
});

test('the average chunk is near minSize plus 2^maskBits (about 10 KiB here)', () => {
  const data = bytes(2_000_000);
  const avg = data.length / cdcChunks(data).length;
  expect(avg).toBeGreaterThan(6_000);
  expect(avg).toBeLessThan(16_000);
});

test('insert 100 bytes near the front: content-defined chunking keeps almost every chunk, fixed chunking keeps almost none', () => {
  const a = bytes(1_000_000, 3);
  const b = new Uint8Array(a.length + 100);
  b.set(a.subarray(0, 1000), 0);
  b.set(bytes(100, 99), 1000);                             // the inserted bytes
  b.set(a.subarray(1000), 1100);

  const kept = (cutsA, cutsB) => {
    const setA = new Set(hashes(a, cutsA));
    return hashes(b, cutsB).filter((h) => setA.has(h)).length / cutsB.length;
  };
  const cdcKept = kept(cdcChunks(a), cdcChunks(b));
  const fixedKept = kept(fixed(a.length, 8192), fixed(b.length, 8192));
  expect(cdcKept).toBeGreaterThan(0.95);
  expect(fixedKept).toBeLessThan(0.05);
});

test('the same bytes always cut the same way', () => {
  const data = bytes(300_000, 5);
  expect(cdcChunks(data)).toEqual(cdcChunks(data.slice()));
});

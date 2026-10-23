import { test, expect } from 'vitest';
import { fixedChunks, missing, sha256Hex, CHUNK } from './chunker.js';

// Deterministic pseudo-random bytes, so the test never flakes.
function bytes(n, seed = 1) {
  const a = new Uint8Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; a[i] = s >>> 24; }
  return a;
}

test('SHA-256 of "abc" is the standard test vector', async () => {
  expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('10 MiB is three chunks: 4 + 4 + 2 MiB. A 1 GiB file is 256 chunks', async () => {
  const chunks = await fixedChunks(bytes(10 * 1024 * 1024));
  expect(chunks.map((c) => c.length)).toEqual([CHUNK, CHUNK, 2 * 1024 * 1024]);
  expect((1024 * 1024 * 1024) / CHUNK).toBe(256);
});

test('changing one byte changes one chunk, so a sync uploads 4 MiB instead of the whole file', async () => {
  const a = bytes(20 * 1024 * 1024);                       // 5 chunks
  const b = a.slice();
  b[9 * 1024 * 1024] ^= 0xff;                              // inside chunk 2
  const [ca, cb] = [await fixedChunks(a), await fixedChunks(b)];
  const need = missing(cb, new Set(ca.map((c) => c.hash)));
  expect(need).toHaveLength(1);
  expect(need[0].start).toBe(2 * CHUNK);
});

test('identical files from two users share every chunk: nothing to upload', async () => {
  const a = await fixedChunks(bytes(8 * 1024 * 1024, 7));
  const b = await fixedChunks(bytes(8 * 1024 * 1024, 7));
  expect(missing(b, new Set(a.map((c) => c.hash)))).toHaveLength(0);
});

test('with fixed chunks, inserting one byte at the front changes every chunk (the case for content-defined chunking)', async () => {
  const a = bytes(12 * 1024 * 1024);
  const b = new Uint8Array(a.length + 1);
  b[0] = 42;
  b.set(a, 1);
  const [ca, cb] = [await fixedChunks(a), await fixedChunks(b)];
  expect(missing(cb, new Set(ca.map((c) => c.hash)))).toHaveLength(cb.length);
});

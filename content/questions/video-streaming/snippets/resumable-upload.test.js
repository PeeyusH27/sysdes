import { test, expect } from 'vitest';
import { CHUNK, chunkPlan, upload } from './resumable-upload.js';

const MB = 1024 * 1024;

test('a 500 MB file is 63 chunks of 8 MiB, the last one smaller', () => {
  const size = 500 * MB;
  const parts = chunkPlan(size);
  expect(parts).toHaveLength(63);
  expect(parts[0]).toEqual({ start: 0, end: CHUNK });
  expect(parts.at(-1).end).toBe(size);
  expect(parts.at(-1).end - parts.at(-1).start).toBe(500 * MB - 62 * CHUNK);   // 4 MiB
});

// A fake server that keeps bytes in order and can drop the connection once.
function fakeServer(size, failAtChunk = -1) {
  let have = 0;
  let calls = 0;
  let failed = false;
  return {
    offset: async () => have,
    put: async (start, end) => {
      if (start !== have) throw new Error('out of order');       // the server only accepts the next byte
      if (calls++ === failAtChunk && !failed) { failed = true; throw new Error('connection reset'); }
      have = end;
    },
    get have() { return have; },
    get calls() { return calls; },
  };
}

test('a dropped connection resumes from the server offset, not from zero', async () => {
  const size = 40 * MB;                                           // 5 chunks
  const s = fakeServer(size, 3);                                  // the 4th chunk call fails once
  const r = await upload(size, s, { sleep: async () => {} });
  expect(s.have).toBe(size);
  expect(r.sent).toBe(size);                                      // every byte was sent exactly once
  expect(s.calls).toBe(6);                                        // 5 chunks plus one failed attempt
});

test('gives up after maxRetries consecutive failures', async () => {
  const bad = { offset: async () => 0, put: async () => { throw new Error('down'); } };
  await expect(upload(10 * MB, bad, { maxRetries: 2, sleep: async () => {} })).rejects.toThrow('down');
});

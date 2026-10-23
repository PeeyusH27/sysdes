import { test, expect } from 'vitest';
import { Namespace, conflictedCopyName } from './metadata.js';

const store = (ns, hashes) => hashes.forEach((h) => ns.chunkStored(h));

test('a new file commits at revision 1 once its chunks are stored', () => {
  const ns = new Namespace();
  expect(ns.unknownChunks(['a', 'b'])).toEqual(['a', 'b']);
  expect(ns.commit({ path: '/r.doc', baseRev: 0, chunks: ['a', 'b'] })).toMatchObject({ ok: false, missing: ['a', 'b'] });
  store(ns, ['a', 'b']);
  expect(ns.commit({ path: '/r.doc', baseRev: 0, chunks: ['a', 'b'] })).toEqual({ ok: true, rev: 1, cursor: 1 });
});

test('editing one chunk: only the new hash is unknown, so only that chunk is uploaded', () => {
  const ns = new Namespace();
  store(ns, ['a', 'b', 'c']);
  ns.commit({ path: '/r.doc', baseRev: 0, chunks: ['a', 'b', 'c'] });
  expect(ns.unknownChunks(['a', 'b2', 'c'])).toEqual(['b2']);
});

test('dedupe: another file with the same chunks needs no upload at all', () => {
  const ns = new Namespace();
  store(ns, ['a', 'b']);
  ns.commit({ path: '/one.bin', baseRev: 0, chunks: ['a', 'b'] });
  expect(ns.unknownChunks(['a', 'b'])).toEqual([]);
  expect(ns.commit({ path: '/copy.bin', baseRev: 0, chunks: ['a', 'b'] }).ok).toBe(true);
  expect(ns.chunkRefs.get('a')).toBe(2);
});

test('two devices edit revision 1: the first commit wins, the second is a conflict', () => {
  const ns = new Namespace();
  store(ns, ['a', 'x', 'y']);
  ns.commit({ path: '/r.doc', baseRev: 0, chunks: ['a'] });
  expect(ns.commit({ path: '/r.doc', baseRev: 1, chunks: ['x'] })).toMatchObject({ ok: true, rev: 2 });
  expect(ns.commit({ path: '/r.doc', baseRev: 1, chunks: ['y'] })).toEqual({ ok: false, conflict: true, currentRev: 2 });
  // The loser saves its work under a new name instead.
  const copy = conflictedCopyName('/r.doc', 'Maya', '2026-10-23');
  expect(copy).toBe("/r (Maya's conflicted copy 2026-10-23).doc");
  expect(ns.commit({ path: copy, baseRev: 0, chunks: ['y'] }).ok).toBe(true);
});

test('a device catches up with a cursor, and asking twice is harmless', () => {
  const ns = new Namespace();
  store(ns, ['a', 'b']);
  ns.commit({ path: '/1', baseRev: 0, chunks: ['a'] });
  ns.commit({ path: '/2', baseRev: 0, chunks: ['b'] });
  const first = ns.changesSince(0);
  expect(first.changes.map((c) => c.path)).toEqual(['/1', '/2']);
  expect(ns.changesSince(first.cursor).changes).toEqual([]);
  ns.commit({ path: '/1', baseRev: 1, chunks: ['b'] });
  expect(ns.changesSince(first.cursor).changes.map((c) => [c.path, c.rev])).toEqual([['/1', 2]]);
});

test('conflicted copy names keep the extension and handle files without one', () => {
  expect(conflictedCopyName('/a/b/notes', 'Lee', '2026-01-01')).toBe("/a/b/notes (Lee's conflicted copy 2026-01-01)");
  expect(conflictedCopyName('/a.b/notes', 'Lee', '2026-01-01')).toBe("/a.b/notes (Lee's conflicted copy 2026-01-01)");
});

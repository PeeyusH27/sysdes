import { test, expect } from 'vitest';
import { planJob, coresNeeded } from './transcode-plan.js';

test('a 10 minute video: 150 four-second segments x 5 renditions = 750 encode tasks, then one package task', () => {
  const tasks = planJob('v1', 600);
  expect(tasks.filter((t) => t.kind === 'encode')).toHaveLength(750);
  const pkg = tasks.at(-1);
  expect(pkg.kind).toBe('package');
  expect(pkg.after).toHaveLength(750);
});

test('task ids and output paths are deterministic and unique, so a retry overwrites itself', () => {
  const a = planJob('v1', 600);
  const b = planJob('v1', 600);
  expect(a.map((t) => t.out)).toEqual(b.map((t) => t.out));
  expect(new Set(a.map((t) => t.id)).size).toBe(a.length);
  expect(a[0].out).toBe('v/v1/240p/seg_00000.m4s');
});

test('the last segment is shorter when the duration is not a multiple of 4 s', () => {
  const enc = planJob('v2', 10).filter((t) => t.id.includes('/1080p/'));
  expect(enc.map((t) => [t.from, t.to])).toEqual([[0, 4], [4, 8], [8, 10]]);
});

test('500,000 uploads a day of 10 minutes, 5 renditions, 2x realtime per core = about 8,681 cores', () => {
  expect(Math.round(coresNeeded(500_000, 600, 5, 2))).toBe(8681);
});

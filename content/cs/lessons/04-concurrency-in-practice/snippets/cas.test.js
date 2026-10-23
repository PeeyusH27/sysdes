import { test, expect } from 'vitest';
import { Worker } from 'node:worker_threads';
import { update } from './cas.js';

const cells = () => new Int32Array(new SharedArrayBuffer(4));

test('with no competition the first compare-and-swap succeeds', () => {
  const c = cells();
  expect(update(c, 0, (x) => x + 5)).toBe(5);
});

test('when another thread writes between our read and our swap, the swap fails and we retry on the new value', () => {
  const c = cells();
  let calls = 0;
  const result = update(c, 0, (x) => {
    calls += 1;
    if (calls === 1) Atomics.add(c, 0, 100); // the "other thread" sneaks in
    return x + 1;
  });
  expect(calls).toBe(2);
  expect(result).toBe(101);
  expect(Atomics.load(c, 0)).toBe(101);
});

test('4 real threads doing 5,000 increments each end at exactly 20,000', async () => {
  const sab = new SharedArrayBuffer(4);
  const url = new URL('./cas.js', import.meta.url).href;
  const code = `
    const { workerData } = require('node:worker_threads');
    import(workerData.url).then(({ update }) => {
      const cells = new Int32Array(workerData.sab);
      for (let k = 0; k < workerData.n; k++) update(cells, 0, (x) => x + 1);
    });`;
  await Promise.all(
    Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
      const w = new Worker(code, { eval: true, workerData: { sab, url, n: 5000 }, execArgv: ['--no-warnings'] });
      w.on('error', reject);
      w.on('exit', resolve);
    })),
  );
  expect(Atomics.load(new Int32Array(sab), 0)).toBe(20000);
}, 20000);

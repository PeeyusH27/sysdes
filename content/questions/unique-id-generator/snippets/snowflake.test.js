import { test, expect } from 'vitest';
import { EPOCH, Snowflake, decode, limits } from './snowflake.js';

// A fake clock that returns a fixed millisecond until told to move on.
function clock(startMs) {
  let t = BigInt(startMs);
  const fn = () => t;
  fn.set = (v) => { t = BigInt(v); };
  fn.advance = (d) => { t += BigInt(d); };
  return fn;
}
const T0 = EPOCH + 10_000n;

test('the layout: 41 bits is 69.7 years, 12 bits is 4,096 ids per ms, 10 bits is 1,024 workers', () => {
  expect(limits.yearsOfTime).toBeCloseTo(69.68, 2);
  expect(limits.idsPerMsPerWorker).toBe(4096);
  expect(limits.workers).toBe(1024);
  expect(limits.idsPerMsPerWorker * 1000).toBe(4_096_000);                // per second, per worker
  expect(limits.idsPerMsPerWorker * limits.workers * 1000).toBe(4_194_304_000);   // 4.19 billion per second, whole fleet
});

test('an id decodes back to its time, worker and sequence', () => {
  const c = clock(T0);
  const g = new Snowflake(37, { now: c });
  const a = decode(g.nextId());
  const b = decode(g.nextId());
  expect(a).toEqual({ timeMs: Number(T0), worker: 37, seq: 0 });
  expect(b).toEqual({ timeMs: Number(T0), worker: 37, seq: 1 });
});

test('ids fit in a signed 64-bit integer and grow with time', () => {
  const c = clock(T0);
  const g = new Snowflake(1023, { now: c });
  const first = g.nextId();
  c.advance(1);
  const second = g.nextId();
  expect(second).toBeGreaterThan(first);
  expect(second).toBeLessThan(2n ** 63n);
});

test('two workers in the same millisecond never collide', () => {
  const c = clock(T0);
  const a = new Snowflake(1, { now: c });
  const b = new Snowflake(2, { now: c });
  const ids = new Set();
  for (let i = 0; i < 1000; i++) { ids.add(a.nextId()); ids.add(b.nextId()); }
  expect(ids.size).toBe(2000);
});

test('the 4,097th id in one millisecond waits for the next millisecond', () => {
  const c = clock(T0);
  let calls = 0;
  const ticking = () => { if (++calls > 5000 && calls % 3 === 0) c.advance(1); return c(); };   // time moves only while we spin
  const g = new Snowflake(5, { now: ticking });
  const ids = [];
  for (let i = 0; i < 4097; i++) ids.push(g.nextId());
  expect(new Set(ids).size).toBe(4097);
  expect(decode(ids[4095]).seq).toBe(4095);
  expect(decode(ids[4096]).seq).toBe(0);
  expect(decode(ids[4096]).timeMs).toBe(decode(ids[4095]).timeMs + 1);
  expect(ids.every((id, i) => i === 0 || id > ids[i - 1])).toBe(true);
});

test('a clock that steps back a little is waited out; ids stay increasing', () => {
  const c = clock(T0);
  const g = new Snowflake(9, { now: c, maxBackwardMs: 5n });
  const first = g.nextId();
  c.set(T0 - 3n);                                                          // NTP steps the clock back 3 ms
  let polls = 0;
  g.now = () => { if (++polls > 3) c.advance(1); return c(); };            // real time keeps moving, so the wait ends
  const second = g.nextId();
  expect(second).toBeGreaterThan(first);
  expect(polls).toBeGreaterThan(1);                                         // it did have to wait
});

test('a big step back is refused instead of risking duplicate ids', () => {
  const c = clock(T0);
  const g = new Snowflake(9, { now: c, maxBackwardMs: 5n });
  g.nextId();
  c.set(T0 - 60n);                                                          // 60 ms back
  expect(() => g.nextId()).toThrow(/clock moved back 60 ms/);
});

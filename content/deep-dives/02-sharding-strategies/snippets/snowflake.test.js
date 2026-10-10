import { afterEach, expect, test, vi } from 'vitest';
import { snowflake } from './snowflake.js';

afterEach(() => vi.restoreAllMocks());

const EPOCH = 1_704_067_200_000n;
const decode = (id) => ({ ms: (id >> 22n) + EPOCH, worker: Number((id >> 12n) & 1023n), seq: Number(id & 4095n) });

test('ids are unique and strictly increasing', () => {
  const next = snowflake(7);
  const ids = Array.from({ length: 50_000 }, () => next());
  expect(new Set(ids).size).toBe(ids.length);
  for (let i = 1; i < ids.length; i++) expect(ids[i] > ids[i - 1]).toBe(true);
});

test('the id encodes the time, the worker and the sequence', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_760_000_000_000);
  const next = snowflake(42);
  const a = decode(next());
  const b = decode(next());
  expect(a).toEqual({ ms: 1_760_000_000_000n, worker: 42, seq: 0 });
  expect(b).toEqual({ ms: 1_760_000_000_000n, worker: 42, seq: 1 });
});

test('two workers in the same millisecond never collide', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_760_000_000_000);
  const w1 = snowflake(1), w2 = snowflake(2);
  const ids = new Set(Array.from({ length: 1000 }, () => [w1(), w2()]).flat());
  expect(ids.size).toBe(2000);
});

test('after 4,096 ids in one millisecond it waits for the next one', () => {
  let calls = 0;
  const T = 1_760_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (calls++ < 4097 ? T : T + 1));
  const next = snowflake(3);
  const ids = Array.from({ length: 4097 }, () => next());
  expect(decode(ids[4095])).toEqual({ ms: BigInt(T), worker: 3, seq: 4095 });
  expect(decode(ids[4096])).toEqual({ ms: BigInt(T + 1), worker: 3, seq: 0 });
  expect(ids[4096] > ids[4095]).toBe(true);
});

test('refuses to run when the clock goes backwards', () => {
  let t = 1_760_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => t);
  const next = snowflake(1);
  next();
  t -= 5;
  expect(() => next()).toThrow('clock moved backwards');
});

test('rejects worker ids that do not fit in 10 bits', () => {
  expect(() => snowflake(1024)).toThrow(RangeError);
  expect(() => snowflake(-1)).toThrow(RangeError);
});

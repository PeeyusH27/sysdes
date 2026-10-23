import { expect, test } from 'vitest';
import { TimeMap, lastAtOrBefore } from './time-map.js';

test('finds the newest write at or before the time', () => {
  const m = new TimeMap();
  m.set('love', 'high', 10);
  m.set('love', 'low', 20);
  expect(m.get('love', 5)).toBe('');
  expect(m.get('love', 10)).toBe('high');
  expect(m.get('love', 15)).toBe('high');
  expect(m.get('love', 20)).toBe('low');
  expect(m.get('love', 99)).toBe('low');
});

test('keys have independent histories and unknown keys are empty', () => {
  const m = new TimeMap();
  m.set('a', 'p', 1);
  m.set('b', 'q', 2);
  m.set('a', 'r', 3);
  expect(m.get('a', 2)).toBe('p');
  expect(m.get('b', 2)).toBe('q');
  expect(m.get('zzz', 2)).toBe('');
});

test('lastAtOrBefore matches a linear scan', () => {
  const history = [[2, 'a'], [4, 'b'], [7, 'c'], [9, 'd']];
  for (let t = 0; t <= 11; t++) {
    let want = -1;
    history.forEach(([time], i) => { if (time <= t) want = i; });
    expect(lastAtOrBefore(history, t)).toBe(want);
  }
  expect(lastAtOrBefore([], 5)).toBe(-1);
});

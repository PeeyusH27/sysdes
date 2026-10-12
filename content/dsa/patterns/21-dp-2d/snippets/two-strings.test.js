import { expect, test } from 'vitest';
import { lcsString } from './two-strings.js';

const isSubsequence = (t, s) => {
  let k = 0;
  for (const ch of s) if (ch === t[k]) k++;
  return k === t.length;
};

test('rebuilds a longest common subsequence', () => {
  expect(lcsString('CLOUD', 'COLD')).toBe('CLD');
  expect(lcsString('abc', 'abc')).toBe('abc');
  const s = lcsString('bdcaba', 'abcbdab');
  expect(s).toHaveLength(4);
  expect(isSubsequence(s, 'bdcaba') && isSubsequence(s, 'abcbdab')).toBe(true);
});

test('returns the empty string when nothing is shared', () => {
  expect(lcsString('abc', 'xyz')).toBe('');
  expect(lcsString('', 'abc')).toBe('');
  expect(lcsString('', '')).toBe('');
});

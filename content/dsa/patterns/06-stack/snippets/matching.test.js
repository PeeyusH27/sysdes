import { expect, test } from 'vitest';
import { isBalanced, simplifyPath } from './matching.js';

test('accepts properly nested brackets', () => {
  expect(isBalanced('{[()()]}')).toBe(true);
  expect(isBalanced('()[]{}')).toBe(true);
  expect(isBalanced('')).toBe(true);
});

test('rejects crossed, unclosed and unopened brackets', () => {
  expect(isBalanced('([)]')).toBe(false);
  expect(isBalanced('(()')).toBe(false);
  expect(isBalanced('())')).toBe(false);
  expect(isBalanced(']')).toBe(false);
});

test('simplifies a path by undoing the latest directory on ..', () => {
  expect(simplifyPath('/home//user/./docs/../pics/')).toBe('/home/user/pics');
  expect(simplifyPath('/a/b/../../..')).toBe('/');
  expect(simplifyPath('/')).toBe('/');
});

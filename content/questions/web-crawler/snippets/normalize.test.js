import { test, expect } from 'vitest';
import { normalize, hostOf } from './normalize.js';

test('different spellings of one page collapse to one string', () => {
  const same = [
    'HTTP://Example.com:80/a/b/?utm_source=x&b=2&a=1#top',
    'http://example.com/a/b?a=1&b=2',
    'http://example.com/a/x/../b?b=2&a=1&fbclid=abc',
  ].map((u) => normalize(u));
  expect(new Set(same).size).toBe(1);
  expect(same[0]).toBe('http://example.com/a/b?a=1&b=2');
});

test('relative links resolve against the page they were found on', () => {
  expect(normalize('../c.html', 'https://example.com/a/b/page.html')).toBe('https://example.com/a/c.html');
  expect(normalize('//cdn.example.com/x', 'https://example.com/')).toBe('https://cdn.example.com/x');
});

test('non-web and malformed links are dropped', () => {
  expect(normalize('mailto:a@b.com')).toBeNull();
  expect(normalize('javascript:void(0)')).toBeNull();
  expect(normalize('http://')).toBeNull();
});

test('the root path keeps its slash; other paths lose a trailing one', () => {
  expect(normalize('https://example.com')).toBe('https://example.com/');
  expect(normalize('https://example.com/docs/')).toBe('https://example.com/docs');
});

test('the host keeps a non-default port, because it is a different server', () => {
  expect(hostOf(normalize('https://example.com:8443/x'))).toBe('example.com:8443');
  expect(hostOf(normalize('https://example.com:443/x'))).toBe('example.com');
});

import { test, expect } from 'vitest';
import { parseRobots } from './robots.js';

const TXT = `
# example
User-agent: *
Disallow: /private/
Allow: /private/press
Crawl-delay: 5

User-agent: mycrawler
Disallow: /search
`;

test('our own group wins over *', () => {
  const r = parseRobots(TXT, 'MyCrawler');
  expect(r.allowed('/search?q=x')).toBe(false);
  expect(r.allowed('/private/data')).toBe(true);          // the * group does not apply to us
  expect(r.crawlDelaySec).toBeNull();
});

test('falls back to *, and the longest matching rule decides', () => {
  const r = parseRobots(TXT, 'otherbot');
  expect(r.allowed('/private/data')).toBe(false);
  expect(r.allowed('/private/press/2024')).toBe(true);    // Allow is longer than Disallow
  expect(r.allowed('/about')).toBe(true);
  expect(r.crawlDelaySec).toBe(5);
});

test('an empty Disallow allows everything; a missing file allows everything', () => {
  expect(parseRobots('User-agent: *\nDisallow:\n').allowed('/anything')).toBe(true);
  expect(parseRobots('').allowed('/anything')).toBe(true);
});

test('consecutive User-agent lines share one group', () => {
  const r = parseRobots('User-agent: a\nUser-agent: b\nDisallow: /x\n', 'b');
  expect(r.allowed('/x')).toBe(false);
});
